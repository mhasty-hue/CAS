export type OrganizationType = "appraisal_firm" | "solo_appraiser" | "amc" | "lender_client";

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "office_staff"
  | "appraiser"
  | "appraiser_manager"
  | "reviewer"
  | "amc_admin"
  | "amc_staff"
  | "client_user"
  | "solo_appraiser";

export type PermissionKey =
  | "view_all_orders"
  | "create_orders"
  | "assign_orders"
  | "edit_due_dates"
  | "upload_documents"
  | "delete_documents"
  | "see_accounting"
  | "see_appraiser_payouts"
  | "manage_users"
  | "manage_clients"
  | "review_reports"
  | "deliver_reports"
  | "invite_vendors"
  | "approve_vendors"
  | "manage_workflows"
  | "export_reports"
  | "view_own_orders_only"
  | "invite_users"
  | "manage_company_users"
  | "manage_accounting"
  | "customize_order_forms"
  | "view_accounting_summary"
  | "view_full_accounting"
  | "view_operational_dashboard"
  | "view_payroll_summary"
  | "view_receivables_summary"
  | "view_profitability_summary"
  | "prepare_payroll"
  | "approve_payroll"
  | "edit_commission_defaults"
  | "override_order_commission"
  | "edit_inspections"
  | "reopen_orders"
  | "generate_invoices"
  | "edit_invoices"
  | "mark_invoices_paid"
  | "view_own_pay"
  | "manage_public_ordering"
  | "manage_notification_settings"
  | "manage_integrations"
  | "upload_order_documents"
  | "view_internal_documents"
  | "view_client_documents"
  | "archive_documents"
  | "manage_document_visibility"
  | "deliver_final_report"
  | "view_vendor_compliance_documents"
  | "download_xml"
  | "view_workfile_documents"
  | "view_automations"
  | "create_automations"
  | "edit_automations"
  | "enable_automations"
  | "view_automation_history"
  | "manage_team_tasks"
  | "assign_tasks"
  | "view_notification_logs"
  | "retry_failed_notifications";

export type Organization = {
  id: string;
  name: string;
  slug?: string;
  type: OrganizationType;
  status: "Active" | "Invited" | "Pending docs" | "Under review" | "Approved" | "Suspended";
  primaryContact: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  brandColor?: string;
};

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  title: string;
  appraiserName?: string;
  clientName?: string;
};

export type OrderStatus =
  | "New"
  | "Unassigned"
  | "Assigned"
  | "Accepted"
  | "Inspection Scheduled"
  | "Inspected"
  | "Report In Progress"
  | "Submitted"
  | "In Review"
  | "Revisions Needed"
  | "Revision Sent to Appraiser"
  | "Ready for Delivery"
  | "Delivered"
  | "Completed"
  | "On Hold"
  | "Cancelled";

export type Priority = "Rush" | "High" | "Standard" | "Watch";

export type TimelineItem = {
  label: string;
  detail: string;
  at: string;
  actor: string;
};

export type Note = {
  id: string;
  author: string;
  body: string;
  visibility: "internal" | "client" | "appraiser";
  createdAt: string;
};

export type OrderDocument = {
  id: string;
  name: string;
  type: string;
  status: "Ready" | "Missing" | "Needs review" | "Expired";
  uploadedBy: string;
  uploadedAt: string;
};

export type DocumentCategory =
  | "Engagement letter"
  | "Appraisal order"
  | "Purchase contract"
  | "Amendments"
  | "Disclosures"
  | "Property information"
  | "Comparable data"
  | "Photos"
  | "Sketch"
  | "Map"
  | "Appraisal report PDF"
  | "Appraisal XML"
  | "UAD 3.6 data package"
  | "UCDP submission"
  | "UCDP findings"
  | "ENV file"
  | "Workfile"
  | "Invoice"
  | "W-9"
  | "E&O insurance"
  | "Appraiser license"
  | "Company license"
  | "Revision request"
  | "Revision response"
  | "Delivery receipt"
  | "Other";

export type DocumentSource =
  | "Internal staff upload"
  | "Appraiser upload"
  | "Reviewer upload"
  | "Client/lender upload"
  | "AMC upload"
  | "Public order upload"
  | "LOS import"
  | "System generated"
  | "Email ingestion placeholder";

export type DocumentVisibility =
  | "Organization internal"
  | "Assigned appraiser"
  | "Reviewer"
  | "AMC"
  | "Lender/client"
  | "Vendor"
  | "Public requester"
  | "Delivery recipient";

export type ManagedDocumentStatus = "Missing" | "Uploaded" | "Needs classification" | "Superseded" | "Final" | "Archived" | "Failed upload";

export type DocumentVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  checksum?: string;
  changeNote?: string;
};

export type ManagedDocument = {
  id: string;
  organizationId: string;
  orderId?: string;
  vendorId?: string;
  uploaderId: string;
  uploaderName: string;
  category: DocumentCategory;
  fileName: string;
  displayName: string;
  fileType: string;
  fileSizeBytes: number;
  storagePath: string;
  versionNumber: number;
  parentDocumentId?: string;
  visibility: DocumentVisibility;
  source: DocumentSource;
  uploadedAt: string;
  description: string;
  tags: string[];
  status: ManagedDocumentStatus;
  checksum?: string;
  auditMetadata: {
    createdBy: string;
    lastAction: string;
    lastActionAt: string;
    virusScanStatus: "Not scanned" | "Queued" | "Passed" | "Failed";
    duplicateDetection: "Not checked" | "Unique" | "Possible duplicate";
  };
  versions: DocumentVersion[];
};

export type AssignmentHistoryItem = {
  id: string;
  appraiser: string;
  action: "Assigned" | "Reassigned" | "Accepted" | "Declined";
  actor: string;
  note: string;
  at: string;
};

export type RevisionLogItem = {
  id: string;
  requestedBy: string;
  summary: string;
  status: "Open" | "Sent to appraiser" | "Resolved";
  requestedAt: string;
};

export type MessageChannel =
  | "Internal note"
  | "Appraiser message"
  | "Reviewer comment"
  | "AMC message"
  | "Lender/client message"
  | "Revision request"
  | "Revision response"
  | "System activity";

export type OrderMessage = {
  id: string;
  organizationId: string;
  orderId: string;
  sender: string;
  senderRole: UserRole;
  recipients: string[];
  visibility: DocumentVisibility | "Internal team";
  body: string;
  attachmentIds: string[];
  createdAt: string;
  editedAt?: string;
  readBy: string[];
  pinned: boolean;
  channel: MessageChannel;
  relatedRevisionId?: string;
  relatedDocumentId?: string;
  assignedFollowUpOwner?: string;
  followUpDueDate?: string;
  auditMetadata: {
    createdBy: string;
    lastEditedBy?: string;
    externalDelivery?: "Not sent" | "Queued" | "Sent";
  };
};

export type RevisionStatus = "New" | "Assigned" | "In Progress" | "Response Submitted" | "Reviewer Follow-Up" | "Approved" | "Closed" | "Rejected/Clarification Needed";

export type RevisionItem = {
  id: string;
  label: string;
  relatedPageSection: string;
  relatedDocumentId?: string;
  response?: string;
  completed: boolean;
  attachmentIds: string[];
  reviewerApproved: boolean;
  conversationMessageIds: string[];
  history: Array<{ at: string; actor: string; action: string }>;
};

export type RevisionRequest = {
  id: string;
  organizationId: string;
  orderId: string;
  requestor: string;
  receivedAt: string;
  source: "Reviewer" | "Client" | "AMC" | "Lender" | "System";
  category: string;
  priority: Priority;
  dueDate: string;
  clientVisibleWording: string;
  internalReviewerWording: string;
  assignedAppraiser: string;
  status: RevisionStatus;
  items: RevisionItem[];
  auditTrail: AuditTrailItem[];
};

export type ReportSubmission = {
  id: string;
  organizationId: string;
  orderId: string;
  submittedBy: string;
  submittedAt: string;
  reportPdfDocumentId?: string;
  xmlDocumentId?: string;
  envDocumentId?: string;
  invoiceDocumentId?: string;
  supportingDocumentIds: string[];
  submissionNote: string;
  certificationAccepted: boolean;
  status: "Draft" | "Submitted" | "Returned" | "Approved";
};

export type DeliveryRecord = {
  id: string;
  organizationId: string;
  orderId: string;
  recipientName: string;
  recipientEmail: string;
  fileIds: string[];
  deliveryNote: string;
  secureLink: string;
  deliveredAt?: string;
  status: "Ready" | "Delivered" | "Viewed" | "Expired" | "Failed";
  deliveryReceiptDocumentId?: string;
  losHookStatus: "Not configured" | "Queued" | "Sent" | "Failed";
  emailHookStatus: "Development log" | "Queued" | "Sent" | "Failed";
};

export type RequiredDocumentRule = {
  id: string;
  organizationId: string;
  productType?: string;
  client?: string;
  loanType?: string;
  appraisalPurpose?: string;
  workflowStage: "Intake" | "Assignment" | "Submission" | "Review" | "Delivery" | "Vendor approval";
  category: DocumentCategory;
  label: string;
  required: boolean;
};

export type DocumentAuditEvent = {
  id: string;
  organizationId: string;
  orderId?: string;
  documentId?: string;
  messageId?: string;
  revisionId?: string;
  event: "Uploaded" | "Viewed" | "Downloaded" | "Renamed" | "Visibility changed" | "Version replaced" | "Archived" | "Restored" | "Deleted" | "Delivered" | "Message sent" | "Message edited" | "Revision created" | "Revision responded to" | "Revision approved";
  actor: string;
  at: string;
  detail: string;
};

export type AuditTrailItem = {
  id: string;
  action: string;
  actor: string;
  at: string;
};

export type ReviewItem = {
  label: string;
  category: string;
  complete: boolean;
  severity?: "warning" | "blocker";
};

export type ReportStandard = "legacy_uad_2_6" | "uad_3_6" | "non_gse" | "other";
export type SubmissionFormat = "PDF" | "MISMO XML" | "UAD 3.6 data package" | "ENV" | "Other";

export type ReportMetadata = {
  reportStandard: ReportStandard;
  reportSchemaVersion: string;
  reportType: string;
  assignmentType: string;
  inspectionScope: "Interior and exterior" | "Exterior only" | "Desktop/no physical inspection" | "Other";
  propertyType: string;
  submissionFormat: readonly SubmissionFormat[];
  xmlVersion?: string;
  mismoVersion?: string;
  ucdpSubmissionStatus?: "Not configured" | "Ready" | "Submitted" | "Accepted" | "Warnings" | "Rejected";
  ucdpFindings?: string[];
};

export type InspectionInfo = {
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  timeZone: string;
  completedAt?: string;
  inspectionType: "Interior and exterior" | "Exterior only" | "Desktop/no physical inspection" | "Other";
  accessContact: string;
  accessNotes: string;
  rescheduleReason?: string;
  cancellationReason?: string;
  calendarSyncStatus: "Not synced" | "Queued" | "Synced" | "Failed";
  internalNote?: string;
};

export type PayrollCalculationSource =
  | "Fixed order payout"
  | "Order split override"
  | "Appraiser default split"
  | "Organization default split"
  | "Manual accounting adjustment"
  | "Requires review";

export type PayrollSnapshot = {
  grossFee: number;
  techFee: number;
  otherNonCommissionableFees: number;
  commissionableBase: number;
  defaultAppraiserSplit?: number;
  orderSplitOverride?: number;
  fixedPayoutOverride?: number;
  calculatedPayout?: number;
  finalPayout?: number;
  calculationSource: PayrollCalculationSource;
  manualAdjustmentReason?: string;
  approvedBy?: string;
  approvedDate?: string;
  locked?: boolean;
};

export type Order = {
  id: string;
  fileNumber: string;
  productType: string;
  client: string;
  amc: string;
  borrower: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  appraiser: string;
  reviewer: string;
  orderedDate: string;
  dueDate: string;
  inspectionDate?: string;
  inspection?: InspectionInfo;
  status: OrderStatus;
  priority: Priority;
  fee: number;
  techFee: number;
  appraiserPayout: number;
  documents: number;
  lastUpdate: string;
  nextAction: string;
  loanType: string;
  occupancy: string;
  propertyType: string;
  contactName: string;
  contactPhone: string;
  accessInfo: string;
  assignmentPreference: string;
  lenderContact: string;
  parcelNumber: string;
  timeline: TimelineItem[];
  notes: Note[];
  clientComments: Note[];
  documentsList: OrderDocument[];
  assignmentHistory: AssignmentHistoryItem[];
  revisionLog: RevisionLogItem[];
  auditTrail: AuditTrailItem[];
  reviewItems: ReviewItem[];
  reportMetadata?: ReportMetadata;
  commissionSplitOverride?: number;
  fixedAppraiserPayoutOverride?: number;
  otherNonCommissionableFees?: number;
  payrollSnapshot?: PayrollSnapshot;
  paidAt?: string;
};

export type AppraiserProfile = {
  id: string;
  name: string;
  role: "Staff" | "Panel" | "Solo";
  counties: string[];
  capacity: number;
  activeOrders: number;
  dueThisWeek: number;
  avgTurnDays: number;
  revisionRate: number;
  payoutDue: number;
  licenseStatus: "Current" | "Expiring" | "Missing";
  defaultCommissionSplit?: number;
};

export type ReviewerProfile = {
  id: string;
  name: string;
  queue: number;
  specialties: string[];
};

export type VendorProfile = {
  id: string;
  company: string;
  contact: string;
  distance: number;
  coverage: string[];
  coverageZips?: string[];
  radiusMiles?: number;
  officeAddress?: string;
  roster?: string[];
  specialties: string[];
  status: "Invited" | "Pending documents" | "Under review" | "Approved" | "Suspended" | "Inactive";
  turnTime: number;
  capacity: number;
  workload?: number;
  rating?: number;
  feeSheet?: Array<{ product: string; fee: number; turnDays: number }>;
  documents: {
    w9: "Current" | "Missing" | "Expired";
    eo: "Current" | "Missing" | "Expired";
    license: "Current" | "Missing" | "Expired";
  };
};

export type VendorDocument = {
  id: string;
  vendorId: string;
  type: "License" | "E&O" | "W-9" | "Fee sheet";
  status: "Approved" | "Missing" | "Expired" | "Needs review";
  uploadedAt: string;
  expiresAt?: string;
};

export type AccountingEntry = {
  id: string;
  orderId: string;
  client: string;
  appraiser: string;
  productType: string;
  county: string;
  completedAt: string;
  fee: number;
  techFee: number;
  otherNonCommissionableFees?: number;
  commissionSplit: number;
  defaultAppraiserSplit?: number;
  orderSplitOverride?: number;
  fixedPayoutOverride?: number;
  commissionableBase?: number;
  calculatedPayout?: number;
  finalPayout?: number;
  calculationSource?: PayrollCalculationSource;
  manualAdjustmentReason?: string;
  approvedBy?: string;
  approvedDate?: string;
  locked?: boolean;
  payrollSnapshot?: PayrollSnapshot;
  appraiserSplit: number;
  companyRevenue: number;
  status: "Paid" | "Unpaid" | "Ready to invoice" | "Payout pending";
  month: string;
  paidAt?: string;
};

export type Invoice = {
  id: string;
  organizationId?: string;
  orderId?: string;
  invoiceNumber?: string;
  client: string;
  billingParty?: string;
  billToContact?: string;
  lineItems?: InvoiceLineItem[];
  amount: number;
  subtotal?: number;
  taxAmount?: number;
  balanceDue?: number;
  status: InvoiceStatus;
  dueDate: string;
  orderCount: number;
  paymentTerms?: string;
  notes?: string;
  draftDate?: string;
  issuedDate?: string;
  sentDate?: string;
  viewedDate?: string;
  paidDate?: string;
  partialPayment?: number;
};

export type InvoiceStatus = "Draft" | "Issued" | "Sent" | "Viewed" | "Partially Paid" | "Paid" | "Overdue" | "Void";

export type InvoiceLineItem = {
  id: string;
  label: string;
  description?: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  type: "Appraisal fee" | "Technology fee" | "Rush fee" | "Additional service" | "Credit" | "Tax";
};

export type InvoiceSettings = {
  id: string;
  organizationId: string;
  companyName: string;
  companyAddress: string;
  logoUrl?: string;
  taxId?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultPaymentTerms: string;
  defaultInvoiceNotes: string;
  paymentInstructions: string;
};

export type ReviewQueueItem = {
  id: string;
  orderId: string;
  reviewer: string;
  submittedAt: string;
  status: "Ready for review" | "In review" | "Returned" | "Approved";
  checklistOpen: number;
};

export type ClientContact = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
};

export type ClientProfile = {
  id: string;
  name: string;
  organizationId: string;
  status: "Active" | "Inactive";
  defaultTurnDays: number;
  contacts: ClientContact[];
  notes: string;
  defaultFees: Array<{ productType: string; fee: number }>;
};

export type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Pending invite" | "Inactive";
  permissions: PermissionKey[];
  lastActive: string;
};

export type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked";

export type OrganizationInvitation = {
  id: string;
  organizationId: string;
  email: string;
  invitedName: string;
  role: UserRole;
  permissions: PermissionKey[];
  status: InvitationStatus;
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  note?: string;
};

export type PublicOrderPurpose =
  | "Estate"
  | "Divorce"
  | "Tax appeal"
  | "Pre-listing"
  | "Purchase"
  | "Refinance"
  | "PMI removal"
  | "Litigation"
  | "Financial planning"
  | "Date-of-death appraisal"
  | "Other";

export type PublicOrderSettings = {
  id: string;
  organizationId: string;
  enabled: boolean;
  publicSlug: string;
  buttonLabel: string;
  brandName: string;
  brandColor: string;
  logoUrl?: string;
  confirmationMessage: string;
  notificationRecipients: string[];
  requiredFields: string[];
  customQuestions: Array<{ id: string; label: string; required: boolean }>;
  updatedAt: string;
};

export type PublicOrderRequestStatus = "Pending review" | "Converted" | "Declined" | "Archived";

export type PublicOrderRequest = {
  id: string;
  organizationId: string;
  requesterName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: string;
  purpose: PublicOrderPurpose;
  intendedUse: string;
  ownerBorrowerName: string;
  accessContact: string;
  preferredContactMethod: "Email" | "Phone" | "Text";
  requestedTiming: string;
  comments: string;
  consentAccepted: boolean;
  documentCount: number;
  status: PublicOrderRequestStatus;
  submittedAt: string;
  convertedOrderId?: string;
  auditTrail: AuditTrailItem[];
};

export type OrderFormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "currency" | "upload";
  required: boolean;
  options?: string[];
};

export type OrderFormSection = {
  id: string;
  title: string;
  hidden: boolean;
  fields: OrderFormField[];
};

export type OrderFormTemplate = {
  id: string;
  name: string;
  ownerType: "default" | "company" | "solo_appraiser";
  organizationId?: string;
  updatedAt: string;
  sections: OrderFormSection[];
};

export type CalendarPreference = {
  id: string;
  appraiser: string;
  googleConnected: boolean;
  syncInspections: boolean;
  syncDueDates: boolean;
};

export type ChartPoint = {
  label: string;
  current: number;
  previous?: number;
};

export type Kpi = {
  label: string;
  value: string;
  change: string;
  tone: "neutral" | "good" | "warn" | "bad";
};

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning" | "success" | "danger";
  time: string;
};

export type NotificationEventKey =
  | "new_order_received"
  | "public_order_request_submitted"
  | "order_assigned"
  | "appraiser_accepted"
  | "appraiser_declined"
  | "inspection_scheduled"
  | "inspection_rescheduled"
  | "inspection_completed"
  | "report_submitted"
  | "report_entered_review"
  | "revisions_requested"
  | "revision_response_received"
  | "report_approved"
  | "report_delivered"
  | "order_completed"
  | "order_placed_on_hold"
  | "order_cancelled"
  | "invoice_generated"
  | "invoice_paid"
  | "vendor_compliance_document_expiring"
  | "license_expiring"
  | "eo_expiring"
  | "w9_missing"
  | "due_date_warning"
  | "past_due_warning"
  | "new_internal_mention"
  | "new_client_message"
  | "new_appraiser_message"
  | "new_reviewer_comment"
  | "revision_requested"
  | "revision_response_submitted"
  | "updated_report_uploaded"
  | "final_report_ready_for_delivery"
  | "final_report_delivered"
  | "document_requested"
  | "requested_document_uploaded";

export type NotificationPreference = {
  id: string;
  organizationId: string;
  userId?: string;
  eventKey: NotificationEventKey;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  cadence: "Immediate" | "Daily digest";
};

export type NotificationTemplate = {
  eventKey: NotificationEventKey;
  label: string;
  subject: string;
  preview: string;
  defaultAudience: string;
};

export type EmailDeliveryRecord = {
  id: string;
  organizationId: string;
  eventKey: NotificationEventKey;
  recipient: string;
  subject: string;
  status: "Logged" | "Queued" | "Sent" | "Failed";
  provider: "development-log" | "resend" | "postmark" | "sendgrid" | "custom";
  createdAt: string;
  error?: string;
};

export type LosProviderKey = "lendingqb_meridianlink" | "encompass" | "byte" | "calyx" | "empower" | "other";

export type IntegrationStatus = "Not connected" | "Connected" | "Needs attention" | "Error" | "Paused";

export type IntegrationSetting = {
  id: string;
  organizationId: string;
  provider: LosProviderKey;
  providerLabel: string;
  status: IntegrationStatus;
  lastSyncAt?: string;
  credentialReference?: string;
  syncStatus: "Idle" | "Syncing" | "Retry scheduled" | "Failed";
  retryCount: number;
  fieldMappings: IntegrationFieldMapping[];
  statusMappings: IntegrationStatusMapping[];
  documentMappings: IntegrationDocumentMapping[];
};

export type IntegrationFieldMapping = {
  id: string;
  externalField: string;
  casField: string;
  required: boolean;
};

export type IntegrationStatusMapping = {
  id: string;
  externalStatus: string;
  casStatus: OrderStatus;
};

export type IntegrationDocumentMapping = {
  id: string;
  externalDocumentType: string;
  casDocumentType: string;
  direction: "Import" | "Export" | "Both";
};

export type IntegrationLog = {
  id: string;
  integrationId: string;
  event: string;
  status: "Success" | "Warning" | "Error";
  detail: string;
  createdAt: string;
};

export type AutomationTrigger =
  | "order_created"
  | "public_request_submitted"
  | "order_assigned"
  | "assignment_accepted"
  | "assignment_declined"
  | "inspection_scheduled"
  | "inspection_completed"
  | "status_changed"
  | "due_within"
  | "past_due"
  | "report_submitted"
  | "review_assigned"
  | "revision_requested"
  | "revision_response_submitted"
  | "report_approved"
  | "report_delivered"
  | "order_completed"
  | "invoice_generated"
  | "invoice_due_soon"
  | "invoice_overdue"
  | "invoice_paid"
  | "required_document_missing"
  | "vendor_compliance_expiring"
  | "vendor_compliance_expired"
  | "external_message_received"
  | "follow_up_due";

export type AutomationConditionField =
  | "product_type"
  | "client"
  | "appraiser"
  | "reviewer"
  | "loan_type"
  | "purpose"
  | "county"
  | "state"
  | "priority"
  | "current_status"
  | "report_standard"
  | "due_proximity"
  | "missing_documents"
  | "workload"
  | "vendor_compliance"
  | "invoice_status";

export type AutomationOperator = "equals" | "not_equals" | "contains" | "within_days" | "greater_than" | "less_than" | "is" | "is_missing";

export type AutomationActionType =
  | "change_status"
  | "assign_appraiser"
  | "assign_reviewer"
  | "create_task"
  | "create_follow_up"
  | "send_in_app_notification"
  | "queue_email"
  | "add_internal_note"
  | "add_client_message"
  | "request_documents"
  | "create_calendar_event"
  | "create_accounting_entry"
  | "create_invoice_draft"
  | "escalate_priority"
  | "flag_risk"
  | "notify_roles"
  | "write_audit_log"
  | "call_webhook";

export type AutomationCondition = {
  id: string;
  field: AutomationConditionField;
  operator: AutomationOperator;
  value: string;
  label: string;
};

export type AutomationAction = {
  id: string;
  type: AutomationActionType;
  target: string;
  value: string;
  label: string;
};

export type AutomationRunStep = {
  id: string;
  actionLabel: string;
  status: "Success" | "Skipped" | "Failed";
  detail: string;
  at: string;
};

export type AutomationRun = {
  id: string;
  ruleId: string;
  organizationId: string;
  status: "Success" | "Partial" | "Failed";
  startedAt: string;
  finishedAt?: string;
  relatedOrderId?: string;
  relatedTaskId?: string;
  relatedInvoiceId?: string;
  steps: AutomationRunStep[];
};

export type AutomationRule = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  triggerLabel: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  executionOrder: number;
  lastRunAt?: string;
  runCount: number;
  failureCount: number;
  createdBy: string;
  createdAt: string;
  auditMetadata: {
    createdBy: string;
    updatedBy?: string;
    updatedAt?: string;
    archived?: boolean;
  };
};

export type WorkflowTaskStatus = "Open" | "In Progress" | "Waiting" | "Completed" | "Cancelled";
export type WorkflowTaskSource = "Manual" | "Automation";

export type WorkflowTask = {
  id: string;
  organizationId: string;
  relatedOrderId?: string;
  relatedClient?: string;
  relatedVendorId?: string;
  relatedInvoiceId?: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedRole?: UserRole;
  createdBy: string;
  dueDate: string;
  priority: Priority;
  status: WorkflowTaskStatus;
  source: WorkflowTaskSource;
  automationRuleId?: string;
  completedAt?: string;
  auditHistory: AuditTrailItem[];
};

export type NotificationQueueStatus = "Pending" | "Sent" | "Failed" | "Read";
export type NotificationQueueChannel = "In-app" | "Email" | "Digest";

export type NotificationQueueItem = {
  id: string;
  organizationId: string;
  recipient: string;
  recipientRole?: UserRole;
  eventType: NotificationEventKey | string;
  channel: NotificationQueueChannel;
  status: NotificationQueueStatus;
  attemptCount: number;
  failureReason?: string;
  relatedOrderId?: string;
  relatedTaskId?: string;
  relatedInvoiceId?: string;
  relatedVendorId?: string;
  digestGroup?: string;
  queuedAt: string;
  sentAt?: string;
  readAt?: string;
  subject: string;
  preview: string;
};

export type ScheduledJob = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  jobType:
    | "Due-date reminders"
    | "Past-due escalation"
    | "Invoice reminders"
    | "Compliance reminders"
    | "Digest sender"
    | "Follow-up escalation"
    | "Payroll readiness"
    | "Stale review sweep";
  enabled: boolean;
  schedule: string;
  provider: "CAS demo scheduler" | "Vercel Cron" | "Supabase scheduled function";
  lastRunAt?: string;
  nextRunAt?: string;
  status: "Idle" | "Queued" | "Running" | "Failed";
  runCount: number;
};

export type WebhookEvent = {
  id: string;
  organizationId: string;
  provider: string;
  eventType: string;
  status: "Received" | "Processed" | "Failed" | "Ignored";
  receivedAt: string;
  processedAt?: string;
  payloadSummary: string;
  relatedOrderId?: string;
};

export type OrderIntakePrefill = {
  sourceName: string;
  sourceType: "PDF" | "CSV";
  confidence: number;
  fields: Array<{
    key: string;
    label: string;
    value: string;
    confidence: number;
  }>;
  warnings: string[];
  appliedAt: string;
};
