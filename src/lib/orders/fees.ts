import type { Order, Organization, PortalUser } from "@/types/domain";
import { hasPermission, canManageAccounting, canViewFullAccounting, canViewOwnPay, canViewReceivablesSummary } from "@/lib/permissions";

export type OrderFeeKey = "clientFee" | "vendorFee" | "margin" | "invoice" | "commission";

export type AuthorizedOrderFee = {
  key: OrderFeeKey;
  label: string;
  amount: number;
};

export type OrderFinancials = {
  clientFee: number;
  vendorFee: number;
  grossSpread: number;
  techFee: number;
  commissionableBase: number;
};

function isAssignedAppraiser(order: Order, user: PortalUser) {
  return Boolean(user.appraiserName) && order.appraiser === user.appraiserName;
}

export function getOrderFinancials(order: Order): OrderFinancials {
  const clientFee = order.clientFee ?? order.fee;
  const vendorFee = order.vendorFee ?? order.appraiserPayout;
  const grossSpread = order.companyMargin ?? Math.max(0, clientFee - vendorFee);
  return {
    clientFee,
    vendorFee,
    grossSpread,
    techFee: order.techFee,
    commissionableBase: order.payrollSnapshot?.commissionableBase ?? Math.max(0, clientFee - order.techFee - (order.otherNonCommissionableFees ?? 0))
  };
}

export function canViewClientFee(user: PortalUser) {
  return hasPermission(user, "view_client_fee") || hasPermission(user, "view_invoice") || canViewReceivablesSummary(user) || canViewFullAccounting(user);
}

export function canEditClientFee(user: PortalUser) {
  return hasPermission(user, "edit_client_fee") || canManageAccounting(user);
}

export function canViewVendorFee(user: PortalUser, order?: Order) {
  if (order && user.role === "appraiser") return isAssignedAppraiser(order, user) && (hasPermission(user, "view_vendor_fee") || canViewOwnPay(user));
  if (order && user.role === "solo_appraiser") return isAssignedAppraiser(order, user) || hasPermission(user, "view_vendor_fee") || canViewOwnPay(user);
  return hasPermission(user, "view_vendor_fee") || canViewFullAccounting(user) || canManageAccounting(user);
}

export function canEditVendorFee(user: PortalUser) {
  return hasPermission(user, "edit_vendor_fee") || canManageAccounting(user);
}

export function canViewMargin(user: PortalUser) {
  return hasPermission(user, "view_margin") || canViewFullAccounting(user) || canManageAccounting(user);
}

export function canViewInvoice(user: PortalUser) {
  return hasPermission(user, "view_invoice") || canViewClientFee(user);
}

export function getAuthorizedOrderFees(order: Order, user: PortalUser, organization: Organization): AuthorizedOrderFee[] {
  const financials = getOrderFinancials(order);
  const isClient = user.role === "client_user";
  const assignedAppraiser = isAssignedAppraiser(order, user);
  const fees: AuthorizedOrderFee[] = [];

  if (isClient) {
    if (canViewInvoice(user) || user.clientName === order.client) {
      fees.push({ key: "clientFee", label: "Appraisal Fee", amount: financials.clientFee });
    }
    return fees;
  }

  if (user.role === "appraiser" || (user.role === "solo_appraiser" && assignedAppraiser)) {
    if (canViewVendorFee(user, order)) {
      fees.push({ key: "vendorFee", label: "Your Assignment Fee", amount: financials.vendorFee });
    }
    return fees;
  }

  if (organization.type === "amc") {
    if (canViewClientFee(user)) fees.push({ key: "clientFee", label: "Client Fee", amount: financials.clientFee });
    if (canViewVendorFee(user, order)) fees.push({ key: "vendorFee", label: "Vendor Fee", amount: financials.vendorFee });
    if (canViewMargin(user)) fees.push({ key: "margin", label: "Gross Spread", amount: financials.grossSpread });
    return fees;
  }

  if (canViewClientFee(user)) fees.push({ key: "clientFee", label: "Client Fee", amount: financials.clientFee });
  if (canViewVendorFee(user, order)) fees.push({ key: "vendorFee", label: "Vendor Fee", amount: financials.vendorFee });
  if (canViewMargin(user)) fees.push({ key: "margin", label: "Company Margin", amount: financials.grossSpread });
  return fees;
}

export function sanitizeOrderFeesForUser(order: Order, user: PortalUser, organization: Organization): Order {
  const financials = getOrderFinancials(order);
  const authorized = getAuthorizedOrderFees(order, user, organization);
  const canSeeClient = authorized.some((fee) => fee.key === "clientFee");
  const canSeeVendor = authorized.some((fee) => fee.key === "vendorFee");
  const canSeeMargin = authorized.some((fee) => fee.key === "margin");
  const visiblePrimaryFee = canSeeClient ? financials.clientFee : canSeeVendor ? financials.vendorFee : 0;

  return {
    ...order,
    fee: visiblePrimaryFee,
    clientFee: canSeeClient ? financials.clientFee : undefined,
    vendorFee: canSeeVendor ? financials.vendorFee : undefined,
    companyMargin: canSeeMargin ? financials.grossSpread : undefined,
    appraiserPayout: canSeeVendor ? financials.vendorFee : 0,
    payrollSnapshot: canSeeVendor || canSeeMargin || canManageAccounting(user) ? order.payrollSnapshot : undefined
  };
}

export function sanitizeOrdersForUser(orders: Order[], user: PortalUser, organization: Organization) {
  return orders.map((order) => sanitizeOrderFeesForUser(order, user, organization));
}

export function applyAwardedVendorFee(order: Order, vendorFee: number): Order {
  const clientFee = order.clientFee ?? order.fee;
  return {
    ...order,
    clientFee,
    vendorFee,
    companyMargin: Math.max(0, clientFee - vendorFee),
    appraiserPayout: vendorFee
  };
}
