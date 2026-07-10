import type { PermissionKey, PortalUser, UserRole } from "@/types/domain";

const accountingSummaryPermissions: PermissionKey[] = ["view_accounting_summary"];
const fullAccountingPermissions: PermissionKey[] = [
  "see_accounting",
  "view_accounting_summary",
  "view_full_accounting",
  "prepare_payroll",
  "approve_payroll",
  "edit_commission_defaults",
  "override_order_commission",
  "generate_invoices",
  "edit_invoices",
  "mark_invoices_paid"
];
const appraiserPayPermissions: PermissionKey[] = ["see_appraiser_payouts", "view_own_pay"];
const invoicePermissions: PermissionKey[] = ["generate_invoices", "edit_invoices", "mark_invoices_paid"];
const platformAdminPermissions: PermissionKey[] = ["manage_public_ordering", "manage_notification_settings", "manage_integrations"];

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  super_admin: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
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
    ...platformAdminPermissions
  ],
  company_admin: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
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
    ...platformAdminPermissions
  ],
  office_staff: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
    "upload_documents",
    "manage_clients",
    ...accountingSummaryPermissions,
    "export_reports"
  ],
  appraiser_manager: [
    "view_all_orders",
    "assign_orders",
    "upload_documents",
    "see_appraiser_payouts",
    "view_accounting_summary",
    "view_own_pay",
    "manage_users",
    "export_reports"
  ],
  appraiser: ["upload_documents", "see_appraiser_payouts", "view_own_pay", "view_own_orders_only"],
  solo_appraiser: [
    "create_orders",
    "assign_orders",
    "upload_documents",
    "see_accounting",
    "see_appraiser_payouts",
    "manage_accounting",
    ...fullAccountingPermissions,
    "manage_users",
    "customize_order_forms",
    "manage_public_ordering",
    "manage_notification_settings",
    "manage_integrations",
    "view_own_orders_only"
  ],
  reviewer: ["view_all_orders", "upload_documents", "review_reports", "deliver_reports"],
  amc_admin: [
    "view_all_orders",
    "create_orders",
    "upload_documents",
    "invite_vendors",
    "approve_vendors",
    "manage_users",
    ...accountingSummaryPermissions,
    "generate_invoices",
    "edit_invoices",
    "manage_integrations",
    "export_reports"
  ],
  amc_staff: ["view_all_orders", "create_orders", "upload_documents", "invite_vendors", "export_reports"],
  client_user: ["create_orders", "upload_documents", "view_own_orders_only"]
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
