import type {
  BidAward,
  BidRecipient,
  BidRequest,
  BidResponse,
  ConnectedParticipant,
  ConnectedParticipantRole,
  Order,
  OrderStatus,
  Organization,
  PortalUser,
  VendorCountyCoverage
} from "@/types/domain";
import { evaluateBidEligibility, type BidEligibilityResult } from "@/lib/connected/eligibility";
import {
  canAssignOrders,
  canDeliverReports,
  canEditInspections,
  canGenerateInvoices,
  canInviteVendors,
  canReviewReports,
  canViewAccounting
} from "@/lib/permissions";
import { canTransitionOrderStatus, queueMatchesOrder, statusDefinitions } from "@/lib/orders/workflow";

export type OrderDetailSectionId =
  | "overview"
  | "assignment"
  | "schedule"
  | "documents"
  | "messages"
  | "review"
  | "delivery"
  | "accounting"
  | "history";

export type OrderRelationshipItem = {
  label: string;
  value: string;
};

export type OrderDetailAction = {
  label: string;
  description: string;
  targetSection: OrderDetailSectionId;
  status?: OrderStatus;
};

export type OrderBidContext = {
  requests: BidRequest[];
  recipients: BidRecipient[];
  responses: BidResponse[];
  awards: BidAward[];
};

export type OrderConnectedContext = {
  participants: ConnectedParticipant[];
};

export type OrderBidWorkflowDraft = {
  orderId: string;
  duplicateOrderCreated: false;
  recipientCount: number;
  statusAfterSend: OrderStatus | "Bidding";
  selectedVendorNames: string[];
  requiresCoverageConfirmation: boolean;
};

export const orderDetailSectionLabels: Record<OrderDetailSectionId, string> = {
  overview: "Overview",
  assignment: "Assignment",
  schedule: "Schedule",
  documents: "Documents",
  messages: "Messages",
  review: "Review and Revisions",
  delivery: "Delivery",
  accounting: "Accounting",
  history: "History"
};

const appraiserRoles = new Set(["appraiser", "solo_appraiser"]);
const assignmentManagerRoles = new Set(["super_admin", "company_admin", "office_staff", "appraiser_manager", "amc_admin", "amc_staff", "solo_appraiser"]);

function isDirectManagementLabel(value: string) {
  return /^direct/i.test(value) || /private client/i.test(value);
}

function participantByRole(participants: ConnectedParticipant[], role: ConnectedParticipantRole) {
  return participants.find((participant) => participant.role === role && participant.accessStatus !== "revoked" && participant.accessStatus !== "expired");
}

function hasAssignedAppraiser(order: Order) {
  return order.appraiser.trim().length > 0 && order.appraiser !== "Unassigned";
}

export function isAssignedOrderAppraiser(order: Order, user: PortalUser) {
  return Boolean(user.appraiserName) && order.appraiser === user.appraiserName;
}

export function canManageOrderAssignment(user: PortalUser, organization: Organization) {
  return canAssignOrders(user) || canInviteVendors(user) || assignmentManagerRoles.has(user.role) || organization.type === "amc";
}

export function canViewOrderAccounting(order: Order, user: PortalUser) {
  if (user.role === "client_user") return false;
  if (appraiserRoles.has(user.role)) return isAssignedOrderAppraiser(order, user);
  return canViewAccounting(user);
}

export function canViewBidComparison(order: Order, user: PortalUser, organization: Organization) {
  if (user.role === "appraiser") return false;
  if (user.role === "solo_appraiser" && order.client !== organization.name && order.amc !== organization.name) return false;
  return canManageOrderAssignment(user, organization) && user.role !== "client_user" && !isAssignedOrderAppraiser(order, user);
}

export function getOrderParticipants(order: Order, connected?: OrderConnectedContext) {
  return (connected?.participants ?? []).filter((participant) => participant.orderId === order.id);
}

export function buildOrderRelationshipSummary({
  order,
  user,
  organization,
  connected
}: {
  order: Order;
  user: PortalUser;
  organization: Organization;
  connected?: OrderConnectedContext;
}) {
  const participants = getOrderParticipants(order, connected);
  const orderingClient = participantByRole(participants, "ordering_client") ?? participantByRole(participants, "lender") ?? participantByRole(participants, "public_requester");
  const primaryOwner = participantByRole(participants, "primary_owner");
  const appraisalCompany = participantByRole(participants, "appraisal_company");
  const assignedAppraiser = participantByRole(participants, "assigned_appraiser");
  const reviewer = participantByRole(participants, "reviewer");
  const deliveryRecipient = participantByRole(participants, "delivery_recipient");
  const billingParty = participantByRole(participants, "billing_party");
  const orderedBy = orderingClient?.participantName ?? order.client;
  const managedBy = !isDirectManagementLabel(order.amc) ? order.amc : primaryOwner?.participantName ?? (organization.type === "lender_client" ? order.client : organization.name);
  const assignedCompany = appraisalCompany?.participantName ?? (!isDirectManagementLabel(order.amc) ? primaryOwner?.participantName : undefined);
  const appraiserName = assignedAppraiser?.participantName ?? (hasAssignedAppraiser(order) ? order.appraiser : "");
  const deliveryName = deliveryRecipient?.participantName ?? orderedBy;
  const billingName = billingParty?.participantName ?? (!isDirectManagementLabel(order.amc) ? order.amc : order.client);
  const clientView = user.role === "client_user";
  const appraiserView = appraiserRoles.has(user.role);
  const items: OrderRelationshipItem[] = [
    { label: "Ordered by", value: orderedBy },
    { label: "Managed by", value: managedBy }
  ];

  if (!clientView && assignedCompany && assignedCompany !== managedBy) {
    items.push({ label: "Assigned company", value: assignedCompany });
  }

  if (appraiserName) {
    items.push({ label: "Assigned appraiser", value: appraiserName });
  }

  if (!clientView && !appraiserView && (reviewer?.participantName ?? order.reviewer)) {
    items.push({ label: "Reviewed by", value: reviewer?.participantName ?? order.reviewer });
  }

  if (!clientView && canViewOrderAccounting(order, user)) {
    items.push({ label: "Billing party", value: billingName });
  }

  items.push({ label: "Delivery recipient", value: deliveryName });
  return items.filter((item, index, all) => item.value && all.findIndex((candidate) => candidate.label === item.label && candidate.value === item.value) === index);
}

export function getOrderDetailSections(order: Order, user: PortalUser, organization: Organization): OrderDetailSectionId[] {
  const sections: OrderDetailSectionId[] = ["overview"];
  const ownAppraiserOrder = isAssignedOrderAppraiser(order, user);

  if (canManageOrderAssignment(user, organization) || ownAppraiserOrder) sections.push("assignment");
  if (canEditInspections(user) || ownAppraiserOrder || user.role !== "client_user") sections.push("schedule");
  sections.push("documents", "messages");
  if (canReviewReports(user) || ownAppraiserOrder || ["company_admin", "super_admin", "office_staff", "amc_admin", "amc_staff", "solo_appraiser"].includes(user.role)) sections.push("review");
  if (canDeliverReports(user) || user.role === "client_user" || statusDefinitions[order.status].primaryQueue === "ready-for-delivery" || statusDefinitions[order.status].lifecycle === "delivered") sections.push("delivery");
  if (canViewOrderAccounting(order, user)) sections.push("accounting");
  sections.push("history");
  return sections;
}

export function hasOrderDetailSection(section: OrderDetailSectionId, order: Order, user: PortalUser, organization: Organization) {
  return getOrderDetailSections(order, user, organization).includes(section);
}

function getOrderBidRequests(order: Order, bids?: OrderBidContext) {
  return (bids?.requests ?? []).filter((request) => request.orderId === order.id);
}

export function getOrderBidState(order: Order, bids?: OrderBidContext) {
  const requests = getOrderBidRequests(order, bids);
  const requestIds = new Set(requests.map((request) => request.id));
  const recipients = (bids?.recipients ?? []).filter((recipient) => requestIds.has(recipient.bidRequestId));
  const responses = (bids?.responses ?? []).filter((response) => requestIds.has(response.bidRequestId));
  const awards = (bids?.awards ?? []).filter((award) => award.orderId === order.id || requestIds.has(award.bidRequestId));
  const openRequest = requests.find((request) => request.status === "open" || request.status === "reopened");
  const pendingAward = awards.find((award) => award.status === "pending_acceptance" || award.assignmentStatus === "pending_acceptance");
  const acceptedAward = awards.find((award) => award.status === "accepted" || award.assignmentStatus === "assigned");
  return {
    requests,
    recipients,
    responses,
    awards,
    openRequest,
    pendingAward,
    acceptedAward,
    hasSubmittedResponses: responses.some((response) => response.responseStatus === "submitted" || response.responseStatus === "revised"),
    isBidding: Boolean(openRequest && !acceptedAward)
  };
}

export function getVisibleBidRecipientsForUser(order: Order, bids: OrderBidContext | undefined, user: PortalUser, organization: Organization) {
  const bidState = getOrderBidState(order, bids);
  if (canViewBidComparison(order, user, organization)) return bidState.recipients;
  if (!appraiserRoles.has(user.role)) return [];
  return bidState.recipients.filter((recipient) =>
    recipient.recipientUserId === user.id ||
    recipient.recipientName === user.appraiserName ||
    recipient.recipientOrganizationId === organization.id
  );
}

export function getOrderAssignmentDisplayState(order: Order, bids?: OrderBidContext) {
  const bidState = getOrderBidState(order, bids);
  if (bidState.isBidding && !hasAssignedAppraiser(order)) return "Bidding";
  if (bidState.pendingAward) return "Award selected, awaiting acceptance";
  return statusDefinitions[order.status].stage;
}

function canMoveTo(order: Order, status: OrderStatus, user: PortalUser) {
  return canTransitionOrderStatus(order, status, user);
}

export function getPrimaryOrderAction(order: Order, user: PortalUser, organization: Organization, bids?: OrderBidContext): OrderDetailAction {
  const canManageAssignment = canManageOrderAssignment(user, organization);
  const ownAppraiserOrder = isAssignedOrderAppraiser(order, user);
  const bidState = getOrderBidState(order, bids);

  if (order.status === "New" && canMoveTo(order, "Unassigned", user)) {
    return {
      label: "Review New Order",
      description: "Confirm intake details and prepare the assignment step.",
      targetSection: "overview",
      status: "Unassigned"
    };
  }

  if (bidState.hasSubmittedResponses && canViewBidComparison(order, user, organization) && (order.status === "Unassigned" || bidState.isBidding || !hasAssignedAppraiser(order))) {
    return {
      label: "Review Bid Responses",
      description: "Compare bidder fee, turn time, coverage, and compliance before selecting a winner.",
      targetSection: "assignment"
    };
  }

  if (bidState.isBidding && canManageAssignment) {
    return {
      label: "Monitor Bid Request",
      description: "Track recipients, delivery status, response status, and the bid deadline.",
      targetSection: "assignment"
    };
  }

  if (order.status === "Unassigned" && canManageAssignment) {
    return {
      label: "Find an Appraiser",
      description: "Use this order's county, product, due date, and documents to assign directly or request bids.",
      targetSection: "assignment"
    };
  }

  if (order.status === "Assigned") {
    if (ownAppraiserOrder && canMoveTo(order, "Accepted", user)) {
      return {
        label: "Accept Assignment",
        description: "Accept the assignment and move it into active work.",
        targetSection: "assignment",
        status: "Accepted"
      };
    }
    return {
      label: "Await Vendor Acceptance",
      description: "The selected vendor or appraiser has not accepted yet.",
      targetSection: "assignment"
    };
  }

  if (order.status === "Accepted") {
    return {
      label: ownAppraiserOrder || canEditInspections(user) ? "Schedule Inspection" : "Track Inspection",
      description: "Confirm access details and get the inspection on the calendar.",
      targetSection: "schedule"
    };
  }

  if (order.status === "Inspection Scheduled") {
    return {
      label: ownAppraiserOrder || canEditInspections(user) ? "Complete Inspection" : "Track Inspection",
      description: "Confirm inspection completion or update the schedule if plans change.",
      targetSection: "schedule"
    };
  }

  if (order.status === "Inspected" || order.status === "Report In Progress") {
    return {
      label: ownAppraiserOrder ? "Upload Report" : "Await Report",
      description: "The next step is report production and upload.",
      targetSection: "documents",
      status: ownAppraiserOrder && canMoveTo(order, "Submitted", user) ? "Submitted" : undefined
    };
  }

  if (order.status === "Submitted" || order.status === "In Review") {
    return {
      label: canReviewReports(user) ? "Review Report" : "Await Review",
      description: "The report is in quality review before delivery.",
      targetSection: "review",
      status: canReviewReports(user) && order.status === "Submitted" && canMoveTo(order, "In Review", user) ? "In Review" : undefined
    };
  }

  if (order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser") {
    return {
      label: ownAppraiserOrder ? "Respond to Revision" : "Track Revision",
      description: "Revision items need a clear response before the report can move forward.",
      targetSection: "review",
      status: ownAppraiserOrder && canMoveTo(order, "Revision Sent to Appraiser", user) ? "Revision Sent to Appraiser" : undefined
    };
  }

  if (order.status === "Ready for Delivery") {
    return {
      label: canDeliverReports(user) ? "Deliver Report" : "Await Delivery",
      description: "The report is approved and ready for permitted recipients.",
      targetSection: "delivery",
      status: canDeliverReports(user) && canMoveTo(order, "Delivered", user) ? "Delivered" : undefined
    };
  }

  if (order.status === "Delivered") {
    return {
      label: canGenerateInvoices(user) ? "Generate Invoice" : "Complete Order",
      description: "Delivery is done; finish invoicing and administrative closeout.",
      targetSection: canGenerateInvoices(user) ? "accounting" : "delivery",
      status: canMoveTo(order, "Completed", user) ? "Completed" : undefined
    };
  }

  return {
    label: statusDefinitions[order.status].lifecycle === "terminal" ? "Order Complete" : order.nextAction || "Review Order",
    description: statusDefinitions[order.status].meaning,
    targetSection: "overview"
  };
}

export function getOrderDetailAlert(order: Order, user: PortalUser, bids?: OrderBidContext) {
  const bidState = getOrderBidState(order, bids);
  if (bidState.pendingAward) return `${bidState.pendingAward.winnerName} was selected and acceptance is pending.`;
  if (bidState.hasSubmittedResponses && user.role !== "client_user" && (order.status === "Unassigned" || bidState.isBidding)) return "Bid responses are ready for comparison.";
  if (order.status === "Unassigned") return "This order needs an appraiser before work can begin.";
  if (order.status === "Assigned") return "The assignment is waiting on acceptance.";
  if (queueMatchesOrder(order, "due-soon")) return "Due date is close. Confirm the next action today.";
  if (order.status === "Revisions Needed") return "A revision is waiting for action.";
  return statusDefinitions[order.status].meaning;
}

export function requiredSpecialtiesForOrder(order: Order) {
  const text = `${order.productType} ${order.loanType} ${order.propertyType}`.toLowerCase();
  const specialties: string[] = [];
  if (text.includes("fha")) specialties.push("FHA");
  if (text.includes("va")) specialties.push("VA");
  if (text.includes("luxury")) specialties.push("Luxury");
  if (text.includes("complex")) specialties.push("Complex");
  if (text.includes("acreage") || text.includes("rural")) specialties.push("Rural");
  if (!specialties.length && text.includes("1004")) specialties.push("Conventional");
  return specialties;
}

export function getNearbyCountiesForOrder(order: Order) {
  const nearbyByCounty: Record<string, string[]> = {
    Cobb: ["Fulton", "Cherokee", "Douglas"],
    Fulton: ["Cobb", "Cherokee", "Douglas"],
    Cherokee: ["Cobb", "Fulton", "Pickens"],
    Pickens: ["Cherokee"],
    Gwinnett: ["Fulton", "Cobb"],
    Douglas: ["Cobb", "Fulton"]
  };
  return nearbyByCounty[order.county] ?? ["Cobb", "Fulton", "Cherokee"];
}

export function getOrderBidEligibility(order: Order, coverages: VendorCountyCoverage[]): BidEligibilityResult {
  return evaluateBidEligibility(coverages, {
    state: order.state,
    county: order.county,
    productType: order.productType,
    requiredSpecialties: requiredSpecialtiesForOrder(order),
    capacityRulesEnabled: true,
    nearbyCounties: getNearbyCountiesForOrder(order)
  });
}

export function buildDirectAssignmentDraft(order: Order, coverage: VendorCountyCoverage): OrderBidWorkflowDraft {
  return {
    orderId: order.id,
    duplicateOrderCreated: false,
    recipientCount: 1,
    statusAfterSend: "Assigned",
    selectedVendorNames: [coverage.displayName],
    requiresCoverageConfirmation: coverage.coverageType !== "direct"
  };
}

export function buildBidRequestDraft(order: Order, coverages: VendorCountyCoverage[]): OrderBidWorkflowDraft {
  return {
    orderId: order.id,
    duplicateOrderCreated: false,
    recipientCount: coverages.length,
    statusAfterSend: "Bidding",
    selectedVendorNames: coverages.map((coverage) => coverage.displayName),
    requiresCoverageConfirmation: coverages.some((coverage) => coverage.eligibilityStatus === "nearby" || coverage.coverageType !== "direct")
  };
}

export function buildPlainOrderHistory(order: Order, user: PortalUser, relationships: OrderRelationshipItem[]) {
  const orderedBy = relationships.find((item) => item.label === "Ordered by")?.value ?? order.client;
  const history = [`Order submitted by ${orderedBy}`];
  for (const item of order.timeline) {
    history.push(`${item.label}: ${item.detail}`);
  }

  if (user.role !== "client_user") {
    for (const item of order.assignmentHistory) {
      const action = item.action === "Accepted"
        ? `Assignment accepted by ${item.appraiser}`
        : item.action === "Declined"
          ? `Assignment declined by ${item.appraiser}`
          : `${item.action} to ${item.appraiser}`;
      history.push(`${action}${item.note ? ` - ${item.note}` : ""}`);
    }

    for (const item of order.auditTrail.slice(0, 6)) {
      history.push(item.action.startsWith("{") ? "Order history updated" : item.action);
    }
  }

  return Array.from(new Set(history)).filter(Boolean);
}
