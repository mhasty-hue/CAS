import type {
  NotificationEventKey,
  NotificationVisibilityClassification,
  Order,
  Organization,
  OrganizationNotificationSettings,
  PortalUser,
  UserRole
} from "@/types/domain";
import { formatDate } from "@/lib/utils";
import { getNotificationDefinition } from "./catalog";

export type NotificationRecipient = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  organizationId: string;
  organizationType?: Organization["type"];
  relationship:
    | "requesting_org_internal"
    | "assigned_appraiser"
    | "reviewer"
    | "lender_client"
    | "private_client"
    | "bid_recipient"
    | "accounting"
    | "system";
};

export type RoleAwareRenderInput = {
  eventKey: NotificationEventKey | string;
  order?: Order;
  organization: Organization;
  actor?: Pick<PortalUser, "id" | "name" | "role">;
  recipient: NotificationRecipient;
  settings?: OrganizationNotificationSettings;
  actionUrl?: string;
  now?: Date;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type RoleAwareNotificationRender = {
  subject: string;
  sanitizedMessage: string;
  text: string;
  html: string;
  actionUrl: string;
  visibilityClassification: NotificationVisibilityClassification;
  omittedFields: string[];
};

const restrictedPatterns = [
  /\bclient fee\b/i,
  /\bAMC margin\b/i,
  /\bmargin\b/i,
  /\bpayroll\b/i,
  /\bcommission\b/i,
  /\bother bidders?\b/i,
  /\bbid ranking\b/i,
  /\binternal review note\b/i,
  /\bstorage\/v1\b/i,
  /\bservice[_-]?role\b/i,
  /\bsigned url\b/i
];

function orderLabel(order?: Order) {
  if (!order) return "this appraisal order";
  return `${order.fileNumber} for ${order.address}`;
}

function safeDueDate(order?: Order) {
  return order?.dueDate ? formatDate(order.dueDate) : "the requested due date";
}

function baseActionUrl(order?: Order, actionUrl?: string) {
  if (actionUrl) return actionUrl;
  return order ? `/orders/${order.id}` : "/notifications";
}

function clientMessage(eventKey: string, order?: Order) {
  switch (eventKey) {
    case "assignment_accepted":
    case "appraiser_accepted":
    case "order_assigned":
      return `Your appraiser has been assigned for ${orderLabel(order)}.`;
    case "inspection_scheduled":
      return `The inspection has been scheduled for ${orderLabel(order)}.`;
    case "inspection_rescheduled":
      return `The inspection schedule changed for ${orderLabel(order)}.`;
    case "inspection_completed":
      return `The property inspection is complete for ${orderLabel(order)}.`;
    case "report_entered_review":
    case "report_uploaded":
    case "report_submitted":
      return "Your appraisal report has been received and is under review.";
    case "revision_requested":
    case "revisions_requested":
      return "Additional information is being reviewed for your appraisal.";
    case "final_report_delivered":
    case "report_delivered":
      return "Your appraisal report is ready to view securely in CAS.";
    default:
      return `There is an update for ${orderLabel(order)}.`;
  }
}

function appraiserMessage(eventKey: string, order?: Order, organization?: Organization) {
  switch (eventKey) {
    case "bid_request_sent":
      return `You have a new appraisal bid opportunity from ${organization?.name ?? "CAS"} for ${orderLabel(order)}.`;
    case "bid_not_selected":
      return `Thank you for responding. This bid opportunity for ${orderLabel(order)} was awarded to another provider.`;
    case "bid_awarded":
    case "direct_assignment_sent":
    case "order_assigned":
      return `You have a new appraisal assignment for ${orderLabel(order)} due ${safeDueDate(order)}.`;
    case "report_due_soon":
    case "due_date_warning":
      return `${orderLabel(order)} is approaching its report due date of ${safeDueDate(order)}.`;
    case "report_due_today":
      return `${orderLabel(order)} is due today.`;
    case "report_overdue":
    case "past_due_warning":
      return `${orderLabel(order)} is overdue and needs attention.`;
    case "revision_requested":
    case "revisions_requested":
      return `A review item requires your response for ${orderLabel(order)}.`;
    default:
      return `CAS has an update for ${orderLabel(order)}.`;
  }
}

function internalMessage(eventKey: string, order?: Order, actor?: Pick<PortalUser, "name">, metadata?: RoleAwareRenderInput["metadata"]) {
  const actorName = actor?.name ?? "CAS";
  const appraiserName = metadata?.appraiserName ? String(metadata.appraiserName) : order?.appraiser;
  switch (eventKey) {
    case "new_order_received":
    case "new_connected_order_received":
    case "public_order_request_submitted":
      return `${orderLabel(order)} needs intake review.`;
    case "bid_submitted":
    case "new_bid_response_received":
      return `A bid response was received for ${orderLabel(order)}.`;
    case "bid_declined":
      return `A bidder declined the opportunity for ${orderLabel(order)}.`;
    case "bid_awarded":
      return `The bid for ${orderLabel(order)} was awarded and is waiting on acceptance.`;
    case "assignment_accepted":
    case "appraiser_accepted":
      return `${appraiserName ?? "The appraiser"} accepted the assignment for ${orderLabel(order)}.`;
    case "assignment_declined":
    case "appraiser_declined":
      return `${appraiserName ?? "The appraiser"} declined the assignment for ${orderLabel(order)}.`;
    case "report_uploaded":
    case "report_submitted":
      return `${actorName} uploaded the appraisal report for ${orderLabel(order)}. Review is required.`;
    case "critical_review_finding_created":
      return `A critical review finding requires attention for ${orderLabel(order)}.`;
    case "final_report_ready_for_delivery":
    case "report_ready_for_delivery":
      return `${orderLabel(order)} is approved and ready for secure delivery.`;
    case "final_report_delivered":
    case "report_delivered":
      return `${orderLabel(order)} was released through secure delivery.`;
    default:
      return `${getNotificationDefinition(eventKey).label}: ${orderLabel(order)}.`;
  }
}

function chooseVisibility(input: RoleAwareRenderInput): NotificationVisibilityClassification {
  const definition = getNotificationDefinition(input.eventKey);
  if (input.recipient.relationship === "lender_client" || input.recipient.relationship === "private_client") return "client_safe";
  if (input.recipient.relationship === "assigned_appraiser" || input.recipient.relationship === "bid_recipient") return "appraiser_safe";
  if (input.recipient.relationship === "reviewer") return definition.visibilityClassification === "client_safe" ? "shared" : definition.visibilityClassification;
  return definition.visibilityClassification;
}

export function renderRoleAwareNotification(input: RoleAwareRenderInput): RoleAwareNotificationRender {
  const definition = getNotificationDefinition(input.eventKey);
  const visibilityClassification = chooseVisibility(input);
  const actionUrl = baseActionUrl(input.order, input.actionUrl);
  const label = definition.label;
  const subject = input.eventKey === "bid_request_sent"
    ? "New appraisal bid opportunity in CAS"
    : input.eventKey === "direct_assignment_sent" || input.eventKey === "order_assigned"
      ? "New appraisal assignment in CAS"
      : input.eventKey === "final_report_delivered" || input.eventKey === "report_delivered"
        ? "Your appraisal report is ready"
        : `CAS: ${label}`;

  const message = input.recipient.relationship === "lender_client" || input.recipient.relationship === "private_client"
    ? clientMessage(String(input.eventKey), input.order)
    : input.recipient.relationship === "assigned_appraiser" || input.recipient.relationship === "bid_recipient"
      ? appraiserMessage(String(input.eventKey), input.order, input.organization)
      : internalMessage(String(input.eventKey), input.order, input.actor, input.metadata);

  const sanitizedMessage = redactNotificationText(message, input.recipient.role);
  const text = `${sanitizedMessage}\n\nOpen CAS: ${actionUrl}`;
  const html = `<p>${escapeHtml(sanitizedMessage)}</p><p><a href="${escapeHtml(actionUrl)}">Open in CAS</a></p>`;

  return {
    subject,
    sanitizedMessage,
    text,
    html,
    actionUrl,
    visibilityClassification,
    omittedFields: omittedFieldsForRole(input.recipient.role, visibilityClassification)
  };
}

export function omittedFieldsForRole(role: UserRole, visibility: NotificationVisibilityClassification) {
  if (visibility === "client_safe") return ["vendor fee", "bid responses", "internal notes", "reviewer-only findings", "storage paths"];
  if (visibility === "appraiser_safe") return ["client fee", "AMC margin", "other bidders", "payroll", "internal ranking", "storage paths"];
  if (visibility === "reviewer_only") return ["client-private notes", "payroll", "provider secrets", "storage paths"];
  if (role === "client_user") return ["internal recipients", "vendor fee", "payroll", "workfiles", "storage paths"];
  return ["secrets", "service-role keys", "permanent signed URLs"];
}

export function redactNotificationText(value: string, role?: UserRole) {
  let redacted = value;
  for (const pattern of restrictedPatterns) {
    redacted = redacted.replace(pattern, "[restricted]");
  }
  if (role === "client_user") {
    redacted = redacted.replace(/\b\$[\d,]+(?:\.\d{2})?\b/g, "[fee hidden]");
  }
  return redacted;
}

export function assertNotificationPrivacy(value: string) {
  const leakedPattern = restrictedPatterns.find((pattern) => pattern.test(value));
  if (leakedPattern) {
    throw new Error(`Notification content includes restricted data matching ${leakedPattern.source}.`);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
