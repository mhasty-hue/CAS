import type { PermissionKey, PortalUser, UserRole } from "@/types/domain";

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
    "review_reports",
    "deliver_reports",
    "invite_vendors",
    "approve_vendors",
    "manage_workflows",
    "export_reports"
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
    "export_reports"
  ],
  office_staff: [
    "view_all_orders",
    "create_orders",
    "assign_orders",
    "edit_due_dates",
    "upload_documents",
    "manage_clients",
    "export_reports"
  ],
  appraiser_manager: [
    "view_all_orders",
    "assign_orders",
    "upload_documents",
    "see_appraiser_payouts",
    "manage_users",
    "export_reports"
  ],
  appraiser: ["upload_documents", "see_appraiser_payouts", "view_own_orders_only"],
  solo_appraiser: [
    "create_orders",
    "assign_orders",
    "upload_documents",
    "see_accounting",
    "see_appraiser_payouts",
    "manage_users",
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
  return hasPermission(user, "see_accounting");
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
