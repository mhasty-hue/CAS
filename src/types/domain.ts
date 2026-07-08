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
  | "customize_order_forms";

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  status: "Active" | "Invited" | "Pending docs" | "Under review" | "Approved" | "Suspended";
  primaryContact: string;
  email: string;
  phone: string;
  address: string;
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
  commissionSplitOverride?: number;
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
  commissionSplit: number;
  appraiserSplit: number;
  companyRevenue: number;
  status: "Paid" | "Unpaid" | "Ready to invoice" | "Payout pending";
  month: string;
  paidAt?: string;
};

export type Invoice = {
  id: string;
  client: string;
  amount: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  dueDate: string;
  orderCount: number;
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
