import { defaultOrderFormTemplate } from "@/data/demo";
import { getPermissions } from "@/lib/permissions";
import { createSupabaseBrowserClient, type CasSupabaseClient } from "@/lib/supabase";
import type {
  AccountingEntry,
  AppraiserProfile,
  CalendarPreference,
  ClientContact,
  ClientProfile,
  CommunicationEvent,
  CompanyUser,
  EmailDeliveryRecord,
  Invoice,
  NotificationPreference,
  NotificationQueueItem,
  NotificationReminderState,
  NotificationTemplate,
  Order,
  OrderFormTemplate,
  OrderStatus,
  Organization,
  OrganizationNotificationSettings,
  PermissionKey,
  ScheduledJob,
  UserRole,
  WebhookEvent,
  VendorDocument,
  VendorProfile
} from "@/types/domain";
import type {
  AccountingEntryRow,
  AppraiserProfileRow,
  CalendarPreferenceRow,
  ClientContactRow,
  ClientFeeDefaultRow,
  ClientRow,
  CommunicationEventRow,
  DocumentAuditEventRow,
  DocumentRow,
  DocumentVersionRow,
  EmailDeliveryRow,
  AppraisalReportVersionRow,
  InvoiceRow,
  NotificationPreferenceRow,
  NotificationQueueRow,
  NotificationReminderStateRow,
  NotificationTemplateRow,
  OrderFormTemplateRow,
  OrderRow,
  OrganizationMemberRow,
  OrganizationNotificationSettingsRow,
  OrganizationRow,
  ReportDeliveryRow,
  ReportSubmissionRow,
  RequiredDocumentRuleRow,
  RolePermissionRow,
  RoleRow,
  ScheduledJobRow,
  UserProfileRow,
  WebhookEventRow,
  VendorProfileRow
} from "@/types/database";
import { buildDemoNormalizedReport, identifyReportFileKind } from "@/lib/report-review/ingestion";
import { selectReportProfile } from "@/lib/report-review/profiles";
import { mapDeliveryRecord, mapDocumentAuditEvent, mapManagedDocument, mapReportSubmission, mapRequiredDocumentRule } from "@/lib/storage/mappers";
import { getNotificationDefinition, normalizeNotificationCategory } from "@/lib/notifications/catalog";
import type { AppraisalReportVersion, IngestionSourceFile, ReviewOverlayId } from "@/types/report-review";
import type { CasAuthContext, CasBootstrapData, CasRepository } from "./types";

const orderStatuses: OrderStatus[] = [
  "New",
  "Unassigned",
  "Assigned",
  "Accepted",
  "Inspection Scheduled",
  "Inspected",
  "Report In Progress",
  "Submitted",
  "In Review",
  "Revisions Needed",
  "Revision Sent to Appraiser",
  "Ready for Delivery",
  "Delivered",
  "Completed",
  "On Hold",
  "Cancelled"
];

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function toCurrency(value: number | null | undefined) {
  return Number(value ?? 0);
}

function toOrderStatus(status: string): OrderStatus {
  return orderStatuses.includes(status as OrderStatus) ? (status as OrderStatus) : "New";
}

function toUserRole(role: string | null | undefined): UserRole {
  const normalized = role ?? "office_staff";
  const roles: UserRole[] = [
    "super_admin",
    "company_admin",
    "office_staff",
    "appraiser",
    "appraiser_manager",
    "reviewer",
    "amc_admin",
    "amc_staff",
    "client_user",
    "solo_appraiser"
  ];
  return roles.includes(normalized as UserRole) ? (normalized as UserRole) : "office_staff";
}

function requireSupabaseClient(configuredClient?: CasSupabaseClient) {
  const client = configuredClient ?? createSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured. Set Supabase environment keys or enable demo mode.");
  }
  return client;
}

async function getAuthenticatedUser(client: CasSupabaseClient) {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (session?.user) return session.user;

  const {
    data: { user }
  } = await client.auth.getUser();

  return user ?? null;
}

function readRows<T>(label: string, result: { data: T[] | null; error: { message: string } | null }) {
  if (result.error) {
    throw new Error(`Supabase ${label} query failed: ${result.error.message}`);
  }
  return result.data ?? [];
}

function readMaybe<T>(label: string, result: { data: T | null; error: { message: string } | null }) {
  if (result.error) {
    throw new Error(`Supabase ${label} query failed: ${result.error.message}`);
  }
  return result.data;
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? undefined,
    type: row.type,
    status: row.status === "inactive" ? "Suspended" : "Active",
    primaryContact: row.primary_contact ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    logoUrl: row.logo_url ?? undefined,
    brandColor: row.brand_color ?? undefined
  };
}

function mapClient(row: ClientRow, contacts: ClientContactRow[], fees: ClientFeeDefaultRow[]): ClientProfile {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    status: row.status === "inactive" ? "Inactive" : "Active",
    defaultTurnDays: row.default_turn_days ?? 5,
    contacts: contacts.map<ClientContact>((contact) => ({
      id: contact.id,
      name: contact.name,
      title: contact.title ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? ""
    })),
    notes: row.notes ?? "",
    defaultFees: fees.map((fee) => ({ productType: fee.product_type, fee: toCurrency(fee.fee) }))
  };
}

function mapAppraiser(row: AppraiserProfileRow): AppraiserProfile {
  const counties = row.coverage_summary?.split(",").map((county) => county.trim()).filter(Boolean) ?? [];

  return {
    id: row.id,
    name: row.display_name,
    role: row.role === "Panel" || row.role === "Solo" ? row.role : "Staff",
    counties,
    capacity: row.capacity ?? 0,
    activeOrders: row.active_orders ?? 0,
    dueThisWeek: row.due_this_week ?? 0,
    avgTurnDays: row.avg_turn_days ?? 0,
    revisionRate: row.revision_rate ?? 0,
    payoutDue: row.payout_due ?? 0,
    licenseStatus: "Current",
    defaultCommissionSplit: row.default_split_percent ?? undefined
  };
}

function mapVendor(row: VendorProfileRow): VendorProfile {
  return {
    id: row.id,
    company: row.company_name,
    contact: row.contact_name ?? "",
    distance: 0,
    coverage: row.specialties,
    coverageZips: row.coverage_zips,
    radiusMiles: row.radius_miles ?? undefined,
    officeAddress: row.office_address ?? undefined,
    roster: row.roster,
    specialties: row.specialties,
    status: row.status === "pending_documents" ? "Pending documents" : row.status === "under_review" ? "Under review" : "Approved",
    turnTime: row.turn_time_days ?? 0,
    capacity: row.capacity ?? 0,
    workload: row.workload ?? undefined,
    rating: row.rating ?? undefined,
    documents: { w9: "Current", eo: "Current", license: "Current" }
  };
}

function mapOrder(row: OrderRow, clientsById: Map<string, ClientRow>, appraisersById: Map<string, AppraiserProfileRow>): Order {
  const appraiser = row.appraiser_profile_id ? appraisersById.get(row.appraiser_profile_id)?.display_name ?? "Unassigned" : "Unassigned";
  const client = row.client_id ? clientsById.get(row.client_id)?.name ?? "Unknown client" : "Unknown client";

  return {
    id: row.id,
    fileNumber: row.file_number,
    productType: row.product_type,
    client,
    amc: "Direct Lender",
    borrower: row.borrower_name,
    address: row.subject_address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    county: row.county,
    appraiser,
    reviewer: "Unassigned",
    orderedDate: dateOnly(row.ordered_at),
    dueDate: dateOnly(row.due_at),
    inspectionDate: dateOnly(row.inspection_at) || undefined,
    status: toOrderStatus(row.status),
    priority: row.priority === "Rush" || row.priority === "High" || row.priority === "Watch" ? row.priority : "Standard",
    fee: toCurrency(row.fee),
    techFee: toCurrency(row.tech_fee),
    appraiserPayout: toCurrency(row.appraiser_payout),
    documents: 0,
    lastUpdate: row.last_activity_at ? `Updated ${dateOnly(row.last_activity_at)}` : "Synced from Supabase",
    nextAction: row.next_action ?? "Review order",
    loanType: row.loan_type ?? "",
    occupancy: row.occupancy ?? "",
    propertyType: row.property_type ?? "",
    contactName: row.contact_name ?? row.borrower_name,
    contactPhone: row.contact_phone ?? "",
    accessInfo: row.access_info ?? "",
    assignmentPreference: row.assignment_preference ?? "Best workload fit",
    lenderContact: row.lender_contact ?? "",
    parcelNumber: row.parcel_number ?? "",
    timeline: [],
    notes: [],
    clientComments: [],
    documentsList: [],
    assignmentHistory: [],
    revisionLog: [],
    auditTrail: [],
    reviewItems: [],
    commissionSplitOverride: row.commission_split_override ?? undefined,
    paidAt: dateOnly(row.paid_at) || undefined
  };
}

function mapAccounting(row: AccountingEntryRow, ordersById: Map<string, Order>, clientsById: Map<string, ClientRow>, appraisersById: Map<string, AppraiserProfileRow>): AccountingEntry {
  const order = row.order_id ? ordersById.get(row.order_id) : undefined;

  return {
    id: row.id,
    orderId: row.order_id ?? "",
    client: row.client_id ? clientsById.get(row.client_id)?.name ?? "" : order?.client ?? "",
    appraiser: row.appraiser_profile_id ? appraisersById.get(row.appraiser_profile_id)?.display_name ?? "" : order?.appraiser ?? "",
    productType: row.product_type ?? order?.productType ?? "",
    county: row.county ?? order?.county ?? "",
    completedAt: row.completed_at ?? dateOnly(order?.dueDate),
    fee: toCurrency(row.fee ?? row.amount),
    techFee: toCurrency(row.tech_fee),
    commissionSplit: row.commission_split ?? 0,
    appraiserSplit: toCurrency(row.appraiser_split),
    companyRevenue: toCurrency(row.company_revenue),
    status: row.status === "Paid" || row.status === "Unpaid" || row.status === "Ready to invoice" || row.status === "Payout pending" ? row.status : "Unpaid",
    month: row.month ?? dateOnly(row.completed_at).slice(0, 7),
    paidAt: row.paid_at ?? undefined
  };
}

function mapInvoice(row: InvoiceRow, clientsById: Map<string, ClientRow>): Invoice {
  const status = ["Draft", "Issued", "Sent", "Viewed", "Partially Paid", "Paid", "Overdue", "Void"].includes(row.status) ? row.status as Invoice["status"] : "Draft";

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id ?? undefined,
    invoiceNumber: row.invoice_number,
    client: row.client_id ? clientsById.get(row.client_id)?.name ?? "Unknown client" : "Unknown client",
    billingParty: row.billing_party ?? undefined,
    billToContact: row.bill_to_contact ?? undefined,
    amount: toCurrency(row.amount),
    subtotal: row.subtotal ?? undefined,
    taxAmount: row.tax_amount ?? undefined,
    balanceDue: row.balance_due ?? undefined,
    status,
    dueDate: dateOnly(row.due_at),
    orderCount: row.order_count,
    paymentTerms: row.payment_terms ?? undefined,
    notes: row.notes ?? undefined,
    draftDate: dateOnly(row.draft_at) || undefined,
    issuedDate: dateOnly(row.issued_at) || undefined,
    sentDate: dateOnly(row.sent_at) || undefined,
    viewedDate: dateOnly(row.viewed_at) || undefined,
    paidDate: dateOnly(row.paid_at) || undefined,
    partialPayment: row.partial_payment_amount ?? undefined
  };
}

function mapCalendarPreference(row: CalendarPreferenceRow, appraisersById: Map<string, AppraiserProfileRow>): CalendarPreference {
  return {
    id: row.id,
    appraiser: row.appraiser_profile_id ? appraisersById.get(row.appraiser_profile_id)?.display_name ?? "Unassigned" : "Company calendar",
    googleConnected: row.google_connected,
    syncInspections: row.sync_inspections,
    syncDueDates: row.sync_due_dates
  };
}

function mapOrderFormTemplate(row: OrderFormTemplateRow | undefined): OrderFormTemplate {
  if (!row) return defaultOrderFormTemplate;

  return {
    ...defaultOrderFormTemplate,
    id: row.id,
    name: row.name,
    ownerType: row.owner_type,
    organizationId: row.organization_id ?? undefined,
    updatedAt: dateOnly(row.updated_at)
  };
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function jsonStringRecord(value: unknown): Record<string, string> {
  const record = jsonRecord(value);
  return Object.fromEntries(Object.entries(record).flatMap(([key, item]) => typeof item === "string" ? [[key, item]] : []));
}

function normalizeNotificationCadence(value: string): NotificationPreference["cadence"] {
  if (value === "Off" || value.toLowerCase() === "off") return "Off";
  if (value === "Daily digest" || value.toLowerCase() === "daily_digest" || value.toLowerCase() === "daily digest") return "Daily digest";
  return "Immediate";
}

function normalizeQueueStatus(value: string): NotificationQueueItem["status"] {
  const normalized = value.toLowerCase();
  if (normalized === "queued") return "Queued";
  if (normalized === "sent") return "Sent";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "failed") return "Failed";
  if (normalized === "read") return "Read";
  if (normalized === "dismissed") return "Dismissed";
  if (normalized === "configuration required" || normalized === "configuration_required") return "Configuration required";
  return "Pending";
}

function normalizeQueueChannel(value: string): NotificationQueueItem["channel"] {
  const normalized = value.toLowerCase();
  if (normalized === "email") return "Email";
  if (normalized === "digest") return "Digest";
  return "In-app";
}

function normalizeEmailStatus(value: string): EmailDeliveryRecord["status"] {
  const normalized = value.toLowerCase();
  if (normalized === "queued") return "Queued";
  if (normalized === "sent") return "Sent";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "failed") return "Failed";
  if (normalized === "configuration required" || normalized === "configuration_required") return "Configuration required";
  return "Logged";
}

function normalizeEmailProvider(value: string): EmailDeliveryRecord["provider"] {
  if (["resend", "postmark", "sendgrid", "custom"].includes(value)) return value as EmailDeliveryRecord["provider"];
  return "development-log";
}

function normalizeVisibility(value: string | null | undefined) {
  const allowed = ["internal", "shared", "client_safe", "appraiser_safe", "reviewer_only", "accounting_restricted", "security"] as const;
  return allowed.includes(value as (typeof allowed)[number]) ? (value as (typeof allowed)[number]) : "internal";
}

function normalizeNotificationPriority(value: string | null | undefined) {
  const allowed = ["low", "normal", "high", "critical"] as const;
  return allowed.includes(value as (typeof allowed)[number]) ? (value as (typeof allowed)[number]) : "normal";
}

function mapNotificationPreference(row: NotificationPreferenceRow): NotificationPreference {
  const definition = getNotificationDefinition(row.event_key);
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    eventKey: definition.eventKey,
    emailEnabled: row.email_enabled,
    inAppEnabled: row.in_app_enabled,
    cadence: normalizeNotificationCadence(row.cadence),
    mandatory: row.mandatory,
    category: normalizeNotificationCategory(row.category),
    dailyDigestEnabled: row.daily_digest_enabled
  };
}

function mapNotificationTemplate(row: NotificationTemplateRow): NotificationTemplate {
  const definition = getNotificationDefinition(row.event_key);
  return {
    eventKey: definition.eventKey,
    label: definition.label,
    subject: row.subject,
    preview: row.preview ?? definition.label,
    defaultAudience: definition.defaultAudience,
    version: row.version,
    category: normalizeNotificationCategory(row.category),
    visibilityClassification: normalizeVisibility(row.visibility_classification)
  };
}

function mapEmailDelivery(row: EmailDeliveryRow): EmailDeliveryRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventKey: getNotificationDefinition(row.event_key).eventKey,
    recipient: row.recipient,
    recipientUserId: row.recipient_user_id ?? undefined,
    recipientRole: row.recipient_role ? toUserRole(row.recipient_role) : undefined,
    subject: row.subject,
    status: normalizeEmailStatus(row.status),
    provider: normalizeEmailProvider(row.provider),
    providerMessageId: row.provider_message_id ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    failedAt: row.failed_at ?? undefined,
    actionUrl: row.action_url ?? undefined,
    templateVersion: row.template_version,
    visibilityClassification: normalizeVisibility(row.visibility_classification),
    attemptCount: row.attempt_count,
    failureClassification: row.failure_classification as EmailDeliveryRecord["failureClassification"],
    plaintextPreview: row.plaintext_preview ?? undefined,
    htmlPreview: row.html_preview ?? undefined
  };
}

function mapNotificationQueue(row: NotificationQueueRow): NotificationQueueItem {
  const definition = getNotificationDefinition(row.event_type);
  return {
    id: row.id,
    organizationId: row.organization_id,
    recipient: row.recipient_email ?? row.recipient_role ?? "CAS recipient",
    recipientUserId: row.recipient_user_id ?? undefined,
    recipientOrganizationId: row.recipient_organization_id ?? undefined,
    recipientRole: row.recipient_role ? toUserRole(row.recipient_role) : undefined,
    eventType: row.event_type,
    channel: normalizeQueueChannel(row.channel),
    status: normalizeQueueStatus(row.status),
    attemptCount: row.attempt_count,
    failureReason: row.failure_reason ?? undefined,
    relatedOrderId: row.related_order_id ?? undefined,
    relatedTaskId: row.related_task_id ?? undefined,
    relatedInvoiceId: row.related_invoice_id ?? undefined,
    relatedVendorId: row.related_vendor_id ?? undefined,
    relatedEntityType: row.related_entity_type ?? undefined,
    relatedEntityId: row.related_entity_id ?? undefined,
    digestGroup: row.digest_group ?? undefined,
    queuedAt: row.queued_at,
    scheduledAt: row.scheduled_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    failedAt: row.failed_at ?? undefined,
    readAt: row.read_at ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    subject: row.subject,
    preview: row.preview ?? row.subject,
    priority: normalizeNotificationPriority(row.priority),
    category: definition.category,
    actionUrl: row.action_url ?? undefined,
    requiresAction: row.requires_action,
    templateVersion: row.template_version,
    visibilityClassification: normalizeVisibility(row.visibility_classification),
    dedupeKey: row.dedupe_key ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    emailDeliveryId: row.email_delivery_id ?? undefined
  };
}

function mapOrganizationNotificationSettings(row: OrganizationNotificationSettingsRow): OrganizationNotificationSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    emailEnabled: row.email_enabled,
    defaultDueWarningHours: row.default_due_warning_hours,
    bidReminderHours: row.bid_reminder_hours,
    assignmentAcceptanceHours: row.assignment_acceptance_hours,
    inspectionReminderHours: row.inspection_reminder_hours,
    revisionReminderHours: row.revision_reminder_hours,
    invoiceReminderDays: row.invoice_reminder_days,
    complianceWarningDays: row.compliance_warning_days,
    clientReceivesInspectionStatus: row.client_receives_inspection_status,
    clientReceivesAssignmentIdentity: row.client_receives_assignment_identity,
    clientReceivesReviewStatus: row.client_receives_review_status,
    clientsReceiveDeliveryEmail: row.clients_receive_delivery_email,
    copyOfficeStaffOnClientEvents: row.copy_office_staff_on_client_events,
    escalationRecipientRole: row.escalation_recipient_role,
    replyToEmail: row.reply_to_email ?? undefined,
    branding: jsonStringRecord(row.branding)
  };
}

function mapCommunicationEvent(row: CommunicationEventRow): CommunicationEvent {
  const status = ["created", "queued", "sent", "delivered", "failed", "read", "dismissed", "simulated"].includes(row.delivery_status)
    ? row.delivery_status as CommunicationEvent["deliveryStatus"]
    : "created";
  const channel = ["in_app", "email", "digest", "system", "message", "delivery"].includes(row.channel)
    ? row.channel as CommunicationEvent["channel"]
    : "system";
  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id ?? undefined,
    actorUserId: row.actor_user_id ?? undefined,
    eventType: row.event_type,
    channel,
    recipient: row.recipient_email ?? row.recipient_role ?? "CAS recipient",
    recipientUserId: row.recipient_user_id ?? undefined,
    recipientOrganizationId: row.recipient_organization_id ?? undefined,
    recipientRole: row.recipient_role ?? undefined,
    visibilityClassification: normalizeVisibility(row.visibility_classification),
    subject: row.subject,
    sanitizedMessage: row.sanitized_message,
    actionUrl: row.action_url ?? undefined,
    deliveryStatus: status,
    notificationId: row.notification_id ?? undefined,
    notificationQueueId: row.notification_queue_id ?? undefined,
    emailDeliveryId: row.email_delivery_id ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    retryCount: row.retry_count,
    occurredAt: row.occurred_at,
    metadata: jsonStringRecord(row.metadata)
  };
}

function mapReminderState(row: NotificationReminderStateRow): NotificationReminderState {
  return {
    id: row.id,
    organizationId: row.organization_id,
    reminderKey: row.reminder_key,
    eventType: row.event_type,
    relatedOrderId: row.related_order_id ?? undefined,
    relatedVendorId: row.related_vendor_id ?? undefined,
    relatedInvoiceId: row.related_invoice_id ?? undefined,
    relatedEntityType: row.related_entity_type ?? undefined,
    relatedEntityId: row.related_entity_id ?? undefined,
    firstTriggeredAt: row.first_triggered_at,
    lastTriggeredAt: row.last_triggered_at,
    nextEligibleAt: row.next_eligible_at ?? undefined,
    triggerCount: row.trigger_count
  };
}

function mapScheduledJob(row: ScheduledJobRow): ScheduledJob {
  const provider = row.provider === "Supabase scheduled function" || row.provider === "CAS demo scheduler" ? row.provider : "Vercel Cron";
  const status = ["Idle", "Queued", "Running", "Failed"].includes(row.status) ? row.status as ScheduledJob["status"] : "Idle";
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? "",
    jobType: row.job_type as ScheduledJob["jobType"],
    enabled: row.enabled,
    schedule: row.schedule,
    provider,
    lastRunAt: row.last_run_at ?? undefined,
    nextRunAt: row.next_run_at ?? undefined,
    status,
    runCount: row.run_count
  };
}

function mapWebhookEvent(row: WebhookEventRow): WebhookEvent {
  const status = ["Received", "Processed", "Failed", "Ignored"].includes(row.status) ? row.status as WebhookEvent["status"] : "Received";
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    eventType: row.event_type,
    status,
    receivedAt: row.received_at,
    processedAt: row.processed_at ?? undefined,
    payloadSummary: row.payload_summary ?? "Webhook payload received.",
    relatedOrderId: row.related_order_id ?? undefined
  };
}

function sourceFilesFromReportRow(row: AppraisalReportVersionRow): IngestionSourceFile[] {
  const sourceFiles = Array.isArray(row.source_files) ? row.source_files : [];
  return sourceFiles.flatMap((item, index) => {
    const record = jsonRecord(item);
    const fileName = typeof record.fileName === "string" ? record.fileName : `report-source-${index + 1}.pdf`;
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : "application/pdf";
    const storagePath = typeof record.storagePath === "string" ? record.storagePath : "";
    if (!storagePath) return [];
    return [{
      id: typeof record.documentVersionId === "string" ? record.documentVersionId : typeof record.id === "string" ? record.id : `${row.id}-source-${index + 1}`,
      fileName,
      mimeType,
      sizeBytes: typeof record.sizeBytes === "number" ? record.sizeBytes : 0,
      storagePath,
      checksum: typeof record.checksum === "string" ? record.checksum : undefined,
      uploadedBy: typeof record.uploadedBy === "string" ? record.uploadedBy : row.uploaded_by_name ?? "CAS",
      uploadedAt: typeof record.uploadedAt === "string" ? record.uploadedAt : row.uploaded_at,
      kind: identifyReportFileKind(fileName, mimeType)
    }];
  });
}

function reportVersionStatus(status: string): AppraisalReportVersion["status"] {
  if (status === "extracted") return "Extracted";
  if (status === "extraction_failed") return "Extraction Failed";
  if (status === "under_review") return "Under Review";
  if (status === "approved") return "Approved";
  if (status === "superseded") return "Superseded";
  return "Uploaded";
}

function mapAppraisalReportVersion(row: AppraisalReportVersionRow, order: Order, organization: Organization): AppraisalReportVersion {
  const sourceFiles = sourceFilesFromReportRow(row);
  const profile = selectReportProfile(order.productType, sourceFiles[0]?.fileName, sourceFiles[0]?.kind);
  const systemUser = {
    id: row.uploaded_by ?? "system",
    name: row.uploaded_by_name ?? "CAS",
    email: "",
    role: "reviewer" as const,
    organizationId: organization.id,
    title: "Review workspace"
  };

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id,
    reportSubmissionId: row.report_submission_id ?? undefined,
    versionNumber: row.version_number,
    profileId: profile.id,
    overlayIds: row.overlay_keys as ReviewOverlayId[],
    sourceFiles,
    storagePreserved: true,
    immutable: true,
    uploadedBy: row.uploaded_by_name ?? row.uploaded_by ?? "CAS",
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    replacedByVersionId: row.supersedes_report_version_id ?? undefined,
    status: reportVersionStatus(row.status),
    extractionSummary: row.extraction_summary ?? "Stored report source files are available for review.",
    normalizedReport: buildDemoNormalizedReport({ order, organization, user: systemUser, sourceFiles, runMode: "review_queue" }, profile, sourceFiles)
  };
}

function mapCompanyUser(profile: UserProfileRow, member: OrganizationMemberRow, role: RoleRow | undefined, permissions: PermissionKey[]): CompanyUser {
  return {
    id: member.id,
    name: profile.full_name,
    email: profile.email,
    role: toUserRole(role?.system_key),
    status: member.status === "active" ? "Active" : member.status === "invited" ? "Pending invite" : "Inactive",
    permissions,
    lastActive: member.last_active_at ? dateOnly(member.last_active_at) : "Not active yet"
  };
}

export class SupabaseCasRepository implements CasRepository {
  mode = "supabase" as const;

  constructor(private readonly configuredClient?: CasSupabaseClient) {}

  private getClient() {
    return requireSupabaseClient(this.configuredClient);
  }

  async loadBootstrapData(organizationId?: string): Promise<CasBootstrapData> {
    const client = this.getClient();

    const orgId = organizationId ?? (await this.resolveActiveOrganizationId());
    if (!orgId) {
      return {
        organizations: [],
        users: [],
        orders: [],
        clients: [],
        companyUsers: [],
        appraisers: [],
        vendors: [],
        vendorDocuments: [],
        accountingEntries: [],
        invoices: [],
        invoiceSettings: [],
        invitations: [],
        publicOrderSettings: [],
        publicOrderRequests: [],
        notificationPreferences: [],
        notificationTemplates: [],
        emailDeliveryRecords: [],
        organizationNotificationSettings: [],
        communicationEvents: [],
        notificationReminderState: [],
        integrations: [],
        integrationLogs: [],
        managedDocuments: [],
        requiredDocumentRules: [],
        orderMessages: [],
        revisionRequests: [],
        reportSubmissions: [],
        reportVersions: [],
        deliveryRecords: [],
        documentAuditEvents: [],
        orderFormTemplate: defaultOrderFormTemplate,
        calendarPreferences: [],
        automationRules: [],
        automationRuns: [],
        workflowTasks: [],
        notificationQueue: [],
        scheduledJobs: [],
        webhookEvents: []
      };
    }

    const [
      organizationsResult,
      clientsResult,
      contactsResult,
      feesResult,
      appraisersResult,
      vendorsResult,
      ordersResult,
      accountingResult,
      invoicesResult,
      formTemplateResult,
      calendarResult,
      membersResult,
      profilesResult,
      rolesResult,
      rolePermissionsResult
    ] = await Promise.all([
      client.from("organizations").select("*"),
      client.from("clients").select("*").eq("organization_id", orgId),
      client.from("client_contacts").select("*").eq("organization_id", orgId),
      client.from("client_fee_defaults").select("*").eq("organization_id", orgId),
      client.from("appraiser_profiles").select("*").eq("organization_id", orgId),
      client.from("vendor_profiles").select("*").eq("amc_organization_id", orgId),
      client.from("orders").select("*").eq("organization_id", orgId),
      client.from("accounting_entries").select("*").eq("organization_id", orgId),
      client.from("invoices").select("*").eq("organization_id", orgId),
      client.from("order_form_templates").select("*").eq("organization_id", orgId).eq("active", true),
      client.from("calendar_preferences").select("*").eq("organization_id", orgId),
      client.from("organization_members").select("*").eq("organization_id", orgId),
      client.from("user_profiles").select("*"),
      client.from("roles").select("*").eq("organization_id", orgId),
      client.from("role_permissions").select("*")
    ]);

    const organizationRows = readRows("organizations", organizationsResult);
    const clientRows = readRows("clients", clientsResult);
    const contactRows = readRows("client contacts", contactsResult);
    const feeRows = readRows("client fee defaults", feesResult);
    const appraiserRows = readRows("appraisers", appraisersResult);
    const vendorRows = readRows("vendors", vendorsResult);
    const orderRows = readRows("orders", ordersResult);
    const accountingRows = readRows("accounting entries", accountingResult);
    const invoiceRows = readRows("invoices", invoicesResult);
    const templateRows = readRows("order form templates", formTemplateResult);
    const calendarRows = readRows("calendar preferences", calendarResult);
    const memberRows = readRows("organization members", membersResult);
    const profileRows = readRows("user profiles", profilesResult);
    const roleRows = readRows("roles", rolesResult);
    const rolePermissionRows = readRows("role permissions", rolePermissionsResult);

    const clientsById = new Map(clientRows.map((row) => [row.id, row]));
    const appraisersById = new Map(appraiserRows.map((row) => [row.id, row]));
    const ordersById = new Map<string, Order>();
    const rolesById = new Map(roleRows.map((role) => [role.id, role]));
    const permissionsByRoleId = rolePermissionRows.reduce<Map<string, PermissionKey[]>>((map, row: RolePermissionRow) => {
      if (row.enabled) {
        const permissions = map.get(row.role_id) ?? [];
        permissions.push(row.permission_key as PermissionKey);
        map.set(row.role_id, permissions);
      }
      return map;
    }, new Map());

    let mappedOrders = orderRows.map((row) => {
      const order = mapOrder(row, clientsById, appraisersById);
      ordersById.set(order.id, order);
      return order;
    });

    const companyUsers = memberRows.flatMap<CompanyUser>((member) => {
      const profile = profileRows.find((row) => row.id === member.user_id);
      if (!profile) return [];
      const role = member.role_id ? rolesById.get(member.role_id) : undefined;
      const permissions = member.role_id ? permissionsByRoleId.get(member.role_id) ?? [] : [];
      return [mapCompanyUser(profile, member, role, permissions)];
    });

    const [
      documentsResult,
      documentVersionsResult,
      requiredRulesResult,
      reportSubmissionsResult,
      reportVersionsResult,
      reportDeliveriesResult,
      documentAuditResult,
      notificationPreferencesResult,
      notificationTemplatesResult,
      emailDeliveriesResult,
      orgNotificationSettingsResult,
      notificationQueueResult,
      communicationEventsResult,
      reminderStateResult,
      scheduledJobsResult,
      webhookEventsResult
    ] = await Promise.all([
      client.from("documents").select("*").eq("organization_id", orgId),
      client.from("document_versions").select("*").eq("organization_id", orgId),
      client.from("required_document_rules").select("*").eq("organization_id", orgId).eq("active", true),
      client.from("report_submissions").select("*").eq("organization_id", orgId),
      client.from("appraisal_report_versions").select("*").eq("organization_id", orgId),
      client.from("report_deliveries").select("*").eq("organization_id", orgId),
      client.from("document_audit_events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(250),
      client.from("notification_preferences").select("*").eq("organization_id", orgId),
      client.from("notification_templates").select("*").order("created_at", { ascending: false }),
      client.from("email_deliveries").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(250),
      client.from("organization_notification_settings").select("*").eq("organization_id", orgId),
      client.from("notification_queue").select("*").eq("organization_id", orgId).order("queued_at", { ascending: false }).limit(250),
      client.from("communication_events").select("*").eq("organization_id", orgId).order("occurred_at", { ascending: false }).limit(300),
      client.from("notification_reminder_state").select("*").eq("organization_id", orgId).order("last_triggered_at", { ascending: false }).limit(300),
      client.from("scheduled_jobs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      client.from("webhook_events").select("*").eq("organization_id", orgId).order("received_at", { ascending: false }).limit(100)
    ]);

    const documentRows = readRows("documents", documentsResult) as DocumentRow[];
    const versionRows = readRows("document versions", documentVersionsResult) as DocumentVersionRow[];
    const managedDocuments = documentRows.map((row) => mapManagedDocument(row, versionRows));
    const documentsByOrder = managedDocuments.reduce<Map<string, typeof managedDocuments>>((map, document) => {
      if (!document.orderId) return map;
      const list = map.get(document.orderId) ?? [];
      list.push(document);
      map.set(document.orderId, list);
      return map;
    }, new Map());
    mappedOrders = mappedOrders.map((order) => {
      const orderDocuments = documentsByOrder.get(order.id) ?? [];
      return {
        ...order,
        documents: orderDocuments.length,
        documentsList: orderDocuments.map((document) => ({
          id: document.id,
          name: document.fileName,
          type: document.category,
          status: document.status === "Archived" ? "Missing" : document.status === "Failed upload" ? "Needs review" : "Ready",
          uploadedBy: document.uploaderName,
          uploadedAt: document.uploadedAt
        }))
      };
    });
    const mappedOrganizations = organizationRows.map(mapOrganization);
    const activeOrganization = mappedOrganizations.find((organization) => organization.id === orgId) ?? mappedOrganizations[0];
    const reportVersions = activeOrganization
      ? (readRows("appraisal report versions", reportVersionsResult) as AppraisalReportVersionRow[]).flatMap((row) => {
          const order = ordersById.get(row.order_id);
          return order ? [mapAppraisalReportVersion(row, order, activeOrganization)] : [];
        })
      : [];

    return {
      organizations: mappedOrganizations,
      users: companyUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: orgId,
        title: user.role.replaceAll("_", " ")
      })),
      orders: mappedOrders,
      clients: clientRows.map((row) => mapClient(row, contactRows.filter((contact) => contact.client_id === row.id), feeRows.filter((fee) => fee.client_id === row.id))),
      companyUsers,
      appraisers: appraiserRows.map(mapAppraiser),
      vendors: vendorRows.map(mapVendor),
      vendorDocuments: [] as VendorDocument[],
      accountingEntries: accountingRows.map((row) => mapAccounting(row, ordersById, clientsById, appraisersById)),
      invoices: invoiceRows.map((row) => mapInvoice(row, clientsById)),
      invoiceSettings: [],
      invitations: [],
      publicOrderSettings: [],
      publicOrderRequests: [],
      notificationPreferences: (readRows("notification preferences", notificationPreferencesResult) as NotificationPreferenceRow[]).map(mapNotificationPreference),
      notificationTemplates: (readRows("notification templates", notificationTemplatesResult) as NotificationTemplateRow[])
        .filter((row) => !row.organization_id || row.organization_id === orgId)
        .map(mapNotificationTemplate),
      emailDeliveryRecords: (readRows("email deliveries", emailDeliveriesResult) as EmailDeliveryRow[]).map(mapEmailDelivery),
      organizationNotificationSettings: (readRows("organization notification settings", orgNotificationSettingsResult) as OrganizationNotificationSettingsRow[]).map(mapOrganizationNotificationSettings),
      communicationEvents: (readRows("communication events", communicationEventsResult) as CommunicationEventRow[]).map(mapCommunicationEvent),
      notificationReminderState: (readRows("notification reminder state", reminderStateResult) as NotificationReminderStateRow[]).map(mapReminderState),
      integrations: [],
      integrationLogs: [],
      managedDocuments,
      requiredDocumentRules: (readRows("required document rules", requiredRulesResult) as RequiredDocumentRuleRow[]).map(mapRequiredDocumentRule),
      orderMessages: [],
      revisionRequests: [],
      reportSubmissions: (readRows("report submissions", reportSubmissionsResult) as ReportSubmissionRow[]).map(mapReportSubmission),
      reportVersions,
      deliveryRecords: (readRows("report deliveries", reportDeliveriesResult) as ReportDeliveryRow[]).map(mapDeliveryRecord),
      documentAuditEvents: (readRows("document audit events", documentAuditResult) as DocumentAuditEventRow[]).map(mapDocumentAuditEvent),
      orderFormTemplate: mapOrderFormTemplate(templateRows[0]),
      calendarPreferences: calendarRows.map((row) => mapCalendarPreference(row, appraisersById)),
      automationRules: [],
      automationRuns: [],
      workflowTasks: [],
      notificationQueue: (readRows("notification queue", notificationQueueResult) as NotificationQueueRow[]).map(mapNotificationQueue),
      scheduledJobs: (readRows("scheduled jobs", scheduledJobsResult) as ScheduledJobRow[]).map(mapScheduledJob),
      webhookEvents: (readRows("webhook events", webhookEventsResult) as WebhookEventRow[]).map(mapWebhookEvent)
    };
  }

  async loadAuthContext(): Promise<CasAuthContext> {
    const client = this.getClient();
    const authUser = await getAuthenticatedUser(client);

    if (!authUser) {
      return {
        mode: "supabase",
        isDemo: false,
        user: null,
        organization: null,
        memberships: [],
        permissions: []
      };
    }

    const [profileResult, membersResult] = await Promise.all([
      client.from("user_profiles").select("*").eq("id", authUser.id).maybeSingle(),
      client.from("organization_members").select("*").eq("user_id", authUser.id)
    ]);

    const profile = readMaybe("current user profile", profileResult);
    const members = readRows("current organization memberships", membersResult);
    const roleIds = members.map((member) => member.role_id).filter(Boolean) as string[];
    const organizationIds = members.map((member) => member.organization_id);

    const [rolesResult, rolePermissionsResult, organizationsResult] = await Promise.all([
      roleIds.length ? client.from("roles").select("*").in("id", roleIds) : Promise.resolve({ data: [] as RoleRow[], error: null }),
      roleIds.length ? client.from("role_permissions").select("*").in("role_id", roleIds) : Promise.resolve({ data: [] as RolePermissionRow[], error: null }),
      organizationIds.length ? client.from("organizations").select("*").in("id", organizationIds) : Promise.resolve({ data: [] as OrganizationRow[], error: null })
    ]);

    const rolesById = new Map(readRows("membership roles", rolesResult).map((role) => [role.id, role]));
    const organizationsById = new Map(readRows("membership organizations", organizationsResult).map((organization) => [organization.id, mapOrganization(organization)]));
    const permissionRows = readRows("membership permissions", rolePermissionsResult);
    const memberships = members.flatMap((member) => {
      const role = member.role_id ? rolesById.get(member.role_id) : undefined;
      const organization = organizationsById.get(member.organization_id);
      if (!organization) return [];
      const permissions = permissionRows.filter((row) => row.role_id === member.role_id && row.enabled).map((row) => row.permission_key as PermissionKey);
      return [{ organization, role: toUserRole(role?.system_key), permissions, status: member.status }];
    });
    const activeMembership = memberships.find((membership) => membership.status === "active") ?? memberships[0];
    const role = activeMembership?.role ?? "office_staff";
    const fallbackPermissions = getPermissions({
      id: authUser.id,
      name: profile?.full_name ?? authUser.email ?? "CAS user",
      email: authUser.email ?? profile?.email ?? "",
      role,
      organizationId: activeMembership?.organization.id ?? "",
      title: role.replaceAll("_", " ")
    });
    const permissions = activeMembership?.permissions.length ? activeMembership.permissions : fallbackPermissions;

    return {
      mode: "supabase",
      isDemo: false,
      user: {
        id: authUser.id,
        name: profile?.full_name ?? authUser.email ?? "CAS user",
        email: profile?.email ?? authUser.email ?? "",
        role,
        organizationId: activeMembership?.organization.id ?? "",
        title: role.replaceAll("_", " ")
      },
      organization: activeMembership?.organization ?? null,
      memberships,
      permissions
    };
  }

  private async resolveActiveOrganizationId() {
    const client = this.getClient();
    const authUser = await getAuthenticatedUser(client);

    if (!authUser) return null;

    const result = await client.from("organization_members").select("organization_id").eq("user_id", authUser.id).eq("status", "active").limit(1);
    return readRows("active organization", result)[0]?.organization_id ?? null;
  }
}
