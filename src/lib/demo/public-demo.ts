import type { NavId } from "@/components/cas/config";
import type { PortalUser } from "@/types/domain";

export type PublicDemoRoleId =
  | "amc-admin"
  | "amc-staff"
  | "lender-amc"
  | "lender-internal"
  | "hybrid-lender"
  | "appraisal-owner"
  | "appraisal-staff"
  | "staff-appraiser"
  | "independent-appraiser"
  | "reviewer"
  | "attorney"
  | "property-owner"
  | "connected-participant";

export type PublicDemoRoleCard = {
  id: PublicDemoRoleId;
  title: string;
  userId: string;
  organizationName: string;
  description: string;
  recommendedView: NavId;
  recommendedOrderId?: string;
};

export type PublicDemoShortcut = {
  id: string;
  label: string;
  description: string;
  userId: string;
  view: NavId;
  orderId?: string;
};

export const publicDemoDataMode = {
  storage: "static-session",
  persistence: "Session-local only; refresh or Reset Demo restores fictional fixtures.",
  externalEffects: "Email, SMS, payment, calendar, webhook, production storage, and vendor invitations are simulated."
} as const;

export const publicDemoRoleCards: PublicDemoRoleCard[] = [
  {
    id: "amc-admin",
    title: "AMC Administrator",
    userId: "user-amc",
    organizationName: "National Valuation Services",
    description: "Run intake, assignment, vendor compliance, bid comparison, delivery, and accounting privacy.",
    recommendedView: "dashboard"
  },
  {
    id: "amc-staff",
    title: "AMC Office Staff",
    userId: "user-amc-staff",
    organizationName: "National Valuation Services",
    description: "Work daily order queues, vendor outreach, documents, and client updates without admin accounting access.",
    recommendedView: "orders"
  },
  {
    id: "lender-amc",
    title: "Lender Using an AMC",
    userId: "user-client",
    organizationName: "HarborPoint Lending",
    description: "Place orders, track milestones, review shared documents, and see only lender-facing fees.",
    recommendedView: "dashboard",
    recommendedOrderId: "ord-1001"
  },
  {
    id: "lender-internal",
    title: "Lender Managing Appraisals Internally",
    userId: "user-lender-internal",
    organizationName: "First Carolina Community Bank",
    description: "Manage internal appraisal work without exposing AMC bidding or vendor margin.",
    recommendedView: "orders",
    recommendedOrderId: "ord-demo-ready"
  },
  {
    id: "hybrid-lender",
    title: "Hybrid Lender",
    userId: "user-hybrid-lender",
    organizationName: "HarborPoint Lending",
    description: "Compare orders handled internally with orders coordinated through an AMC.",
    recommendedView: "orders"
  },
  {
    id: "appraisal-owner",
    title: "Appraisal Company Owner",
    userId: "user-admin",
    organizationName: "CAA Real Property Services",
    description: "Oversee assignments, review, capacity, clients, payroll, invoices, and operating metrics.",
    recommendedView: "dashboard"
  },
  {
    id: "appraisal-staff",
    title: "Appraisal Company Office Staff",
    userId: "user-office",
    organizationName: "CAA Real Property Services",
    description: "Handle intake, order updates, assignment support, documents, messages, and due-date follow-up.",
    recommendedView: "orders"
  },
  {
    id: "staff-appraiser",
    title: "Staff Appraiser",
    userId: "user-appraiser",
    organizationName: "CAA Real Property Services",
    description: "See assigned work, inspections, revisions, documents, and assignment fee without client fee or margin.",
    recommendedView: "orders",
    recommendedOrderId: "ord-1003"
  },
  {
    id: "independent-appraiser",
    title: "Individual Appraiser",
    userId: "user-solo",
    organizationName: "Upstate Appraisal Group",
    description: "Review incoming connected assignments, bid opportunities, personal work, calendar, and pay.",
    recommendedView: "dashboard"
  },
  {
    id: "reviewer",
    title: "Reviewer",
    userId: "user-reviewer",
    organizationName: "CAA Real Property Services",
    description: "Move submitted reports through review, revision requests, approval, and delivery readiness.",
    recommendedView: "review-queue",
    recommendedOrderId: "ord-1009"
  },
  {
    id: "attorney",
    title: "Attorney / Private Client",
    userId: "user-attorney",
    organizationName: "Rowan Legal Group",
    description: "Order and track estate, divorce, litigation, and private appraisal work in plain language.",
    recommendedView: "orders",
    recommendedOrderId: "ord-demo-attorney"
  },
  {
    id: "property-owner",
    title: "Property Owner",
    userId: "user-property-owner",
    organizationName: "Private Property Owner",
    description: "Follow a simple progress tracker, requested documents, client-visible messages, and invoice status.",
    recommendedView: "orders",
    recommendedOrderId: "ord-demo-private"
  },
  {
    id: "connected-participant",
    title: "CAS Connected Participant",
    userId: "user-connected-renee",
    organizationName: "Blue Ridge Valuation",
    description: "Participate in shared orders, bids, documents, messages, and assignment updates without a paid workspace.",
    recommendedView: "connected"
  }
];

export const publicDemoShortcuts: PublicDemoShortcut[] = [
  {
    id: "amc-workflow",
    label: "View AMC Workflow",
    description: "Open the AMC view with intake, assignment, vendor coverage, and delivery work.",
    userId: "user-amc",
    view: "orders",
    orderId: "ord-1006"
  },
  {
    id: "lender-workflow",
    label: "View Lender Workflow",
    description: "Track lender-facing orders without exposing vendor bids or internal margin.",
    userId: "user-client",
    view: "orders",
    orderId: "ord-1001"
  },
  {
    id: "appraiser-workflow",
    label: "View Appraiser Workflow",
    description: "Open an assigned appraiser workbench with inspection and revision context.",
    userId: "user-appraiser",
    view: "orders",
    orderId: "ord-1003"
  },
  {
    id: "private-tracking",
    label: "View Private Client Tracking",
    description: "Open the simplified progress tracker for a private appraisal client.",
    userId: "user-property-owner",
    view: "order-detail",
    orderId: "ord-demo-private"
  },
  {
    id: "direct-assignment",
    label: "Test Direct Assignment",
    description: "Open a needs-assignment file with eligible and excluded vendor coverage.",
    userId: "user-amc",
    view: "order-detail",
    orderId: "ord-1006"
  },
  {
    id: "bid-comparison",
    label: "Test Bid Comparison",
    description: "Compare three fictional bid responses and select a winner without duplicating the order.",
    userId: "user-amc",
    view: "order-detail",
    orderId: "ord-1006"
  },
  {
    id: "report-review",
    label: "View Report Review",
    description: "Open a submitted report waiting on quality review.",
    userId: "user-reviewer",
    view: "order-detail",
    orderId: "ord-1009"
  },
  {
    id: "ready-delivery",
    label: "View Ready for Delivery",
    description: "Open an approved report that is ready for client delivery.",
    userId: "user-reviewer",
    view: "order-detail",
    orderId: "ord-demo-ready"
  },
  {
    id: "accounting-privacy",
    label: "View Accounting Privacy Example",
    description: "See the $600 client fee, $500 vendor fee, and $100 gross spread with role-based privacy.",
    userId: "user-amc",
    view: "order-detail",
    orderId: "ord-demo-fee"
  }
];

export function getPublicDemoDefaultUserId() {
  return publicDemoRoleCards[0].userId;
}

export function getPublicDemoRoleForUser(user: PortalUser) {
  return publicDemoRoleCards.find((role) => role.userId === user.id);
}

export function getPublicDemoRoleByUserId(userId: string) {
  return publicDemoRoleCards.find((role) => role.userId === userId);
}

export function clonePublicDemoFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
