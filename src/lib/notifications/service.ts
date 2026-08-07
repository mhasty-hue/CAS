import type {
  CommunicationEvent,
  EmailDeliveryRecord,
  NotificationEventKey,
  NotificationPreference,
  NotificationQueueChannel,
  NotificationQueueItem,
  NotificationTemplate,
  Order,
  Organization,
  OrganizationNotificationSettings,
  PortalUser
} from "@/types/domain";
import { getNotificationDefinition, notificationEventCatalog } from "./catalog";
import type { NotificationRecipient } from "./privacy";
import { renderRoleAwareNotification } from "./privacy";

export type EmailMessage = {
  organizationId: string;
  eventKey: NotificationEventKey | string;
  to: string;
  subject: string;
  html: string;
  text: string;
  actionUrl?: string;
  replyTo?: string;
  visibilityClassification?: string;
  templateVersion?: number;
};

export interface EmailProvider {
  id: EmailDeliveryRecord["provider"];
  send(message: EmailMessage): Promise<EmailDeliveryRecord>;
}

export type NotificationEventInput = {
  idPrefix?: string;
  eventKey: NotificationEventKey | string;
  organization: Organization;
  order?: Order;
  actor?: PortalUser;
  recipients: NotificationRecipient[];
  channels?: NotificationQueueChannel[];
  preferences?: NotificationPreference[];
  settings?: OrganizationNotificationSettings;
  actionUrl?: string;
  relatedTaskId?: string;
  relatedInvoiceId?: string;
  relatedVendorId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  digestGroup?: string;
  dedupeScope?: string;
  now?: Date;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type NotificationArtifacts = {
  queueItems: NotificationQueueItem[];
  communicationEvents: CommunicationEvent[];
  emailMessages: EmailMessage[];
};

export type ResolveOrderRecipientsInput = {
  eventKey: NotificationEventKey | string;
  order: Order;
  organization: Organization;
  users: PortalUser[];
  includeClientRecipients?: boolean;
};

export const notificationEventLabels = Object.fromEntries(
  Object.values(notificationEventCatalog).map((definition) => [definition.eventKey, definition.label])
) as Record<string, string>;

function isoNow(now = new Date()) {
  return now.toISOString();
}

function safeIdPart(value: string | undefined) {
  return (value ?? "workflow").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function recipientMatchesPreference(preference: NotificationPreference, recipient: NotificationRecipient) {
  return !preference.userId || preference.userId === recipient.id;
}

function portalUserToRecipient(user: PortalUser, relationship: NotificationRecipient["relationship"]): NotificationRecipient {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    relationship
  };
}

export function resolveOrderNotificationRecipients({
  eventKey,
  order,
  organization,
  users,
  includeClientRecipients = true
}: ResolveOrderRecipientsInput): NotificationRecipient[] {
  const orgUsers = users.filter((user) => user.organizationId === organization.id);
  const staff = orgUsers
    .filter((user) => ["company_admin", "office_staff", "amc_admin", "amc_staff", "appraiser_manager"].includes(user.role))
    .map((user) => portalUserToRecipient(user, "requesting_org_internal"));
  const reviewers = orgUsers
    .filter((user) => user.role === "reviewer")
    .map((user) => portalUserToRecipient(user, "reviewer"));
  const appraisers = orgUsers
    .filter((user) => user.role === "appraiser" || user.role === "solo_appraiser")
    .filter((user) => user.name === order.appraiser || user.appraiserName === order.appraiser)
    .map((user) => portalUserToRecipient(user, "assigned_appraiser"));
  const clients = includeClientRecipients
    ? users
        .filter((user) => user.role === "client_user")
        .map((user) => portalUserToRecipient(user, "lender_client"))
    : [];

  if (String(eventKey).includes("bid")) {
    if (eventKey === "bid_request_sent") return appraisers.length ? appraisers : staff;
    if (eventKey === "bid_not_selected" || eventKey === "bid_awarded") return appraisers;
    return staff;
  }

  if (String(eventKey).includes("revision")) return [...appraisers, ...reviewers, ...staff];
  if (String(eventKey).includes("assignment") || eventKey === "order_assigned") return [...appraisers, ...staff];
  if (String(eventKey).includes("review") || String(eventKey).includes("report_uploaded") || eventKey === "report_submitted") return [...reviewers, ...staff];
  if (String(eventKey).includes("delivered") || eventKey === "inspection_scheduled" || eventKey === "inspection_completed") return [...clients, ...staff];
  return staff;
}

function channelAllowed({
  channel,
  eventKey,
  recipient,
  preferences
}: {
  channel: NotificationQueueChannel;
  eventKey: NotificationEventKey | string;
  recipient: NotificationRecipient;
  preferences: NotificationPreference[];
}) {
  const definition = getNotificationDefinition(eventKey);
  const preference = preferences.find((item) => item.eventKey === eventKey && recipientMatchesPreference(item, recipient));
  if (definition.mandatory || preference?.mandatory) return true;
  if (preference?.cadence === "Off") return false;
  if (channel === "Email") return preference?.emailEnabled ?? true;
  if (channel === "In-app") return preference?.inAppEnabled ?? true;
  return preference?.cadence === "Daily digest" || preference?.dailyDigestEnabled === true;
}

function emailStatus(settings: OrganizationNotificationSettings | undefined, providerConfigured: boolean) {
  if (!settings?.emailEnabled || !providerConfigured) return "Configuration required" as const;
  return "Pending" as const;
}

export function createDevelopmentEmailProvider(): EmailProvider {
  return {
    id: "development-log",
    async send(message) {
      return {
        id: `email-${Date.now()}`,
        organizationId: message.organizationId,
        eventKey: message.eventKey as NotificationEventKey,
        recipient: message.to,
        subject: message.subject,
        status: "Logged",
        provider: "development-log",
        createdAt: new Date().toISOString(),
        actionUrl: message.actionUrl,
        templateVersion: message.templateVersion,
        visibilityClassification: message.visibilityClassification as EmailDeliveryRecord["visibilityClassification"],
        plaintextPreview: message.text.slice(0, 240),
        htmlPreview: message.html.slice(0, 240),
        attemptCount: 1
      };
    }
  };
}

export function resolveEmailProvider() {
  return createDevelopmentEmailProvider();
}

export function buildNotificationTemplate(eventKey: NotificationEventKey | string): NotificationTemplate {
  const definition = getNotificationDefinition(eventKey);
  return {
    eventKey: definition.eventKey,
    label: definition.label,
    subject: `CAS: ${definition.label}`,
    preview: `${definition.label} event is ready for delivery through the configured provider.`,
    defaultAudience: definition.defaultAudience,
    version: definition.templateVersion,
    category: definition.category,
    visibilityClassification: definition.visibilityClassification
  };
}

export async function previewEmailEvent(message: EmailMessage) {
  return resolveEmailProvider().send(message);
}

export function createNotificationArtifacts(input: NotificationEventInput): NotificationArtifacts {
  const definition = getNotificationDefinition(input.eventKey);
  const now = input.now ?? new Date();
  const channels = input.channels ?? ["In-app", "Email"];
  const queueItems: NotificationQueueItem[] = [];
  const communicationEvents: CommunicationEvent[] = [];
  const emailMessages: EmailMessage[] = [];
  const providerConfigured = input.settings?.emailEnabled === true;

  for (const recipient of input.recipients) {
    const render = renderRoleAwareNotification({
      eventKey: input.eventKey,
      order: input.order,
      organization: input.organization,
      actor: input.actor,
      recipient,
      settings: input.settings,
      actionUrl: input.actionUrl,
      now,
      metadata: input.metadata
    });

    for (const channel of channels) {
      if (!channelAllowed({ channel, eventKey: input.eventKey, recipient, preferences: input.preferences ?? [] })) continue;

      const timestamp = isoNow(now);
      const status = channel === "Email" ? emailStatus(input.settings, providerConfigured) : "Pending";
      const dedupeKey = [
        input.dedupeScope ?? input.order?.id ?? input.relatedEntityId ?? "general",
        input.eventKey,
        recipient.id,
        channel
      ].map(safeIdPart).join(":");
      const queueId = `${input.idPrefix ?? "notifq"}-${safeIdPart(String(input.eventKey))}-${safeIdPart(recipient.id)}-${safeIdPart(channel)}-${now.getTime()}`;

      queueItems.push({
        id: queueId,
        organizationId: input.organization.id,
        recipient: recipient.name,
        recipientUserId: recipient.id,
        recipientOrganizationId: recipient.organizationId,
        recipientRole: recipient.role,
        eventType: input.eventKey,
        channel,
        status,
        attemptCount: 0,
        failureReason: status === "Configuration required" ? "Email provider is not configured for this organization." : undefined,
        relatedOrderId: input.order?.id,
        relatedTaskId: input.relatedTaskId,
        relatedInvoiceId: input.relatedInvoiceId,
        relatedVendorId: input.relatedVendorId,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        digestGroup: input.digestGroup ?? definition.category,
        queuedAt: timestamp,
        scheduledAt: channel === "Digest" ? timestamp : undefined,
        subject: render.subject,
        preview: render.sanitizedMessage,
        priority: definition.priority,
        category: definition.category,
        actionUrl: render.actionUrl,
        requiresAction: definition.requiresAction,
        templateVersion: definition.templateVersion,
        visibilityClassification: render.visibilityClassification,
        dedupeKey
      });

      communicationEvents.push({
        id: `comm-${safeIdPart(String(input.eventKey))}-${safeIdPart(recipient.id)}-${safeIdPart(channel)}-${now.getTime()}`,
        organizationId: input.organization.id,
        orderId: input.order?.id,
        actorUserId: input.actor?.id,
        eventType: input.eventKey,
        channel: channel === "In-app" ? "in_app" : channel === "Email" ? "email" : "digest",
        recipient: recipient.name,
        recipientUserId: recipient.id,
        recipientOrganizationId: recipient.organizationId,
        recipientRole: recipient.role,
        visibilityClassification: render.visibilityClassification,
        subject: render.subject,
        sanitizedMessage: render.sanitizedMessage,
        actionUrl: render.actionUrl,
        deliveryStatus: status === "Configuration required" ? "failed" : channel === "In-app" ? "created" : "queued",
        notificationQueueId: queueId,
        failureReason: status === "Configuration required" ? "Email provider configuration required." : undefined,
        retryCount: 0,
        occurredAt: timestamp,
        metadata: {
          category: definition.category,
          templateVersion: definition.templateVersion,
          omittedFields: render.omittedFields.join(", ")
        }
      });

      if (channel === "Email" && recipient.email && status !== "Configuration required") {
        emailMessages.push({
          organizationId: input.organization.id,
          eventKey: input.eventKey,
          to: recipient.email,
          subject: render.subject,
          html: render.html,
          text: render.text,
          actionUrl: render.actionUrl,
          replyTo: input.settings?.replyToEmail,
          visibilityClassification: render.visibilityClassification,
          templateVersion: definition.templateVersion
        });
      }
    }
  }

  return { queueItems, communicationEvents, emailMessages };
}

export function createQueueItemFromEvent(input: NotificationEventInput, recipient: NotificationRecipient, channel: NotificationQueueChannel = "In-app") {
  return createNotificationArtifacts({ ...input, recipients: [recipient], channels: [channel] }).queueItems[0];
}

export function buildDeliveryNotificationArtifacts(input: Omit<NotificationEventInput, "eventKey">) {
  return createNotificationArtifacts({
    ...input,
    eventKey: "final_report_delivered",
    channels: ["In-app", "Email"],
    digestGroup: "delivery"
  });
}

export function buildBidInvitationArtifacts(input: Omit<NotificationEventInput, "eventKey">) {
  return createNotificationArtifacts({
    ...input,
    eventKey: "bid_request_sent",
    channels: ["In-app", "Email"],
    digestGroup: "bids"
  });
}

export function buildAssignmentNotificationArtifacts(input: Omit<NotificationEventInput, "eventKey">) {
  return createNotificationArtifacts({
    ...input,
    eventKey: "direct_assignment_sent",
    channels: ["In-app", "Email"],
    digestGroup: "assignment"
  });
}

export function countUnreadNotifications(queue: NotificationQueueItem[], user: PortalUser) {
  return queue.filter((item) =>
    item.status !== "Read"
    && item.status !== "Dismissed"
    && (item.recipientUserId === user.id || item.recipient === user.name || item.recipientRole === user.role)
  ).length;
}
