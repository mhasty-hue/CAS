import type { BidAward, BidRecipient, BidRequest, BidResponse, ConnectedOrderSummary, ConnectedParticipant, Order, OrderStatus, Organization, PortalUser, UserRole } from "@/types/domain";
import { daysUntil } from "@/lib/utils";
import { canAssignOrders, canDeliverReports, canReopenOrders, canReviewReports, canViewAllOrders } from "@/lib/permissions";

export type OrderQueueId =
  | "new-intake"
  | "incoming-assignments"
  | "bid-requests"
  | "needs-assignment"
  | "awaiting-acceptance"
  | "pending-acceptance"
  | "active"
  | "due-soon"
  | "in-review"
  | "ready-for-delivery"
  | "revisions"
  | "submitted"
  | "delivered"
  | "completed"
  | "cancelled"
  | "all";

export type OperationalStage =
  | "Draft"
  | "Submitted"
  | "Intake Review"
  | "Needs Assignment"
  | "Bidding"
  | "Awaiting Vendor Acceptance"
  | "Assigned"
  | "Inspection Scheduling"
  | "Inspection Scheduled"
  | "Inspected"
  | "Report in Progress"
  | "Report Submitted"
  | "In Review"
  | "Revision Requested"
  | "Revision Submitted"
  | "Approved"
  | "Ready for Delivery"
  | "Delivered"
  | "Completed"
  | "Cancelled";

export type QueueDefinition = {
  id: OrderQueueId;
  label: string;
  empty: string;
  nextAction?: string;
};

export type StatusDefinition = {
  status: OrderStatus;
  stage: OperationalStage;
  meaning: string;
  primaryQueue: OrderQueueId;
  canTransitionInto: UserRole[];
  canTransitionOut: UserRole[];
  clientLabel: string;
  lifecycle: "active" | "delivered" | "terminal" | "cancelled";
};

export type StatusTransitionOption = {
  status: OrderStatus;
  label: string;
  disabled?: boolean;
  reason?: string;
  requiresReason?: boolean;
};

export type BidQueueContext = {
  requests: BidRequest[];
  recipients: BidRecipient[];
  responses: BidResponse[];
  awards: BidAward[];
};

export type ConnectedQueueContext = {
  summaries: ConnectedOrderSummary[];
  participants: ConnectedParticipant[];
};

export type OrderAccessContext = {
  organization: Organization;
  connected?: ConnectedQueueContext;
};

export const queueDefinitions: Record<OrderQueueId, QueueDefinition> = {
  "new-intake": {
    id: "new-intake",
    label: "New Intake",
    empty: "No new order requests need intake review right now.",
    nextAction: "Create an order or review public requests."
  },
  "incoming-assignments": {
    id: "incoming-assignments",
    label: "Incoming Assignments",
    empty: "You have no new assignments awaiting a response."
  },
  "bid-requests": {
    id: "bid-requests",
    label: "Bid Requests",
    empty: "No open bid requests require a response."
  },
  "needs-assignment": {
    id: "needs-assignment",
    label: "Needs Assignment",
    empty: "No orders need an appraiser right now.",
    nextAction: "Assign the next order when it appears here."
  },
  "awaiting-acceptance": {
    id: "awaiting-acceptance",
    label: "Awaiting Acceptance",
    empty: "No assignments are waiting on vendor acceptance."
  },
  "pending-acceptance": {
    id: "pending-acceptance",
    label: "Pending Acceptance",
    empty: "No sent assignments are waiting for acceptance."
  },
  active: {
    id: "active",
    label: "Active",
    empty: "No active reports are in progress."
  },
  "due-soon": {
    id: "due-soon",
    label: "Due Soon",
    empty: "No assigned reports are due soon."
  },
  "in-review": {
    id: "in-review",
    label: "In Review",
    empty: "No submitted reports are in review."
  },
  "ready-for-delivery": {
    id: "ready-for-delivery",
    label: "Ready for Delivery",
    empty: "No approved reports are waiting for delivery."
  },
  revisions: {
    id: "revisions",
    label: "Revisions",
    empty: "No revisions currently require action."
  },
  submitted: {
    id: "submitted",
    label: "Submitted",
    empty: "No submitted reports are waiting on review."
  },
  delivered: {
    id: "delivered",
    label: "Delivered",
    empty: "No delivered reports are waiting for administrative closeout."
  },
  completed: {
    id: "completed",
    label: "Completed",
    empty: "No orders are administratively complete in this view."
  },
  cancelled: {
    id: "cancelled",
    label: "Cancelled",
    empty: "No cancelled orders are in this view."
  },
  all: {
    id: "all",
    label: "All",
    empty: "No orders match this view."
  }
};

export const statusDefinitions: Record<OrderStatus, StatusDefinition> = {
  New: {
    status: "New",
    stage: "Intake Review",
    meaning: "The order has been received and needs basic intake validation.",
    primaryQueue: "new-intake",
    canTransitionInto: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "client_user", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    clientLabel: "Order received",
    lifecycle: "active"
  },
  Unassigned: {
    status: "Unassigned",
    stage: "Needs Assignment",
    meaning: "The order is ready for assignment but does not have an appraiser yet.",
    primaryQueue: "needs-assignment",
    canTransitionInto: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "appraiser_manager", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "appraiser_manager", "solo_appraiser"],
    clientLabel: "Being assigned",
    lifecycle: "active"
  },
  Assigned: {
    status: "Assigned",
    stage: "Awaiting Vendor Acceptance",
    meaning: "An appraiser or vendor has been selected and acceptance is pending.",
    primaryQueue: "awaiting-acceptance",
    canTransitionInto: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "appraiser_manager", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "appraiser_manager", "appraiser", "solo_appraiser"],
    clientLabel: "Assigned",
    lifecycle: "active"
  },
  Accepted: {
    status: "Accepted",
    stage: "Assigned",
    meaning: "The appraiser accepted the assignment and should schedule the inspection.",
    primaryQueue: "active",
    canTransitionInto: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    canTransitionOut: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    clientLabel: "Accepted by appraiser",
    lifecycle: "active"
  },
  "Inspection Scheduled": {
    status: "Inspection Scheduled",
    stage: "Inspection Scheduled",
    meaning: "An inspection appointment is on the calendar.",
    primaryQueue: "active",
    canTransitionInto: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    canTransitionOut: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    clientLabel: "Inspection scheduled",
    lifecycle: "active"
  },
  Inspected: {
    status: "Inspected",
    stage: "Inspected",
    meaning: "Inspection is complete and report production can continue.",
    primaryQueue: "active",
    canTransitionInto: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    canTransitionOut: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    clientLabel: "Inspection complete",
    lifecycle: "active"
  },
  "Report In Progress": {
    status: "Report In Progress",
    stage: "Report in Progress",
    meaning: "The appraiser is writing or assembling the report.",
    primaryQueue: "active",
    canTransitionInto: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    canTransitionOut: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    clientLabel: "Report in progress",
    lifecycle: "active"
  },
  Submitted: {
    status: "Submitted",
    stage: "Report Submitted",
    meaning: "The report has been submitted and is waiting for review.",
    primaryQueue: "submitted",
    canTransitionInto: ["appraiser", "solo_appraiser", "company_admin", "super_admin", "office_staff"],
    canTransitionOut: ["reviewer", "company_admin", "super_admin", "office_staff", "solo_appraiser"],
    clientLabel: "Report submitted",
    lifecycle: "active"
  },
  "In Review": {
    status: "In Review",
    stage: "In Review",
    meaning: "A reviewer is actively checking the report.",
    primaryQueue: "in-review",
    canTransitionInto: ["reviewer", "company_admin", "super_admin", "office_staff", "solo_appraiser"],
    canTransitionOut: ["reviewer", "company_admin", "super_admin", "office_staff", "solo_appraiser"],
    clientLabel: "Quality review",
    lifecycle: "active"
  },
  "Revisions Needed": {
    status: "Revisions Needed",
    stage: "Revision Requested",
    meaning: "A reviewer or client has requested corrections.",
    primaryQueue: "revisions",
    canTransitionInto: ["reviewer", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    canTransitionOut: ["appraiser", "solo_appraiser", "reviewer", "company_admin", "super_admin", "office_staff"],
    clientLabel: "Revision in progress",
    lifecycle: "active"
  },
  "Revision Sent to Appraiser": {
    status: "Revision Sent to Appraiser",
    stage: "Revision Requested",
    meaning: "Revision items have been sent to the appraiser for response.",
    primaryQueue: "revisions",
    canTransitionInto: ["reviewer", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff"],
    canTransitionOut: ["appraiser", "solo_appraiser", "reviewer", "company_admin", "super_admin", "office_staff"],
    clientLabel: "Revision in progress",
    lifecycle: "active"
  },
  "Ready for Delivery": {
    status: "Ready for Delivery",
    stage: "Ready for Delivery",
    meaning: "The report is approved and waiting to be delivered.",
    primaryQueue: "ready-for-delivery",
    canTransitionInto: ["reviewer", "company_admin", "super_admin", "office_staff", "solo_appraiser"],
    canTransitionOut: ["reviewer", "company_admin", "super_admin", "office_staff", "solo_appraiser"],
    clientLabel: "Ready for delivery",
    lifecycle: "active"
  },
  Delivered: {
    status: "Delivered",
    stage: "Delivered",
    meaning: "The report was delivered but the order may still need administrative closeout.",
    primaryQueue: "delivered",
    canTransitionInto: ["reviewer", "company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    clientLabel: "Delivered",
    lifecycle: "delivered"
  },
  Completed: {
    status: "Completed",
    stage: "Completed",
    meaning: "The order is administratively complete.",
    primaryQueue: "completed",
    canTransitionInto: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "solo_appraiser"],
    clientLabel: "Completed",
    lifecycle: "terminal"
  },
  "On Hold": {
    status: "On Hold",
    stage: "Intake Review",
    meaning: "The order is paused and needs staff follow-up.",
    primaryQueue: "active",
    canTransitionInto: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    clientLabel: "On hold",
    lifecycle: "active"
  },
  Cancelled: {
    status: "Cancelled",
    stage: "Cancelled",
    meaning: "The order was cancelled and should not appear in active work queues.",
    primaryQueue: "cancelled",
    canTransitionInto: ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"],
    canTransitionOut: ["company_admin", "super_admin", "solo_appraiser"],
    clientLabel: "Cancelled",
    lifecycle: "cancelled"
  }
};

export const orderStatusOptions = Object.keys(statusDefinitions) as OrderStatus[];

const appraiserRoles: UserRole[] = ["appraiser", "solo_appraiser"];
const amcRoles: UserRole[] = ["amc_admin", "amc_staff"];
const appraisalCompanyRoles: UserRole[] = ["company_admin", "super_admin", "office_staff", "appraiser_manager"];

export function canSeeOrder(order: Order, user: PortalUser, organization: Organization) {
  if (user.role === "appraiser") return Boolean(user.appraiserName) && order.appraiser === user.appraiserName;
  if (user.role === "solo_appraiser") return Boolean(user.appraiserName) ? order.appraiser === user.appraiserName || order.client === organization.name : order.client === organization.name;
  if (user.clientName) return order.client === user.clientName;
  if (organization.type === "amc") return order.amc === organization.name || order.client === organization.name;
  if (canViewAllOrders(user)) return true;
  return order.client === organization.name || order.appraiser === user.name;
}

export function filterOrdersForWorkflow(orderList: Order[], user: PortalUser, organization: Organization) {
  return orderList.filter((order) => canSeeOrder(order, user, organization));
}

export function queueMatchesOrder(order: Order, queueId: OrderQueueId) {
  const lifecycle = statusDefinitions[order.status].lifecycle;
  const days = daysUntil(order.dueDate);

  if (queueId === "all") return true;
  if (queueId === "new-intake") return order.status === "New";
  if (queueId === "needs-assignment") return order.status === "Unassigned";
  if (queueId === "awaiting-acceptance" || queueId === "pending-acceptance" || queueId === "incoming-assignments") return order.status === "Assigned";
  if (queueId === "active") return lifecycle === "active" && !["New", "Unassigned", "Assigned", "Submitted", "In Review", "Revisions Needed", "Revision Sent to Appraiser", "Ready for Delivery"].includes(order.status);
  if (queueId === "due-soon") return lifecycle === "active" && days >= 0 && days <= 3;
  if (queueId === "submitted") return order.status === "Submitted";
  if (queueId === "in-review") return order.status === "In Review";
  if (queueId === "revisions") return order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser";
  if (queueId === "ready-for-delivery") return order.status === "Ready for Delivery";
  if (queueId === "delivered") return order.status === "Delivered";
  if (queueId === "completed") return order.status === "Completed";
  if (queueId === "cancelled") return order.status === "Cancelled";
  return false;
}

export function getDefaultOrderQueue(user: PortalUser, organization: Organization): OrderQueueId {
  if (user.role === "appraiser" || user.role === "solo_appraiser") return "active";
  if (user.role === "reviewer") return "submitted";
  if (organization.type === "amc") return "new-intake";
  if (user.role === "client_user") return "active";
  if (appraisalCompanyRoles.includes(user.role)) return "incoming-assignments";
  return "active";
}

export function getOrderQueueTabs(user: PortalUser, organization: Organization): OrderQueueId[] {
  if (user.role === "appraiser" || user.role === "solo_appraiser") {
    return ["incoming-assignments", "bid-requests", "active", "due-soon", "revisions", "submitted", "completed"];
  }

  if (user.role === "client_user") {
    return canViewAllOrders(user)
      ? ["new-intake", "needs-assignment", "awaiting-acceptance", "active", "in-review", "ready-for-delivery", "revisions", "delivered", "completed", "cancelled", "all"]
      : ["active", "in-review", "ready-for-delivery", "revisions", "delivered", "completed", "cancelled"];
  }

  if (user.role === "reviewer") {
    return ["submitted", "in-review", "revisions", "ready-for-delivery", "completed"];
  }

  if (amcRoles.includes(user.role) || organization.type === "amc") {
    return ["new-intake", "needs-assignment", "awaiting-acceptance", "active", "submitted", "in-review", "ready-for-delivery", "revisions", "delivered", "completed", "cancelled", "all"];
  }

  if (appraisalCompanyRoles.includes(user.role)) {
    return ["incoming-assignments", "bid-requests", "needs-assignment", "pending-acceptance", "active", "submitted", "in-review", "revisions", "ready-for-delivery", "delivered", "completed", "cancelled"];
  }

  return ["active", "completed"];
}

export function resolveLegacyOrderQueue(view: string, user: PortalUser, organization: Organization): OrderQueueId | null {
  if (view === "completed-orders") return "completed";
  if (view === "cancelled-orders") return "cancelled";
  if (view === "all-orders") return "all";
  if (view === "incoming-orders") return appraiserRoles.includes(user.role) ? "incoming-assignments" : organization.type === "amc" ? "new-intake" : "incoming-assignments";
  if (view === "bids") return "bid-requests";
  if (view === "my-orders" || view === "orders") return getDefaultOrderQueue(user, organization);
  return null;
}

export function getOpenBidRequestsForUser(context: BidQueueContext, user: PortalUser, organization: Organization) {
  const awardedRequestIds = new Set(context.awards.filter((award) => award.status === "accepted" || award.assignmentStatus === "assigned").map((award) => award.bidRequestId));
  return context.requests.filter((request) => {
    if (request.status !== "open" || awardedRequestIds.has(request.id)) return false;
    if (amcRoles.includes(user.role) || request.sendingOrganizationId === organization.id) return true;
    if (appraiserRoles.includes(user.role)) {
      return context.recipients.some((recipient) =>
        recipient.bidRequestId === request.id &&
        recipient.invitationStatus !== "awarded" &&
        recipient.invitationStatus !== "not_selected" &&
        (recipient.recipientUserId === user.id || recipient.recipientName === user.appraiserName || recipient.recipientOrganizationId === organization.id)
      );
    }
    return canViewAllOrders(user);
  });
}

export function getIncomingAssignmentsForUser(context: ConnectedQueueContext, user: PortalUser, organization: Organization) {
  const pendingOrderIds = new Set(
    context.participants
      .filter((participant) =>
        participant.accessStatus === "pending_acceptance" &&
        (participant.participantUserId === user.id || participant.participantOrganizationId === organization.id || participant.participantName === user.appraiserName)
      )
      .map((participant) => participant.orderId)
  );

  return context.summaries.filter((summary) => {
    if (!pendingOrderIds.has(summary.orderId)) return false;
    return summary.status !== "Accepted" && summary.status !== "Completed" && summary.status !== "Cancelled" && summary.status !== "Delivered";
  });
}

export function countQueueItems({
  orders,
  queueId,
  user,
  organization,
  bids,
  connected
}: {
  orders: Order[];
  queueId: OrderQueueId;
  user: PortalUser;
  organization: Organization;
  bids?: BidQueueContext;
  connected?: ConnectedQueueContext;
}) {
  if (queueId === "bid-requests") return bids ? getOpenBidRequestsForUser(bids, user, organization).length : 0;
  if (queueId === "incoming-assignments") {
    const connectedCount = connected ? getIncomingAssignmentsForUser(connected, user, organization).length : 0;
    return connectedCount + orders.filter((order) => queueMatchesOrder(order, queueId)).length;
  }
  return orders.filter((order) => queueMatchesOrder(order, queueId)).length;
}

function canRoleTransitionInto(user: PortalUser, status: OrderStatus) {
  return statusDefinitions[status].canTransitionInto.includes(user.role);
}

function isAssignedAppraiser(order: Order, user: PortalUser) {
  return Boolean(user.appraiserName) && order.appraiser === user.appraiserName;
}

export function getAllowedStatusTransitions(order: Order, user: PortalUser): StatusTransitionOption[] {
  const canManageStatus = canAssignOrders(user) || canReviewReports(user) || canDeliverReports(user) || canReopenOrders(user);
  const appraiserOwnOrder = isAssignedAppraiser(order, user);

  return orderStatusOptions.map((status) => {
    if (status === order.status) return { status, label: status };

    let allowed = canRoleTransitionInto(user, status);
    if (user.role === "appraiser") {
      allowed = appraiserOwnOrder && ["Accepted", "Inspection Scheduled", "Inspected", "Report In Progress", "Submitted", "Revision Sent to Appraiser"].includes(status);
    }
    if (user.role === "client_user") allowed = false;
    if (!canManageStatus && !appraiserOwnOrder) allowed = false;
    if (statusDefinitions[order.status].lifecycle === "terminal" && !canReopenOrders(user)) allowed = false;
    if (statusDefinitions[order.status].lifecycle === "cancelled" && !canReopenOrders(user)) allowed = false;

    const requiresReason = ["Cancelled", "Unassigned", "Assigned"].includes(status) || statusDefinitions[order.status].lifecycle === "terminal" || statusDefinitions[order.status].lifecycle === "cancelled";
    return {
      status,
      label: status,
      disabled: !allowed,
      reason: allowed ? undefined : transitionUnavailableReason(order, status, user),
      requiresReason
    };
  });
}

export function transitionUnavailableReason(order: Order, status: OrderStatus, user: PortalUser) {
  if (user.role === "client_user") return "Client users can view status but cannot update it.";
  if (user.role === "appraiser" && !isAssignedAppraiser(order, user)) return "Appraisers can update only their assigned orders.";
  if (!canRoleTransitionInto(user, status)) return "Your role does not transition orders into this status.";
  return "This transition is not available from your current permissions.";
}

export function canTransitionOrderStatus(order: Order, status: OrderStatus, user: PortalUser) {
  const option = getAllowedStatusTransitions(order, user).find((item) => item.status === status);
  return Boolean(option && !option.disabled);
}

export function requiresStatusReason(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  return nextStatus === "Cancelled" || nextStatus === "Assigned" || nextStatus === "Unassigned" || statusDefinitions[currentStatus].lifecycle === "terminal" || statusDefinitions[currentStatus].lifecycle === "cancelled";
}
