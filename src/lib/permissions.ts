import type { PermissionKey, PortalUser, UserRole } from "@/types/domain";

const dashboardVisibilityPermissions: PermissionKey[] = [
  "view_operational_dashboard",
  "view_accounting_summary",
  "view_payroll_summary",
  "view_receivables_summary",
  "view_profitability_summary"
];
const fullAccountingPermissions: PermissionKey[] = [
  "see_accounting",
  "view_accounting_summary",
  "view_full_accounting",
  "prepare_payroll",
  "approve_payroll",
  "edit_commission_defaults",
  "override_order_commission",
  "view_payroll_summary",
  "view_receivables_summary",
  "view_profitability_summary",
  "generate_invoices",
  "edit_invoices",
  "mark_invoices_paid"
];
const appraiserPayPermissions: PermissionKey[] = ["see_appraiser_payouts", "view_own_pay"];
const invoicePermissions: PermissionKey[] = ["generate_invoices", "edit_invoices", "mark_invoices_paid"];
const platformAdminPermissions: PermissionKey[] = ["manage_public_ordering", "manage_notification_settings", "manage_integrations"];
const documentManagerPermissions: PermissionKey[] = [
  "upload_order_documents",
  "view_internal_documents",
  "view_client_documents",
  "archive_documents",
  "manage_document_visibility",
  "deliver_final_report",
  "view_vendor_compliance_documents",
  "download_xml",
  "view_workfile_documents"
];
const automationAdminPermissions: PermissionKey[] = [
  "view_automations",
  "create_automations",
  "edit_automations",
  "enable_automations",
  "view_automation_history",
  "view_notification_logs",
  "retry_failed_notifications"
];
const taskManagerPermissions: PermissionKey[] = ["manage_team_tasks", "assign_tasks"];

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  super_admin: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
    "edit_inspections",
    "reopen_orders",
    "upload_documents",
    "delete_documents",
    "see_accounting",
    "see_appraiser_payouts",
    "manage_users",
    "manage_clients",
    "invite_users",
    "manage_company_users",
    "manage_accounting",
    "customize_order_forms",
    "review_reports",
    "deliver_reports",
    "invite_vendors",
    "approve_vendors",
    "manage_workflows",
    "export_reports",
    ...fullAccountingPermissions,
    ...dashboardVisibilityPermissions,
    ...platformAdminPermissions,
    ...documentManagerPermissions,
    ...automationAdminPermissions,
    ...taskManagerPermissions
  ],
  company_admin: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
    "edit_inspections",
    "reopen_orders",
    "upload_documents",
    "delete_documents",
    "see_accounting",
    "see_appraiser_payouts",
    "manage_users",
    "manage_clients",
    "review_reports",
    "deliver_reports",
    "manage_workflows",
    "export_reports",
    "invite_users",
    "manage_company_users",
    "manage_accounting",
    "customize_order_forms",
    ...fullAccountingPermissions,
    ...dashboardVisibilityPermissions,
    ...platformAdminPermissions,
    ...documentManagerPermissions,
    ...automationAdminPermissions,
    ...taskManagerPermissions
  ],
  office_staff: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
    "upload_documents",
    "upload_order_documents",
    "view_internal_documents",
    "view_client_documents",
    "archive_documents",
    "manage_document_visibility",
    "deliver_final_report",
    "download_xml",
    "manage_clients",
    "view_operational_dashboard",
    "edit_inspections",
    "export_reports",
    "view_automations",
    "view_automation_history",
    "manage_team_tasks",
    "assign_tasks",
    "view_notification_logs"
  ],
  appraiser_manager: [
    "view_all_orders",
    "assign_orders",
    "upload_documents",
    "upload_order_documents",
    "view_internal_documents",
    "view_workfile_documents",
    "download_xml",
    "see_appraiser_payouts",
    "view_accounting_summary",
    "view_own_pay",
    "view_operational_dashboard",
    "manage_users",
    "export_reports",
    "manage_team_tasks",
    "assign_tasks",
    "view_notification_logs"
  ],
  appraiser: ["upload_documents", "upload_order_documents", "view_workfile_documents", "download_xml", "see_appraiser_payouts", "view_own_pay", "view_payroll_summary", "view_operational_dashboard", "edit_inspections", "view_own_orders_only"],
  solo_appraiser: [
    "create_orders",
    "assign_orders",
    "upload_documents",
    ...documentManagerPermissions,
    "see_accounting",
    "see_appraiser_payouts",
    "manage_accounting",
    ...fullAccountingPermissions,
    ...dashboardVisibilityPermissions,
    "edit_inspections",
    "reopen_orders",
    "manage_users",
    "customize_order_forms",
    "manage_public_ordering",
    "manage_notification_settings",
    "manage_integrations",
    "view_own_orders_only",
    ...automationAdminPermissions,
    ...taskManagerPermissions
  ],
  reviewer: ["view_all_orders", "upload_documents", "upload_order_documents", "view_internal_documents", "view_workfile_documents", "download_xml", "review_reports", "deliver_reports", "deliver_final_report", "view_operational_dashboard"],
  amc_admin: [
    "view_all_orders",
    "create_orders",
    "upload_documents",
    "upload_order_documents",
    "view_client_documents",
    "view_vendor_compliance_documents",
    "deliver_final_report",
    "invite_vendors",
    "approve_vendors",
    "manage_users",
    "view_operational_dashboard",
    "generate_invoices",
    "edit_invoices",
    "manage_integrations",
    "export_reports",
    ...automationAdminPermissions,
    ...taskManagerPermissions
  ],
  amc_staff: ["view_all_orders", "create_orders", "upload_documents", "upload_order_documents", "view_client_documents", "view_vendor_compliance_documents", "invite_vendors", "export_reports", "view_operational_dashboard", "manage_team_tasks", "assign_tasks", "view_notification_logs"],
  client_user: ["create_orders", "upload_documents", "upload_order_documents", "view_client_documents", "view_operational_dashboard", "view_own_orders_only"]
};

export function getPermissions(user: PortalUser) {
  return rolePermissions[user.role] ?? [];
}

export function hasPermission(user: PortalUser, permission: PermissionKey) {
  return getPermissions(user).includes(permission);
}

export function canViewAccounting(user: PortalUser) {
  return [
    "see_accounting",
    "view_accounting_summary",
    "view_full_accounting",
    "see_appraiser_payouts",
    "view_own_pay"
  ].some((permission) => hasPermission(user, permission as PermissionKey));
}

export function canCreateOrders(user: PortalUser) {
  return hasPermission(user, "create_orders");
}

export function canAssignOrders(user: PortalUser) {
  return hasPermission(user, "assign_orders");
}

export function canReviewReports(user: PortalUser) {
  return hasPermission(user, "review_reports");
}

export function canManageUsers(user: PortalUser) {
  return hasPermission(user, "manage_users");
}

export function canInviteUsers(user: PortalUser) {
  return hasPermission(user, "invite_users");
}

export function canManageCompanyUsers(user: PortalUser) {
  return hasPermission(user, "manage_company_users");
}

export function canManageAccounting(user: PortalUser) {
  return hasPermission(user, "manage_accounting");
}

export function canManageClients(user: PortalUser) {
  return hasPermission(user, "manage_clients");
}

export function canCustomizeOrderForms(user: PortalUser) {
  return hasPermission(user, "customize_order_forms");
}

export function canInviteVendors(user: PortalUser) {
  return hasPermission(user, "invite_vendors");
}

export function canApproveVendors(user: PortalUser) {
  return hasPermission(user, "approve_vendors");
}

export function canDeliverReports(user: PortalUser) {
  return hasPermission(user, "deliver_reports");
}

export function canViewAllOrders(user: PortalUser) {
  return hasPermission(user, "view_all_orders");
}

export function canViewOwnOrdersOnly(user: PortalUser) {
  return hasPermission(user, "view_own_orders_only") && !canViewAllOrders(user);
}

export function canViewAccountingSummary(user: PortalUser) {
  return hasPermission(user, "view_accounting_summary") || canViewFullAccounting(user);
}

export function canViewOperationalDashboard(user: PortalUser) {
  return hasPermission(user, "view_operational_dashboard") || canViewAllOrders(user) || canViewOwnOrdersOnly(user);
}

export function canViewPayrollSummary(user: PortalUser) {
  return hasPermission(user, "view_payroll_summary") || canManageAccounting(user) || canViewOwnPay(user);
}

export function canViewReceivablesSummary(user: PortalUser) {
  return hasPermission(user, "view_receivables_summary") || canManageAccounting(user);
}

export function canViewProfitabilitySummary(user: PortalUser) {
  return hasPermission(user, "view_profitability_summary") || canManageAccounting(user);
}

export function canViewFullAccounting(user: PortalUser) {
  return hasPermission(user, "view_full_accounting") || hasPermission(user, "see_accounting") || hasPermission(user, "manage_accounting");
}

export function canPreparePayroll(user: PortalUser) {
  return hasPermission(user, "prepare_payroll") || canManageAccounting(user);
}

export function canApprovePayroll(user: PortalUser) {
  return hasPermission(user, "approve_payroll") || canManageAccounting(user);
}

export function canEditCommissionDefaults(user: PortalUser) {
  return hasPermission(user, "edit_commission_defaults") || canManageAccounting(user);
}

export function canOverrideOrderCommission(user: PortalUser) {
  return hasPermission(user, "override_order_commission") || canManageAccounting(user);
}

export function canEditInspections(user: PortalUser) {
  return hasPermission(user, "edit_inspections") || canAssignOrders(user);
}

export function canReopenOrders(user: PortalUser) {
  return hasPermission(user, "reopen_orders") || canManageCompanyUsers(user);
}

export function canGenerateInvoices(user: PortalUser) {
  return hasPermission(user, "generate_invoices") || invoicePermissions.some((permission) => hasPermission(user, permission));
}

export function canEditInvoices(user: PortalUser) {
  return hasPermission(user, "edit_invoices") || canManageAccounting(user);
}

export function canMarkInvoicesPaid(user: PortalUser) {
  return hasPermission(user, "mark_invoices_paid") || canApprovePayroll(user);
}

export function canViewOwnPay(user: PortalUser) {
  return appraiserPayPermissions.some((permission) => hasPermission(user, permission));
}

export function canManagePublicOrdering(user: PortalUser) {
  return hasPermission(user, "manage_public_ordering") || canManageCompanyUsers(user);
}

export function canManageNotificationSettings(user: PortalUser) {
  return hasPermission(user, "manage_notification_settings") || canManageCompanyUsers(user);
}

export function canManageIntegrations(user: PortalUser) {
  return hasPermission(user, "manage_integrations") || canManageCompanyUsers(user);
}

export function canUploadOrderDocuments(user: PortalUser) {
  return hasPermission(user, "upload_order_documents") || hasPermission(user, "upload_documents");
}

export function canViewInternalDocuments(user: PortalUser) {
  return hasPermission(user, "view_internal_documents") || canManageCompanyUsers(user);
}

export function canViewClientDocuments(user: PortalUser) {
  return hasPermission(user, "view_client_documents") || canViewAllOrders(user) || canViewOwnOrdersOnly(user);
}

export function canDeleteDocuments(user: PortalUser) {
  return hasPermission(user, "delete_documents") || canManageCompanyUsers(user);
}

export function canArchiveDocuments(user: PortalUser) {
  return hasPermission(user, "archive_documents") || canDeleteDocuments(user);
}

export function canManageDocumentVisibility(user: PortalUser) {
  return hasPermission(user, "manage_document_visibility") || canManageCompanyUsers(user);
}

export function canDeliverFinalReport(user: PortalUser) {
  return hasPermission(user, "deliver_final_report") || hasPermission(user, "deliver_reports");
}

export function canViewVendorComplianceDocuments(user: PortalUser) {
  return hasPermission(user, "view_vendor_compliance_documents") || canApproveVendors(user);
}

export function canDownloadXML(user: PortalUser) {
  return hasPermission(user, "download_xml") || canDeliverFinalReport(user);
}

export function canViewWorkfileDocuments(user: PortalUser) {
  return hasPermission(user, "view_workfile_documents") || canReviewReports(user);
}

export function canViewAutomations(user: PortalUser) {
  return hasPermission(user, "view_automations") || canManageCompanyUsers(user) || canManagePublicOrdering(user);
}

export function canCreateAutomations(user: PortalUser) {
  return hasPermission(user, "create_automations") || canManageCompanyUsers(user);
}

export function canEditAutomations(user: PortalUser) {
  return hasPermission(user, "edit_automations") || canManageCompanyUsers(user);
}

export function canEnableAutomations(user: PortalUser) {
  return hasPermission(user, "enable_automations") || canManageCompanyUsers(user);
}

export function canViewAutomationHistory(user: PortalUser) {
  return hasPermission(user, "view_automation_history") || canViewAutomations(user);
}

export function canManageTeamTasks(user: PortalUser) {
  return hasPermission(user, "manage_team_tasks") || canManageCompanyUsers(user);
}

export function canAssignTasks(user: PortalUser) {
  return hasPermission(user, "assign_tasks") || canManageTeamTasks(user);
}

export function canViewNotificationLogs(user: PortalUser) {
  return hasPermission(user, "view_notification_logs") || canManageNotificationSettings(user) || canManageCompanyUsers(user);
}

export function canRetryFailedNotifications(user: PortalUser) {
  return hasPermission(user, "retry_failed_notifications") || canManageNotificationSettings(user) || canManageCompanyUsers(user);
}
