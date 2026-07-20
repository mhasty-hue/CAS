import type {
  BidAward,
  BidRecipient,
  BidRequest,
  BidResponse,
  ConnectedInvitation,
  ConnectedOrderSummary,
  ConnectedParticipant,
  ConnectedUpgradeRecord,
  OrganizationSubscription,
  SubscriptionPlan,
  VendorCountyCoverage
} from "@/types/domain";
import { evaluateBidEligibility } from "@/lib/connected/eligibility";

export const architectureAuditFindings = [
  {
    question: "Invited appraisers have a proper CAS Connected experience",
    finding: "Partially present. Appraisers had a role-specific portal, but free participation was not formally separated from Workspace membership."
  },
  {
    question: "Clients and ordering users have a simplified order-status portal",
    finding: "Partially present. Client users had place-order, my-orders, documents, and messages, but not a dedicated connected summary projection."
  },
  {
    question: "Clients can download permitted documents",
    finding: "Supported through document visibility and private storage, now extended with explicit order document grants."
  },
  {
    question: "Appraisers can download client-supplied documents",
    finding: "Supported for assigned internal appraisers; Phase 10.2 adds explicit cross-organization document grants for Connected appraisers."
  },
  {
    question: "Users can participate without owning a paid Workspace",
    finding: "Now modeled through the free CAS Connected plan and order participation records."
  },
  {
    question: "Upgrade preserves profile, orders, documents, compliance, messages, and history",
    finding: "Now represented by connected upgrade history. The same user identity and order participation records are retained."
  },
  {
    question: "Incoming orders appear in an upgraded appraisal Workspace",
    finding: "Now supported by participant organization access to connected order summaries and incoming-order views without duplicating the master order."
  },
  {
    question: "An order is one shared order or duplicated across organizations",
    finding: "Existing CAS orders are single records. Phase 10.2 formalizes one shared master order with participant-specific views."
  },
  {
    question: "Current RLS supports secure cross-organization participation",
    finding: "Tenant RLS existed, but cross-organization participation required explicit participant, grant, and safe summary policies."
  },
  {
    question: "Bid requests and multi-bid comparison already exist",
    finding: "Not previously present. Phase 10.2 adds master bid requests, recipients, responses, awards, events, and county eligibility."
  },
  {
    question: "Tables, policies, repositories, pages, and workflows requiring changes",
    finding: "Added subscription entitlements, connected order summaries, participants, document/message grants, county coverage, bid tables, new UI views, and authenticated smoke coverage."
  }
];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "plan-connected",
    key: "connected_free",
    name: "CAS Connected",
    audience: "connected",
    description: "Free participation in orders, bids, documents, messages, and assignments sent by another CAS organization.",
    monthlyPriceCents: 0,
    entitlements: ["connected_order_participation", "connected_bid_response", "connected_document_exchange", "connected_messaging", "connected_assignment_updates"]
  },
  {
    id: "plan-workspace-pro",
    key: "workspace_pro",
    name: "CAS Workspace Pro",
    audience: "workspace",
    description: "Full appraisal company operations: orders, users, accounting, payroll, review, automations, analytics, and public ordering.",
    monthlyPriceCents: 24900,
    entitlements: ["full_order_management", "incoming_connected_orders", "client_management", "company_users", "review_management", "documents_communication", "accounting", "payroll", "invoicing", "calendar", "analytics", "imports", "custom_templates", "automations", "integrations", "public_order_page"]
  },
  {
    id: "plan-workspace-amc",
    key: "workspace_amc",
    name: "CAS Workspace AMC",
    audience: "workspace",
    description: "AMC/lender operations with vendor management, county coverage, multi-recipient bidding, compliance, and connected order exchange.",
    monthlyPriceCents: 39900,
    entitlements: ["full_order_management", "incoming_connected_orders", "vendor_management", "bid_management", "county_coverage", "company_users", "review_management", "documents_communication", "accounting", "invoicing", "calendar", "analytics", "imports", "custom_templates", "automations", "integrations", "public_order_page"]
  }
];

export const organizationSubscriptions: OrganizationSubscription[] = [
  {
    id: "sub-firm-workspace",
    organizationId: "org-firm-1",
    planKey: "workspace_pro",
    planName: "CAS Workspace Pro",
    status: "active",
    startedAt: "2026-07-01",
    entitlements: subscriptionPlans[1].entitlements
  },
  {
    id: "sub-amc-workspace",
    organizationId: "org-amc-1",
    planKey: "workspace_amc",
    planName: "CAS Workspace AMC",
    status: "active",
    startedAt: "2026-07-01",
    entitlements: subscriptionPlans[2].entitlements
  },
  {
    id: "sub-client-connected",
    organizationId: "org-client-1",
    planKey: "connected_free",
    planName: "CAS Connected",
    status: "connected_free",
    entitlements: subscriptionPlans[0].entitlements
  },
  {
    id: "sub-vendor-connected",
    organizationId: "org-vendor-1",
    planKey: "connected_free",
    planName: "CAS Connected",
    status: "connected_free",
    entitlements: subscriptionPlans[0].entitlements
  }
];

export const connectedOrderSummaries: ConnectedOrderSummary[] = [
  {
    orderId: "ord-1001",
    owningOrganizationId: "org-firm-1",
    clientOrganizationId: "org-client-1",
    fileNumber: "CAA-26-1048",
    borrowerName: "Avery Mitchell",
    propertyAddress: "1840 Magnolia Trace",
    city: "Marietta",
    state: "GA",
    zip: "30064",
    county: "Cobb",
    productType: "1004 URAR",
    orderedAt: "2026-06-24",
    dueAt: "2026-06-30",
    inspectionAt: "2026-06-27",
    status: "In Review",
    simplifiedStatus: "Report in review",
    assignedSummary: "Assigned to Jordan Lee",
    nextAction: "Reviewer quality check",
    visibleTo: ["primary_owner", "ordering_client", "assigned_appraiser", "reviewer"],
    documentsShared: 5,
    messagesOpen: 2
  },
  {
    orderId: "ord-1002",
    owningOrganizationId: "org-firm-1",
    clientOrganizationId: "org-client-1",
    fileNumber: "CAA-26-1049",
    borrowerName: "Noah Campbell",
    propertyAddress: "510 Lakeview Court",
    city: "Roswell",
    state: "GA",
    zip: "30075",
    county: "Fulton",
    productType: "FHA 1004",
    orderedAt: "2026-06-25",
    dueAt: "2026-07-02",
    inspectionAt: "2026-06-29",
    status: "Revisions Needed",
    simplifiedStatus: "Revision in progress",
    assignedSummary: "Assigned to Priya Shah",
    nextAction: "Appraiser revision response",
    visibleTo: ["primary_owner", "ordering_client", "assigned_appraiser", "reviewer"],
    documentsShared: 7,
    messagesOpen: 3
  },
  {
    orderId: "connected-incoming-1",
    owningOrganizationId: "org-amc-1",
    fileNumber: "PAMC-26-5508",
    borrowerName: "Lena Whitaker",
    propertyAddress: "72 Etowah Ridge",
    city: "Canton",
    state: "GA",
    zip: "30114",
    county: "Cherokee",
    productType: "VA 1004",
    orderedAt: "2026-07-19",
    dueAt: "2026-07-26",
    status: "Assigned",
    simplifiedStatus: "Pending acceptance",
    assignedSummary: "Offered to North Metro Valuation",
    nextAction: "Accept or decline assignment",
    visibleTo: ["amc", "appraisal_company", "assigned_appraiser"],
    documentsShared: 3,
    messagesOpen: 1
  }
];

export const connectedParticipants: ConnectedParticipant[] = [
  {
    id: "participant-owner-1001",
    orderId: "ord-1001",
    participantOrganizationId: "org-firm-1",
    participantName: "CAA Valuation Group",
    participantType: "appraisal_company",
    role: "primary_owner",
    accessStatus: "active",
    permissions: ["manage_connected_order", "view_full_order", "manage_documents", "manage_messages", "manage_accounting"],
    documentVisibility: ["Organization internal", "Assigned appraiser", "Reviewer", "Lender/client", "Delivery recipient"],
    messageChannels: ["internal", "client-facing", "assignment", "review"],
    statusVisibility: "full",
    accountingVisibility: "full",
    startsAt: "2026-06-24"
  },
  {
    id: "participant-client-1001",
    orderId: "ord-1001",
    participantOrganizationId: "org-client-1",
    participantUserId: "user-client",
    participantName: "HarborPoint Lending",
    participantType: "lender_client",
    role: "ordering_client",
    accessStatus: "active",
    permissions: ["view_status", "send_messages", "upload_documents", "download_final_report"],
    documentVisibility: ["Lender/client", "Delivery recipient"],
    messageChannels: ["client-facing"],
    statusVisibility: "client_summary",
    accountingVisibility: "invoice_only",
    startsAt: "2026-06-24"
  },
  {
    id: "participant-appraiser-1001",
    orderId: "ord-1001",
    participantOrganizationId: "org-firm-1",
    participantUserId: "user-appraiser",
    participantName: "Jordan Lee",
    participantType: "individual_appraiser",
    role: "assigned_appraiser",
    accessStatus: "active",
    permissions: ["view_assignment", "schedule_inspection", "update_status", "upload_report", "upload_xml", "upload_invoice", "respond_to_revision"],
    documentVisibility: ["Assigned appraiser", "Lender/client", "Delivery recipient"],
    messageChannels: ["assignment", "client-facing", "revision"],
    statusVisibility: "assignment",
    accountingVisibility: "own_fee",
    startsAt: "2026-06-24"
  },
  {
    id: "participant-incoming-northmetro",
    orderId: "connected-incoming-1",
    participantOrganizationId: "org-vendor-1",
    participantEmail: "renee@northmetro.example",
    participantName: "North Metro Valuation",
    participantType: "appraisal_company",
    role: "appraisal_company",
    accessStatus: "pending_acceptance",
    permissions: ["view_assignment", "accept_assignment", "decline_assignment", "schedule_inspection", "upload_report", "upload_xml", "upload_invoice"],
    documentVisibility: ["Assigned appraiser", "Lender/client"],
    messageChannels: ["assignment"],
    statusVisibility: "assignment",
    accountingVisibility: "own_fee",
    startsAt: "2026-07-19"
  }
];

export const vendorCountyCoverage: VendorCountyCoverage[] = [
  {
    id: "cov-northmetro-cobb",
    displayName: "North Metro Valuation",
    managingOrganizationId: "org-amc-1",
    vendorProfileId: "ven-1",
    vendorOrganizationId: "org-vendor-1",
    state: "GA",
    county: "Cobb",
    coverageType: "direct",
    productTypes: ["1004 URAR", "FHA 1004", "Luxury 1004"],
    specialties: ["FHA", "Conventional", "Luxury"],
    complexPropertyCapable: true,
    ruralCapable: false,
    approvalStatus: "approved",
    licenseStatus: "current",
    eoStatus: "current",
    w9Status: "on_file",
    activeStatus: "active",
    acceptingWork: true,
    blocked: false,
    currentWorkload: 9,
    capacityLimit: 14,
    capacityStatus: "balanced",
    avgTurnDays: 5,
    revisionRate: 4.8,
    distanceMiles: 8.4,
    eligibilityStatus: "eligible",
    reason: "Approved, compliant, and directly covers Cobb County.",
    exclusionReasons: []
  },
  {
    id: "cov-talia-cobb",
    displayName: "Talia Morris Appraisals",
    managingOrganizationId: "org-amc-1",
    appraiserProfileId: "app-4",
    vendorOrganizationId: "org-solo-1",
    vendorUserId: "user-solo",
    state: "GA",
    county: "Cobb",
    coverageType: "direct",
    productTypes: ["1004 URAR", "Desktop", "Review"],
    specialties: ["Conventional", "Review"],
    complexPropertyCapable: false,
    ruralCapable: false,
    approvalStatus: "approved",
    licenseStatus: "current",
    eoStatus: "current",
    w9Status: "on_file",
    activeStatus: "active",
    acceptingWork: true,
    blocked: false,
    currentWorkload: 5,
    capacityLimit: 7,
    capacityStatus: "busy",
    avgTurnDays: 6.1,
    revisionRate: 7.4,
    distanceMiles: 12.6,
    eligibilityStatus: "eligible",
    reason: "Direct county coverage with current compliance.",
    exclusionReasons: []
  },
  {
    id: "cov-ari-cobb",
    displayName: "Ari Bennett",
    managingOrganizationId: "org-firm-1",
    appraiserProfileId: "app-5",
    state: "GA",
    county: "Cobb",
    coverageType: "direct",
    productTypes: ["1004 URAR", "FHA 1004"],
    specialties: ["Conventional", "Rural"],
    complexPropertyCapable: false,
    ruralCapable: true,
    approvalStatus: "approved",
    licenseStatus: "current",
    eoStatus: "current",
    w9Status: "on_file",
    activeStatus: "active",
    acceptingWork: true,
    blocked: false,
    currentWorkload: 3,
    capacityLimit: 8,
    capacityStatus: "available",
    avgTurnDays: 5.4,
    revisionRate: 4.1,
    distanceMiles: 21.1,
    eligibilityStatus: "eligible",
    reason: "Available capacity and direct county coverage.",
    exclusionReasons: []
  },
  {
    id: "cov-peachtree-fulton",
    displayName: "Peachtree Appraisal Group",
    managingOrganizationId: "org-amc-1",
    vendorProfileId: "ven-2",
    state: "GA",
    county: "Fulton",
    coverageType: "direct",
    productTypes: ["VA 1004", "FHA 1004"],
    specialties: ["VA", "FHA", "Rural"],
    complexPropertyCapable: false,
    ruralCapable: true,
    approvalStatus: "pending",
    licenseStatus: "current",
    eoStatus: "current",
    w9Status: "missing",
    activeStatus: "active",
    acceptingWork: true,
    blocked: false,
    currentWorkload: 6,
    capacityLimit: 9,
    capacityStatus: "balanced",
    avgTurnDays: 6,
    revisionRate: 6.2,
    distanceMiles: 17.2,
    eligibilityStatus: "excluded",
    reason: "Missing W-9 and not approved.",
    exclusionReasons: ["Not approved by the sending organization", "W-9 is not on file", "Does not cover the subject county"]
  },
  {
    id: "cov-blueridge-cherokee",
    displayName: "Blue Ridge Review Partners",
    managingOrganizationId: "org-amc-1",
    vendorProfileId: "ven-3",
    state: "GA",
    county: "Cherokee",
    coverageType: "direct",
    productTypes: ["Desktop Review", "Complex 1004", "VA 1004"],
    specialties: ["Review", "Complex", "Acreage"],
    complexPropertyCapable: true,
    ruralCapable: true,
    approvalStatus: "approved",
    licenseStatus: "current",
    eoStatus: "expired",
    w9Status: "on_file",
    activeStatus: "active",
    acceptingWork: true,
    blocked: false,
    currentWorkload: 4,
    capacityLimit: 6,
    capacityStatus: "balanced",
    avgTurnDays: 7,
    revisionRate: 3.9,
    distanceMiles: 24.9,
    eligibilityStatus: "excluded",
    reason: "E&O is not current.",
    exclusionReasons: ["E&O is not current"]
  }
];

export const bidEligibility = evaluateBidEligibility(vendorCountyCoverage, {
  state: "GA",
  county: "Cobb",
  productType: "1004 URAR",
  requiredSpecialties: ["Conventional"],
  capacityRulesEnabled: true,
  nearbyCounties: ["Fulton", "Cherokee", "Douglas"]
});

export const nearbyCountyEligibility = evaluateBidEligibility(vendorCountyCoverage, {
  state: "GA",
  county: "Pickens",
  productType: "VA 1004",
  requiredSpecialties: [],
  capacityRulesEnabled: false,
  nearbyCounties: ["Cherokee"]
});

export const bidRequests: BidRequest[] = [
  {
    id: "bid-1001",
    orderId: "ord-1001",
    sendingOrganizationId: "org-amc-1",
    sendingOrganizationName: "Pioneer AMC",
    subjectAddress: "1840 Magnolia Trace",
    city: "Marietta",
    state: "GA",
    county: "Cobb",
    productType: "1004 URAR",
    assignmentSummary: "Purchase appraisal with standard lender conditions. Contract and engagement letter are available after login.",
    requiredCredentials: ["Certified Residential", "GA license"],
    requiredSpecialties: ["Conventional"],
    bidDeadlineAt: "2026-07-21T16:00:00-04:00",
    requestedDueAt: "2026-07-26",
    status: "open",
    lockResponses: false,
    nearbyCandidateMode: false,
    recipientIds: ["bid-recipient-1", "bid-recipient-2", "bid-recipient-3"]
  }
];

export const bidRecipients: BidRecipient[] = [
  {
    id: "bid-recipient-1",
    bidRequestId: "bid-1001",
    recipientName: "North Metro Valuation",
    recipientOrganizationId: "org-vendor-1",
    recipientEmail: "renee@northmetro.example",
    vendorProfileId: "ven-1",
    coverageCounty: "Cobb",
    coverageMatch: "direct",
    invitationStatus: "responded",
    emailStatus: "responded",
    eligibilitySnapshot: bidEligibility.eligible[0]
  },
  {
    id: "bid-recipient-2",
    bidRequestId: "bid-1001",
    recipientName: "Talia Morris Appraisals",
    recipientOrganizationId: "org-solo-1",
    recipientUserId: "user-solo",
    recipientEmail: "talia@appraisals.example",
    appraiserProfileId: "app-4",
    coverageCounty: "Cobb",
    coverageMatch: "direct",
    invitationStatus: "responded",
    emailStatus: "responded",
    eligibilitySnapshot: bidEligibility.eligible[1]
  },
  {
    id: "bid-recipient-3",
    bidRequestId: "bid-1001",
    recipientName: "Ari Bennett",
    appraiserProfileId: "app-5",
    recipientEmail: "ari@appraisals.example",
    coverageCounty: "Cobb",
    coverageMatch: "direct",
    invitationStatus: "declined",
    emailStatus: "responded",
    eligibilitySnapshot: bidEligibility.eligible[2]
  }
];

export const bidResponses: BidResponse[] = [
  {
    id: "bid-response-1",
    bidRequestId: "bid-1001",
    recipientId: "bid-recipient-1",
    responderName: "Renee Walker",
    proposedFee: 625,
    turnTimeDays: 5,
    inspectionAvailability: "Can inspect Wednesday morning",
    notes: "Direct Cobb coverage and current lender approval.",
    acceptedConditions: true,
    responseStatus: "submitted",
    revisionNumber: 1,
    submittedAt: "2026-07-20T09:25:00-04:00"
  },
  {
    id: "bid-response-2",
    bidRequestId: "bid-1001",
    recipientId: "bid-recipient-2",
    responderName: "Talia Morris",
    proposedFee: 600,
    turnTimeDays: 6,
    inspectionAvailability: "Friday afternoon",
    notes: "Can take assignment but capacity is tight this week.",
    acceptedConditions: true,
    responseStatus: "submitted",
    revisionNumber: 1,
    submittedAt: "2026-07-20T10:40:00-04:00"
  },
  {
    id: "bid-response-3",
    bidRequestId: "bid-1001",
    recipientId: "bid-recipient-3",
    responderName: "Ari Bennett",
    acceptedConditions: false,
    responseStatus: "declined",
    declineReason: "Capacity/workload",
    declineExplanation: "Already at inspection capacity through the deadline.",
    revisionNumber: 1,
    submittedAt: "2026-07-20T11:05:00-04:00"
  }
];

export const bidAwards: BidAward[] = [
  {
    id: "bid-award-1",
    bidRequestId: "bid-1001",
    orderId: "ord-1001",
    recipientId: "bid-recipient-1",
    responseId: "bid-response-1",
    winnerName: "North Metro Valuation",
    status: "pending_acceptance",
    assignmentStatus: "pending_acceptance",
    awardedAt: "2026-07-20T13:20:00-04:00"
  }
];

export const connectedInvitations: ConnectedInvitation[] = [
  {
    id: "connected-invite-bid-1",
    organizationId: "org-amc-1",
    invitedEmail: "renee@northmetro.example",
    invitationType: "bid",
    status: "sent",
    orderId: "ord-1001",
    bidRequestId: "bid-1001",
    expiresAt: "2026-07-21T16:00:00-04:00"
  },
  {
    id: "connected-invite-assignment-1",
    organizationId: "org-amc-1",
    invitedEmail: "renee@northmetro.example",
    invitationType: "assignment",
    status: "sent",
    orderId: "connected-incoming-1",
    expiresAt: "2026-07-22T16:00:00-04:00"
  }
];

export const connectedUpgradeHistory: ConnectedUpgradeRecord[] = [
  {
    id: "upgrade-northmetro-1",
    userId: "user-connected-renee",
    workspaceOrganizationId: "org-vendor-1",
    status: "completed",
    preservedOrderCount: 12,
    preservedDocumentCount: 43,
    preservedMessageCount: 96,
    createdAt: "2026-07-18T15:30:00-04:00"
  }
];

export const bidEmailPreview = {
  subject: "New appraisal bid opportunity in CAS",
  body: "You have received a new appraisal bid opportunity from Pioneer AMC. Log in to CAS to review the assignment details and submit your proposed fee and turn time.",
  fields: ["Requesting organization", "Property address", "Appraisal type", "Bid deadline", "Secure review link"],
  omitted: ["Other bidder names", "Other bids", "Internal rankings", "Client billing", "AMC margin", "Internal notes"]
};
