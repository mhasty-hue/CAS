import type { ClientTrackingStage, Order, OrderStatus, Organization, OrganizationOrderStatus, PortalUser } from "@/types/domain";
import { getAllowedStatusTransitions, orderStatusOptions, statusDefinitions } from "@/lib/orders/workflow";
import { canAssignOrders, canDeliverReports, canReviewReports, canViewAllOrders } from "@/lib/permissions";

export type StatusSelectOption = {
  id: string;
  label: string;
  canonicalStatus: OrderStatus;
  clientFacingStage: ClientTrackingStage;
  disabled?: boolean;
  reason?: string;
  requiresReason?: boolean;
};

export const clientTrackingStages: ClientTrackingStage[] = [
  "Order Received",
  "Appraiser Being Assigned",
  "Appraiser Assigned",
  "Inspection Being Scheduled",
  "Inspection Scheduled",
  "Appraisal in Progress",
  "Report Under Review",
  "Additional Information Needed",
  "Completed"
];

export const canonicalToClientStage: Record<OrderStatus, ClientTrackingStage> = {
  New: "Order Received",
  Unassigned: "Appraiser Being Assigned",
  Assigned: "Appraiser Assigned",
  Accepted: "Inspection Being Scheduled",
  "Inspection Scheduled": "Inspection Scheduled",
  Inspected: "Appraisal in Progress",
  "Report In Progress": "Appraisal in Progress",
  Submitted: "Report Under Review",
  "In Review": "Report Under Review",
  "Revisions Needed": "Additional Information Needed",
  "Revision Sent to Appraiser": "Additional Information Needed",
  "Ready for Delivery": "Completed",
  Delivered: "Completed",
  Completed: "Completed",
  "On Hold": "Additional Information Needed",
  Cancelled: "Completed"
};

export function createDefaultOrderStatuses(organizationId: string): OrganizationOrderStatus[] {
  return orderStatusOptions.map((status, index) => ({
    id: `${organizationId}-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    organizationId,
    name: status,
    description: statusDefinitions[status].meaning,
    canonicalStatus: status,
    clientFacingStage: canonicalToClientStage[status],
    displayOrder: index + 1,
    active: true,
    appearsInDropdown: true,
    appearsAsFilter: true,
    systemRequired: true
  }));
}

export function createDemoOrderStatuses(organizationId: string): OrganizationOrderStatus[] {
  const defaults = createDefaultOrderStatuses(organizationId);
  const customStatuses: OrganizationOrderStatus[] = [
    {
      id: `${organizationId}-status-waiting-engagement`,
      organizationId,
      name: "Waiting on Engagement Letter",
      description: "Order is received but the engagement letter is still being confirmed.",
      canonicalStatus: "New",
      clientFacingStage: "Order Received",
      displayOrder: 2.5,
      active: true,
      appearsInDropdown: true,
      appearsAsFilter: true,
      systemRequired: false
    },
    {
      id: `${organizationId}-status-searching-panel`,
      organizationId,
      name: "Searching Panel",
      description: "Staff are selecting a qualified panel vendor.",
      canonicalStatus: "Unassigned",
      clientFacingStage: "Appraiser Being Assigned",
      displayOrder: 4.5,
      active: true,
      appearsInDropdown: true,
      appearsAsFilter: true,
      systemRequired: false
    },
    {
      id: `${organizationId}-status-qc-review`,
      organizationId,
      name: "QC Review",
      description: "Internal quality control is reviewing the report.",
      canonicalStatus: "In Review",
      clientFacingStage: "Report Under Review",
      displayOrder: 12.5,
      active: true,
      appearsInDropdown: true,
      appearsAsFilter: true,
      systemRequired: false
    }
  ];
  return [...defaults, ...customStatuses].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function getOrganizationStatuses(statuses: OrganizationOrderStatus[], organization: Organization) {
  const scoped = statuses.filter((status) => status.organizationId === organization.id);
  return (scoped.length ? scoped : createDefaultOrderStatuses(organization.id)).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function getOrderStatusConfig(order: Order, statuses: OrganizationOrderStatus[], organization: Organization) {
  const scoped = getOrganizationStatuses(statuses, organization);
  return scoped.find((status) => status.id === order.organizationStatusId) ?? scoped.find((status) => status.canonicalStatus === order.status && status.systemRequired) ?? scoped.find((status) => status.canonicalStatus === order.status);
}

export function getOrganizationStatusLabel(order: Order, statuses: OrganizationOrderStatus[], organization: Organization, user?: PortalUser) {
  if (user?.role === "client_user") return getClientTrackingStage(order, statuses, organization);
  return getOrderStatusConfig(order, statuses, organization)?.name ?? order.status;
}

export function getStatusFilterOptions(statuses: OrganizationOrderStatus[], organization: Organization, user: PortalUser): StatusSelectOption[] {
  if (user.role === "client_user" && !canViewAllOrders(user)) {
    const uniqueStages = Array.from(new Set(getOrganizationStatuses(statuses, organization).filter((status) => status.active && status.appearsAsFilter).map((status) => status.clientFacingStage)));
    return uniqueStages.map((stage) => ({
      id: `client:${stage}`,
      label: stage,
      canonicalStatus: orderStatusOptions.find((status) => canonicalToClientStage[status] === stage) ?? "New",
      clientFacingStage: stage,
      disabled: false,
      requiresReason: false
    })).sort((a, b) => clientTrackingStages.indexOf(a.clientFacingStage) - clientTrackingStages.indexOf(b.clientFacingStage) || a.label.localeCompare(b.label)).map((option, index) => ({ ...option, id: `${option.id}:${index}` }));
  }

  return getOrganizationStatuses(statuses, organization)
    .filter((status) => status.active && status.appearsAsFilter && !status.archivedAt)
    .filter((status) => {
      if (user.role === "appraiser" && ["New", "Unassigned", "Cancelled"].includes(status.canonicalStatus)) return false;
      if (user.role === "reviewer") return ["Submitted", "In Review", "Revisions Needed", "Revision Sent to Appraiser", "Ready for Delivery", "Completed"].includes(status.canonicalStatus);
      return true;
    })
    .map((status) => ({
      id: status.id,
      label: status.name,
      canonicalStatus: status.canonicalStatus,
      clientFacingStage: status.clientFacingStage
    }));
}

export function getStatusDropdownOptions(order: Order, statuses: OrganizationOrderStatus[], organization: Organization, user: PortalUser): StatusSelectOption[] {
  const transitionOptions = getAllowedStatusTransitions(order, user);
  const transitionByStatus = new Map(transitionOptions.map((option) => [option.status, option]));
  return getOrganizationStatuses(statuses, organization)
    .filter((status) =>
      (status.active && status.appearsInDropdown && !status.archivedAt) ||
      status.id === order.organizationStatusId ||
      (!order.organizationStatusId && status.systemRequired && status.canonicalStatus === order.status)
    )
    .filter((status) => transitionByStatus.has(status.canonicalStatus))
    .filter((status) => {
      if (user.role === "client_user") return false;
      if (!canAssignOrders(user) && !canReviewReports(user) && !canDeliverReports(user) && status.canonicalStatus !== order.status) {
        return transitionByStatus.get(status.canonicalStatus)?.disabled === false;
      }
      return true;
    })
    .map((status) => {
      const transition = transitionByStatus.get(status.canonicalStatus);
      return {
        id: status.id,
        label: status.name,
        canonicalStatus: status.canonicalStatus,
        clientFacingStage: status.clientFacingStage,
        disabled: transition?.disabled,
        reason: transition?.reason,
        requiresReason: transition?.requiresReason
      };
    });
}

export function getCurrentStatusOptionId(order: Order, statuses: OrganizationOrderStatus[], organization: Organization) {
  return getOrderStatusConfig(order, statuses, organization)?.id ?? order.status;
}

export function statusFilterMatches(order: Order, filterId: string, statuses: OrganizationOrderStatus[], organization: Organization, user: PortalUser) {
  if (filterId === "All") return true;
  const options = getStatusFilterOptions(statuses, organization, user);
  const option = options.find((candidate) => candidate.id === filterId);
  if (!option) return true;
  if (option.id.startsWith("client:")) return getClientTrackingStage(order, statuses, organization) === option.clientFacingStage;
  const configured = getOrderStatusConfig(order, statuses, organization);
  return configured?.id === option.id || order.status === option.canonicalStatus;
}

export function getClientTrackingStage(order: Order, statuses: OrganizationOrderStatus[], organization: Organization): ClientTrackingStage {
  return getOrderStatusConfig(order, statuses, organization)?.clientFacingStage ?? canonicalToClientStage[order.status];
}

export function canUseCustomerTrackingView(user: PortalUser, organization: Organization) {
  return user.role === "client_user" && organization.type === "lender_client" && !canViewAllOrders(user);
}

export function canArchiveStatus(status: OrganizationOrderStatus, orders: Order[]) {
  void orders;
  if (status.systemRequired) return false;
  return true;
}

export function canDeleteStatus(status: OrganizationOrderStatus, orders: Order[]) {
  if (status.systemRequired) return false;
  return !orders.some((order) => order.organizationStatusId === status.id);
}

export function statusUsageCount(status: OrganizationOrderStatus, orders: Order[]) {
  return orders.filter((order) => order.organizationStatusId === status.id || (!order.organizationStatusId && order.status === status.canonicalStatus && status.systemRequired)).length;
}
