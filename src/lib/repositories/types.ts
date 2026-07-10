import type {
  AccountingEntry,
  AppraiserProfile,
  CalendarPreference,
  ClientProfile,
  CompanyUser,
  DeliveryRecord,
  DocumentAuditEvent,
  EmailDeliveryRecord,
  IntegrationLog,
  IntegrationSetting,
  Invoice,
  InvoiceSettings,
  ManagedDocument,
  NotificationPreference,
  NotificationTemplate,
  Order,
  OrderMessage,
  OrderFormTemplate,
  Organization,
  OrganizationInvitation,
  PermissionKey,
  PortalUser,
  PublicOrderRequest,
  PublicOrderSettings,
  ReportSubmission,
  RequiredDocumentRule,
  RevisionRequest,
  VendorDocument,
  VendorProfile
} from "@/types/domain";

export type CasDataSourceMode = "demo" | "supabase";

export type CasBootstrapData = {
  organizations: Organization[];
  users: PortalUser[];
  orders: Order[];
  clients: ClientProfile[];
  companyUsers: CompanyUser[];
  appraisers: AppraiserProfile[];
  vendors: VendorProfile[];
  vendorDocuments: VendorDocument[];
  accountingEntries: AccountingEntry[];
  invoices: Invoice[];
  invoiceSettings: InvoiceSettings[];
  invitations: OrganizationInvitation[];
  publicOrderSettings: PublicOrderSettings[];
  publicOrderRequests: PublicOrderRequest[];
  notificationPreferences: NotificationPreference[];
  notificationTemplates: NotificationTemplate[];
  emailDeliveryRecords: EmailDeliveryRecord[];
  integrations: IntegrationSetting[];
  integrationLogs: IntegrationLog[];
  managedDocuments: ManagedDocument[];
  requiredDocumentRules: RequiredDocumentRule[];
  orderMessages: OrderMessage[];
  revisionRequests: RevisionRequest[];
  reportSubmissions: ReportSubmission[];
  deliveryRecords: DeliveryRecord[];
  documentAuditEvents: DocumentAuditEvent[];
  orderFormTemplate: OrderFormTemplate;
  calendarPreferences: CalendarPreference[];
};

export type CasAuthMembership = {
  organization: Organization;
  role: PortalUser["role"];
  permissions: PermissionKey[];
  status: "invited" | "active" | "suspended";
};

export type CasAuthContext = {
  mode: CasDataSourceMode;
  isDemo: boolean;
  user: PortalUser | null;
  organization: Organization | null;
  memberships: CasAuthMembership[];
  permissions: PermissionKey[];
};

export interface CasRepository {
  mode: CasDataSourceMode;
  loadBootstrapData(organizationId?: string): Promise<CasBootstrapData>;
  loadAuthContext(): Promise<CasAuthContext>;
}
