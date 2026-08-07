import type {
  AppraiserProfile,
  Invoice,
  NotificationEventKey,
  NotificationReminderState,
  Order,
  Organization,
  OrganizationNotificationSettings,
  PortalUser,
  VendorDocument
} from "@/types/domain";
import { daysFromToday } from "@/lib/operations-center/service";
import type { NotificationRecipient } from "./privacy";
import { createNotificationArtifacts } from "./service";

export type ReminderCondition = {
  reminderKey: string;
  eventKey: NotificationEventKey;
  order?: Order;
  relatedInvoiceId?: string;
  relatedVendorId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  priorityReason: string;
};

export type ReminderEngineInput = {
  organization: Organization;
  orders: Order[];
  invoices: Invoice[];
  appraisers: AppraiserProfile[];
  vendorDocuments: VendorDocument[];
  users: PortalUser[];
  currentUser: PortalUser;
  settings?: OrganizationNotificationSettings;
  reminderState?: NotificationReminderState[];
  now?: Date;
};

const defaultSettings: Pick<
  OrganizationNotificationSettings,
  "defaultDueWarningHours" | "assignmentAcceptanceHours" | "revisionReminderHours" | "invoiceReminderDays" | "complianceWarningDays"
> = {
  defaultDueWarningHours: [72, 48, 24, 0],
  assignmentAcceptanceHours: 12,
  revisionReminderHours: [24, 0],
  invoiceReminderDays: [7, 1, 0],
  complianceWarningDays: [60, 30, 14, 7, 0]
};

function activeOrder(order: Order) {
  return !["Delivered", "Completed", "Cancelled"].includes(order.status);
}

function roleRecipients(users: PortalUser[], organizationId: string, roles: PortalUser["role"][]): NotificationRecipient[] {
  return users
    .filter((user) => user.organizationId === organizationId && roles.includes(user.role))
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId,
      relationship: user.role === "appraiser" ? "assigned_appraiser" : user.role === "reviewer" ? "reviewer" : "requesting_org_internal"
    }));
}

function appraiserRecipient(users: PortalUser[], organizationId: string, appraiserName: string): NotificationRecipient[] {
  const match = users.find((user) => user.organizationId === organizationId && user.name === appraiserName);
  if (!match) {
    return [{
      id: `appraiser-${appraiserName}`,
      name: appraiserName,
      role: "appraiser",
      organizationId,
      relationship: "assigned_appraiser"
    }];
  }
  return [{
    id: match.id,
    name: match.name,
    email: match.email,
    role: match.role,
    organizationId,
    relationship: "assigned_appraiser"
  }];
}

function reminderAlreadySent(reminderState: NotificationReminderState[] | undefined, reminderKey: string) {
  return Boolean(reminderState?.some((state) => state.reminderKey === reminderKey));
}

export function detectReminderConditions(input: ReminderEngineInput): ReminderCondition[] {
  const state = input.reminderState ?? [];
  const conditions: ReminderCondition[] = [];
  const settings = { ...defaultSettings, ...input.settings };
  const now = input.now ?? new Date();

  for (const order of input.orders.filter(activeOrder)) {
    const daysUntilDue = daysFromToday(order.dueDate, now);
    const hoursUntilDue = daysUntilDue * 24;
    if (daysUntilDue < 0) {
      const key = `order:${order.id}:report_overdue`;
      if (!reminderAlreadySent(state, key)) {
        conditions.push({ reminderKey: key, eventKey: "report_overdue", order, priorityReason: "Report due date has passed." });
      }
    } else if (settings.defaultDueWarningHours.includes(hoursUntilDue)) {
      const eventKey: NotificationEventKey = hoursUntilDue === 0 ? "report_due_today" : "report_due_soon";
      const key = `order:${order.id}:${eventKey}:${hoursUntilDue}`;
      if (!reminderAlreadySent(state, key)) {
        conditions.push({ reminderKey: key, eventKey, order, priorityReason: `${hoursUntilDue || "Due today"} hour due-date reminder.` });
      }
    }

    if (order.status === "Assigned") {
      const key = `order:${order.id}:assignment_acceptance:${settings.assignmentAcceptanceHours}`;
      if (!reminderAlreadySent(state, key)) {
        conditions.push({ reminderKey: key, eventKey: "assignment_acceptance_deadline_approaching", order, priorityReason: "Assignment is still awaiting appraiser acceptance." });
      }
    }

    if (order.status === "Revisions Needed") {
      const key = `order:${order.id}:revision_due_soon`;
      if (!reminderAlreadySent(state, key)) {
        conditions.push({ reminderKey: key, eventKey: "revision_due_soon", order, priorityReason: "Revision request is waiting on the appraiser." });
      }
    }
  }

  for (const invoice of input.invoices.filter((item) => item.status !== "Paid" && item.dueDate)) {
    const daysUntilDue = daysFromToday(invoice.dueDate, now);
    const eventKey: NotificationEventKey | null = daysUntilDue < 0 ? "invoice_overdue" : settings.invoiceReminderDays.includes(daysUntilDue) ? "invoice_due_soon" : null;
    if (!eventKey) continue;
    const key = `invoice:${invoice.id}:${eventKey}:${daysUntilDue}`;
    if (!reminderAlreadySent(state, key)) {
      conditions.push({
        reminderKey: key,
        eventKey,
        relatedInvoiceId: invoice.id,
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        priorityReason: daysUntilDue < 0 ? "Invoice is overdue." : "Invoice due-date reminder."
      });
    }
  }

  for (const document of input.vendorDocuments.filter((item) => item.expiresAt)) {
    const daysUntilExpiration = daysFromToday(document.expiresAt ?? "", now);
    const eventKey: NotificationEventKey | null = daysUntilExpiration < 0
      ? document.type === "E&O" ? "eo_expired" : "license_expired"
      : settings.complianceWarningDays.includes(daysUntilExpiration)
        ? document.type === "E&O" ? "eo_expiring" : "license_expiring"
        : null;
    if (!eventKey) continue;
    const key = `vendor-document:${document.id}:${eventKey}:${daysUntilExpiration}`;
    if (!reminderAlreadySent(state, key)) {
      conditions.push({
        reminderKey: key,
        eventKey,
        relatedVendorId: document.vendorId,
        relatedEntityType: "vendor_document",
        relatedEntityId: document.id,
        priorityReason: `${document.type} ${daysUntilExpiration < 0 ? "expired" : `expires in ${daysUntilExpiration} days`}.`
      });
    }
  }

  return conditions;
}

export function buildReminderNotifications(input: ReminderEngineInput) {
  const conditions = detectReminderConditions(input);
  const staff = roleRecipients(input.users, input.organization.id, ["company_admin", "office_staff", "amc_admin", "amc_staff"]);
  const reviewer = roleRecipients(input.users, input.organization.id, ["reviewer"]);

  return conditions.flatMap((condition) => {
    const recipients = condition.order?.appraiser && condition.order.appraiser !== "Unassigned"
      ? [...appraiserRecipient(input.users, input.organization.id, condition.order.appraiser), ...staff]
      : condition.eventKey.startsWith("invoice")
        ? roleRecipients(input.users, input.organization.id, ["company_admin", "office_staff"])
        : condition.eventKey.includes("revision")
          ? [...reviewer, ...staff]
          : staff;

    return createNotificationArtifacts({
      idPrefix: "reminder",
      eventKey: condition.eventKey,
      organization: input.organization,
      order: condition.order,
      actor: input.currentUser,
      recipients,
      settings: input.settings,
      relatedInvoiceId: condition.relatedInvoiceId,
      relatedVendorId: condition.relatedVendorId,
      relatedEntityType: condition.relatedEntityType,
      relatedEntityId: condition.relatedEntityId,
      digestGroup: "reminders",
      dedupeScope: condition.reminderKey,
      metadata: { reminderKey: condition.reminderKey, priorityReason: condition.priorityReason },
      now: input.now
    }).queueItems;
  });
}
