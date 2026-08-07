import type {
  AccountingEntry,
  AutomationRule,
  AutomationRun,
  CommunicationEvent,
  DeliveryRecord,
  DocumentAuditEvent,
  EmailDeliveryRecord,
  IntegrationLog,
  IntegrationSetting,
  Invoice,
  InvoiceSettings,
  ManagedDocument,
  NotificationQueueItem,
  NotificationPreference,
  NotificationTemplate,
  NotificationReminderState,
  OrderMessage,
  OrganizationInvitation,
  Organization,
  OrganizationNotificationSettings,
  PortalUser,
  PublicOrderRequest,
  PublicOrderSettings,
  ReportSubmission,
  RequiredDocumentRule,
  RevisionRequest,
  ReviewQueueItem,
  ScheduledJob,
  VendorDocument,
  WebhookEvent,
  WorkflowTask
} from "@/types/domain";

export const organizations: Organization[] = [
  {
    id: "org-firm-1",
    name: "CAA Real Property Services",
    slug: "caa-valuation",
    type: "appraisal_firm",
    status: "Active",
    primaryContact: "Nora Fields",
    email: "ops@caavaluation.example",
    phone: "(404) 555-0100",
    address: "1100 Circle 75 Pkwy, Atlanta, GA",
    timezone: "America/New_York"
  },
  {
    id: "org-amc-1",
    name: "National Valuation Services",
    slug: "national-valuation-services",
    type: "amc",
    status: "Active",
    primaryContact: "Derek Sloan",
    email: "vendors@nationalvaluation.example",
    phone: "(404) 555-0191",
    address: "2555 Cumberland Pkwy, Atlanta, GA",
    timezone: "America/New_York"
  },
  {
    id: "org-client-1",
    name: "HarborPoint Lending",
    slug: "harborpoint-lending",
    type: "lender_client",
    status: "Active",
    primaryContact: "Claire Moon",
    email: "orders@harborpoint.example",
    phone: "(404) 555-0144",
    address: "200 Market Street, Savannah, GA",
    timezone: "America/New_York"
  },
  {
    id: "org-vendor-1",
    name: "North Metro Valuation",
    slug: "north-metro-valuation",
    type: "solo_appraiser",
    status: "Approved",
    primaryContact: "Renee Walker",
    email: "renee@northmetro.example",
    phone: "(678) 555-0185",
    address: "44 Church Street, Marietta, GA",
    timezone: "America/New_York"
  },
  {
    id: "org-solo-1",
    name: "Upstate Appraisal Group",
    slug: "upstate-appraisal-group",
    type: "solo_appraiser",
    status: "Active",
    primaryContact: "Talia Morris",
    email: "talia@appraisals.example",
    phone: "(770) 555-0168",
    address: "88 West Paces Ferry, Atlanta, GA",
    timezone: "America/New_York"
  },
  {
    id: "org-client-2",
    name: "First Carolina Community Bank",
    slug: "first-carolina-community-bank",
    type: "lender_client",
    status: "Active",
    primaryContact: "Iris Coleman",
    email: "appraisals@firstcarolina.example",
    phone: "(864) 555-0127",
    address: "410 River Street, Greenville, SC",
    timezone: "America/New_York"
  },
  {
    id: "org-firm-2",
    name: "Blue Ridge Valuation",
    slug: "blue-ridge-valuation",
    type: "appraisal_firm",
    status: "Active",
    primaryContact: "Renee Walker",
    email: "connected@blueridgevaluation.example",
    phone: "(828) 555-0164",
    address: "118 Maple Walk, Asheville, NC",
    timezone: "America/New_York"
  },
  {
    id: "org-private-attorney",
    name: "Rowan Legal Group",
    slug: "rowan-legal-group",
    type: "lender_client",
    status: "Active",
    primaryContact: "Elise Rowan",
    email: "orders@rowanlegal.example",
    phone: "(919) 555-0188",
    address: "75 Court Square, Raleigh, NC",
    timezone: "America/New_York"
  },
  {
    id: "org-private-owner",
    name: "Private Property Owner",
    slug: "private-property-owner",
    type: "lender_client",
    status: "Active",
    primaryContact: "Elena Park",
    email: "elena.park@example.com",
    phone: "(704) 555-0173",
    address: "12 Garden Lane, Charlotte, NC",
    timezone: "America/New_York"
  },
  {
    id: "org-private-estate",
    name: "Hollis Estate Representative",
    slug: "hollis-estate-representative",
    type: "lender_client",
    status: "Active",
    primaryContact: "Grant Hollis",
    email: "grant.hollis@example.com",
    phone: "(803) 555-0136",
    address: "240 Oak Registry, Columbia, SC",
    timezone: "America/New_York"
  }
];

export const portalUsers: PortalUser[] = [
  {
    id: "user-admin",
    name: "Nora Fields",
    firstName: "Nora",
    preferredName: "Nora",
    timezone: "America/New_York",
    email: "nora@caavaluation.example",
    role: "company_admin",
    organizationId: "org-firm-1",
    title: "Company Admin"
  },
  {
    id: "user-office",
    name: "Mina Patel",
    firstName: "Mina",
    preferredName: "Mina",
    timezone: "America/New_York",
    email: "mina@caavaluation.example",
    role: "office_staff",
    organizationId: "org-firm-1",
    title: "Office Staff"
  },
  {
    id: "user-appraiser",
    name: "Jordan Lee",
    firstName: "Jordan",
    preferredName: "Jordan",
    timezone: "America/New_York",
    email: "jordan@caavaluation.example",
    role: "appraiser",
    organizationId: "org-firm-1",
    title: "Staff Appraiser",
    appraiserName: "Jordan Lee"
  },
  {
    id: "user-reviewer",
    name: "Maya Chen",
    firstName: "Maya",
    preferredName: "Maya",
    timezone: "America/New_York",
    email: "maya@caavaluation.example",
    role: "reviewer",
    organizationId: "org-firm-1",
    title: "Reviewer"
  },
  {
    id: "user-amc",
    name: "Derek Sloan",
    firstName: "Derek",
    preferredName: "Derek",
    timezone: "America/New_York",
    email: "derek@nationalvaluation.example",
    role: "amc_admin",
    organizationId: "org-amc-1",
    title: "AMC Admin"
  },
  {
    id: "user-client",
    name: "Claire Moon",
    firstName: "Claire",
    preferredName: "Claire",
    timezone: "America/New_York",
    email: "claire@harborpoint.example",
    role: "client_user",
    organizationId: "org-client-1",
    title: "Lender Client",
    clientName: "HarborPoint Lending"
  },
  {
    id: "user-solo",
    name: "Talia Morris",
    firstName: "Talia",
    preferredName: "Talia",
    timezone: "America/New_York",
    email: "talia@appraisals.example",
    role: "solo_appraiser",
    organizationId: "org-solo-1",
    title: "Solo Appraiser",
    appraiserName: "Talia Morris"
  },
  {
    id: "user-amc-staff",
    name: "Riley Ortiz",
    firstName: "Riley",
    preferredName: "Riley",
    timezone: "America/New_York",
    email: "riley@nationalvaluation.example",
    role: "amc_staff",
    organizationId: "org-amc-1",
    title: "AMC Office Staff"
  },
  {
    id: "user-lender-internal",
    name: "Iris Coleman",
    firstName: "Iris",
    preferredName: "Iris",
    timezone: "America/New_York",
    email: "iris@firstcarolina.example",
    role: "client_user",
    organizationId: "org-client-2",
    title: "Lender Administrator",
    clientName: "First Carolina Community Bank"
  },
  {
    id: "user-hybrid-lender",
    name: "Theo Barnes",
    firstName: "Theo",
    preferredName: "Theo",
    timezone: "America/New_York",
    email: "theo@harborpoint.example",
    role: "client_user",
    organizationId: "org-client-1",
    title: "Hybrid Lender",
    clientName: "HarborPoint Lending"
  },
  {
    id: "user-attorney",
    name: "Elise Rowan",
    firstName: "Elise",
    preferredName: "Elise",
    timezone: "America/New_York",
    email: "elise@rowanlegal.example",
    role: "client_user",
    organizationId: "org-private-attorney",
    title: "Attorney",
    clientName: "Rowan Legal Group"
  },
  {
    id: "user-property-owner",
    name: "Elena Park",
    firstName: "Elena",
    preferredName: "Elena",
    timezone: "America/New_York",
    email: "elena.park@example.com",
    role: "client_user",
    organizationId: "org-private-owner",
    title: "Property Owner",
    clientName: "Elena Park"
  },
  {
    id: "user-connected-renee",
    name: "Renee Walker",
    firstName: "Renee",
    preferredName: "Renee",
    timezone: "America/New_York",
    email: "renee@blueridgevaluation.example",
    role: "solo_appraiser",
    organizationId: "org-firm-2",
    title: "CAS Connected Participant",
    appraiserName: "Renee Walker"
  }
];

export const organizationInvitations: OrganizationInvitation[] = [
  {
    id: "invite-1",
    organizationId: "org-firm-1",
    email: "caroline@caavaluation.example",
    invitedName: "Caroline Brooks",
    role: "office_staff",
    permissions: ["view_all_orders", "create_orders", "assign_orders", "upload_documents"],
    status: "Pending",
    token: "invite-caa-office-2026",
    invitedBy: "Nora Fields",
    expiresAt: "2026-07-17",
    note: "Office coordinator invite for order intake and assignment support."
  },
  {
    id: "invite-2",
    organizationId: "org-amc-1",
    email: "vendor-admin@northmetro.example",
    invitedName: "North Metro Vendor Admin",
    role: "solo_appraiser",
    permissions: ["view_own_orders_only", "upload_documents", "view_own_pay"],
    status: "Pending",
    token: "invite-vendor-northmetro-2026",
    invitedBy: "Derek Sloan",
    expiresAt: "2026-07-20",
    note: "Vendor appraisal company onboarding."
  }
];

export const publicOrderSettings: PublicOrderSettings[] = [
  {
    id: "public-settings-caa",
    organizationId: "org-firm-1",
    enabled: true,
    publicSlug: "caa-valuation",
    buttonLabel: "Order an appraisal",
    brandName: "CAA Real Property Services",
    brandColor: "#2276d2",
    confirmationMessage: "Thanks. Our appraisal team will review your request and contact you before opening a formal assignment.",
    notificationRecipients: ["ops@caavaluation.example", "nora@caavaluation.example"],
    requiredFields: ["requesterName", "email", "phone", "propertyAddress", "purpose", "consentAccepted"],
    customQuestions: [
      { id: "cq-1", label: "Is there a preferred inspection date or access window?", required: false },
      { id: "cq-2", label: "Is this appraisal connected to a legal deadline?", required: false }
    ],
    updatedAt: "2026-07-09"
  },
  {
    id: "public-settings-solo",
    organizationId: "org-solo-1",
    enabled: true,
    publicSlug: "talia-morris-appraisals",
    buttonLabel: "Request appraisal help",
    brandName: "Upstate Appraisal Group",
    brandColor: "#0f766e",
    confirmationMessage: "Your request has been received. Talia will confirm scope, timing, and fee before beginning work.",
    notificationRecipients: ["talia@appraisals.example"],
    requiredFields: ["requesterName", "email", "propertyAddress", "purpose", "consentAccepted"],
    customQuestions: [{ id: "cq-3", label: "Do you need a retrospective effective date?", required: false }],
    updatedAt: "2026-07-09"
  }
];

export const publicOrderRequests: PublicOrderRequest[] = [
  {
    id: "public-req-1",
    organizationId: "org-firm-1",
    requesterName: "Elaine Porter",
    email: "elaine.porter@example.com",
    phone: "(404) 555-0122",
    propertyAddress: "419 West Wesley Road NW, Atlanta, GA 30305",
    propertyType: "Single family",
    purpose: "Estate",
    intendedUse: "Estate settlement and date-of-death value support",
    ownerBorrowerName: "James Porter Estate",
    accessContact: "Elaine Porter, daughter and executor",
    preferredContactMethod: "Email",
    requestedTiming: "Within two weeks",
    comments: "Attorney asked for an appraisal with a retrospective effective date.",
    consentAccepted: true,
    documentCount: 2,
    status: "Pending review",
    submittedAt: "2026-07-09T16:20:00Z",
    auditTrail: [
      { id: "public-req-1-audit-1", action: "Public request submitted", actor: "Elaine Porter", at: "Jul 9, 4:20 PM" }
    ]
  },
  {
    id: "public-req-2",
    organizationId: "org-solo-1",
    requesterName: "Marcus Bell",
    email: "marcus.bell@example.com",
    phone: "(770) 555-0113",
    propertyAddress: "805 Cherokee Street, Marietta, GA 30060",
    propertyType: "Townhome",
    purpose: "Pre-listing",
    intendedUse: "Pricing decision before listing",
    ownerBorrowerName: "Marcus Bell",
    accessContact: "Owner",
    preferredContactMethod: "Text",
    requestedTiming: "This week if possible",
    comments: "Owner has recent renovation receipts ready to upload.",
    consentAccepted: true,
    documentCount: 1,
    status: "Pending review",
    submittedAt: "2026-07-10T10:12:00Z",
    auditTrail: [
      { id: "public-req-2-audit-1", action: "Public request submitted", actor: "Marcus Bell", at: "Today, 10:12 AM" }
    ]
  }
];

export const vendorDocuments: VendorDocument[] = [
  { id: "vd-1", vendorId: "ven-1", type: "License", status: "Approved", uploadedAt: "Jun 20", expiresAt: "2027-05-31" },
  { id: "vd-2", vendorId: "ven-1", type: "E&O", status: "Approved", uploadedAt: "Jun 20", expiresAt: "2027-03-15" },
  { id: "vd-3", vendorId: "ven-1", type: "W-9", status: "Approved", uploadedAt: "Jun 20" },
  { id: "vd-4", vendorId: "ven-2", type: "W-9", status: "Missing", uploadedAt: "Not uploaded" },
  { id: "vd-5", vendorId: "ven-2", type: "E&O", status: "Needs review", uploadedAt: "Jun 28", expiresAt: "2026-12-31" },
  { id: "vd-6", vendorId: "ven-3", type: "E&O", status: "Expired", uploadedAt: "May 2", expiresAt: "2026-06-15" }
];

export const managedDocuments: ManagedDocument[] = [
  {
    id: "doc-1001-order",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    uploaderId: "user-office",
    uploaderName: "Mina Patel",
    category: "Appraisal order",
    fileName: "CAA-26-1048-order.pdf",
    displayName: "Client order package",
    fileType: "application/pdf",
    fileSizeBytes: 842112,
    storagePath: "organizations/org-firm-1/orders/ord-1001/documents/CAA-26-1048-order-v1.pdf",
    versionNumber: 1,
    visibility: "Organization internal",
    source: "Internal staff upload",
    uploadedAt: "2026-06-24T13:44:00Z",
    description: "Original lender order package with contact and scope notes.",
    tags: ["intake", "lender", "scope"],
    status: "Uploaded",
    checksum: "sha256-demo-order-1001",
    auditMetadata: { createdBy: "Mina Patel", lastAction: "Uploaded", lastActionAt: "Jun 24, 1:44 PM", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: [
      { id: "docv-1001-order-1", documentId: "doc-1001-order", versionNumber: 1, fileName: "CAA-26-1048-order.pdf", storagePath: "organizations/org-firm-1/orders/ord-1001/documents/CAA-26-1048-order-v1.pdf", uploadedBy: "Mina Patel", uploadedAt: "Jun 24, 1:44 PM", checksum: "sha256-demo-order-1001" }
    ]
  },
  {
    id: "doc-1001-report",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    uploaderId: "user-appraiser",
    uploaderName: "Jordan Lee",
    category: "Appraisal report PDF",
    fileName: "CAA-26-1048-report-v2.pdf",
    displayName: "Submitted appraisal report",
    fileType: "application/pdf",
    fileSizeBytes: 4219981,
    storagePath: "organizations/org-firm-1/orders/ord-1001/documents/CAA-26-1048-report-v2.pdf",
    versionNumber: 2,
    visibility: "Reviewer",
    source: "Appraiser upload",
    uploadedAt: "2026-07-10T09:30:00Z",
    description: "Updated report version after reviewer exhibit request.",
    tags: ["report", "review", "final-candidate"],
    status: "Final",
    checksum: "sha256-demo-report-1001-v2",
    auditMetadata: { createdBy: "Jordan Lee", lastAction: "Version replaced", lastActionAt: "Today, 9:30 AM", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: [
      { id: "docv-1001-report-1", documentId: "doc-1001-report", versionNumber: 1, fileName: "CAA-26-1048-report-v1.pdf", storagePath: "organizations/org-firm-1/orders/ord-1001/documents/CAA-26-1048-report-v1.pdf", uploadedBy: "Jordan Lee", uploadedAt: "Jul 9, 3:48 PM", checksum: "sha256-demo-report-1001-v1", changeNote: "Initial submitted report." },
      { id: "docv-1001-report-2", documentId: "doc-1001-report", versionNumber: 2, fileName: "CAA-26-1048-report-v2.pdf", storagePath: "organizations/org-firm-1/orders/ord-1001/documents/CAA-26-1048-report-v2.pdf", uploadedBy: "Jordan Lee", uploadedAt: "Today, 9:30 AM", checksum: "sha256-demo-report-1001-v2", changeNote: "Added contract addendum and corrected map exhibit." }
    ]
  },
  {
    id: "doc-1001-xml",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    uploaderId: "user-appraiser",
    uploaderName: "Jordan Lee",
    category: "Appraisal XML",
    fileName: "CAA-26-1048.xml",
    displayName: "MISMO XML export",
    fileType: "application/xml",
    fileSizeBytes: 318624,
    storagePath: "organizations/org-firm-1/orders/ord-1001/documents/CAA-26-1048-v2.xml",
    versionNumber: 2,
    visibility: "Reviewer",
    source: "Appraiser upload",
    uploadedAt: "2026-07-10T09:31:00Z",
    description: "XML package paired with the submitted report.",
    tags: ["xml", "delivery"],
    status: "Uploaded",
    checksum: "sha256-demo-xml-1001-v2",
    auditMetadata: { createdBy: "Jordan Lee", lastAction: "Uploaded", lastActionAt: "Today, 9:31 AM", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: []
  },
  {
    id: "doc-1008-uad-package",
    organizationId: "org-firm-1",
    orderId: "ord-1008",
    uploaderId: "user-appraiser",
    uploaderName: "Priya Shah",
    category: "UAD 3.6 data package",
    fileName: "CAA-26-1055-uad36-package.zip",
    displayName: "UAD 3.6 data package",
    fileType: "application/zip",
    fileSizeBytes: 1284044,
    storagePath: "organizations/org-firm-1/orders/ord-1008/documents/CAA-26-1055-uad36-package.zip",
    versionNumber: 1,
    visibility: "Reviewer",
    source: "Appraiser upload",
    uploadedAt: "2026-07-01T17:30:00Z",
    description: "Placeholder UAD 3.6 dataset for readiness and UCDP validation checks.",
    tags: ["uad-3-6", "mismo", "readiness"],
    status: "Needs classification",
    checksum: "sha256-demo-uad36-1008",
    auditMetadata: { createdBy: "Priya Shah", lastAction: "Uploaded", lastActionAt: "Jul 1, 5:30 PM", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: []
  },
  {
    id: "doc-1002-revision",
    organizationId: "org-firm-1",
    orderId: "ord-1002",
    uploaderId: "user-reviewer",
    uploaderName: "Evan Brooks",
    category: "Revision request",
    fileName: "CAA-26-1049-revision-request.pdf",
    displayName: "FHA repair revision request",
    fileType: "application/pdf",
    fileSizeBytes: 184220,
    storagePath: "organizations/org-firm-1/orders/ord-1002/documents/CAA-26-1049-revision-request.pdf",
    versionNumber: 1,
    visibility: "Assigned appraiser",
    source: "Reviewer upload",
    uploadedAt: "2026-07-09T14:12:00Z",
    description: "Reviewer-marked FHA repair comments and exhibit references.",
    tags: ["revision", "fha", "repair"],
    status: "Uploaded",
    auditMetadata: { createdBy: "Evan Brooks", lastAction: "Uploaded", lastActionAt: "Jul 9, 2:12 PM", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: []
  },
  {
    id: "doc-vendor-eo",
    organizationId: "org-amc-1",
    vendorId: "ven-2",
    uploaderId: "user-amc",
    uploaderName: "Derek Sloan",
    category: "E&O insurance",
    fileName: "north-metro-eo.pdf",
    displayName: "North Metro E&O policy",
    fileType: "application/pdf",
    fileSizeBytes: 524000,
    storagePath: "organizations/org-amc-1/vendors/ven-2/compliance/north-metro-eo.pdf",
    versionNumber: 1,
    visibility: "Vendor",
    source: "AMC upload",
    uploadedAt: "2026-06-28T12:00:00Z",
    description: "Vendor compliance E&O document pending approval.",
    tags: ["vendor", "compliance", "insurance"],
    status: "Needs classification",
    auditMetadata: { createdBy: "Derek Sloan", lastAction: "Uploaded", lastActionAt: "Jun 28, 12:00 PM", virusScanStatus: "Queued", duplicateDetection: "Not checked" },
    versions: []
  }
];

export const requiredDocumentRules: RequiredDocumentRule[] = [
  { id: "rule-purchase-contract", organizationId: "org-firm-1", productType: "1004 URAR", loanType: "Purchase", workflowStage: "Intake", category: "Purchase contract", label: "Purchase contract required for purchase assignments", required: true },
  { id: "rule-final-pdf", organizationId: "org-firm-1", workflowStage: "Submission", category: "Appraisal report PDF", label: "Final submission requires report PDF", required: true },
  { id: "rule-final-xml", organizationId: "org-firm-1", workflowStage: "Submission", category: "Appraisal XML", label: "Final submission requires XML", required: true },
  { id: "rule-uad36-package", organizationId: "org-firm-1", productType: "UAD 3.6 URAR", workflowStage: "Submission", category: "UAD 3.6 data package", label: "UAD 3.6 assignments require a validated data package", required: true },
  { id: "rule-private-engagement", organizationId: "org-firm-1", appraisalPurpose: "Estate", workflowStage: "Intake", category: "Engagement letter", label: "Private estate appraisal requires engagement letter", required: true },
  { id: "rule-vendor-w9", organizationId: "org-amc-1", workflowStage: "Vendor approval", category: "W-9", label: "Vendor approval requires W-9", required: true },
  { id: "rule-vendor-eo", organizationId: "org-amc-1", workflowStage: "Vendor approval", category: "E&O insurance", label: "Vendor approval requires E&O insurance", required: true },
  { id: "rule-vendor-license", organizationId: "org-amc-1", workflowStage: "Vendor approval", category: "Appraiser license", label: "Vendor approval requires current license", required: true }
];

export const orderMessages: OrderMessage[] = [
  {
    id: "msg-1001-1",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    sender: "Maya Chen",
    senderRole: "reviewer",
    recipients: ["Nora Fields", "Jordan Lee"],
    visibility: "Internal team",
    body: "@Nora please confirm whether the contract addendum can be client-visible before final delivery.",
    attachmentIds: ["doc-1001-report"],
    createdAt: "Today, 9:45 AM",
    readBy: ["Maya Chen"],
    pinned: true,
    channel: "Reviewer comment",
    relatedDocumentId: "doc-1001-report",
    assignedFollowUpOwner: "Nora Fields",
    followUpDueDate: "2026-07-10",
    auditMetadata: { createdBy: "Maya Chen", externalDelivery: "Not sent" }
  },
  {
    id: "msg-1001-2",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    sender: "CAS Workflow",
    senderRole: "company_admin",
    recipients: ["Maya Chen"],
    visibility: "Reviewer",
    body: "Updated report and XML were uploaded. Reviewer notification queued according to notification preferences.",
    attachmentIds: ["doc-1001-report", "doc-1001-xml"],
    createdAt: "Today, 9:32 AM",
    readBy: ["Maya Chen", "Nora Fields"],
    pinned: false,
    channel: "System activity",
    relatedDocumentId: "doc-1001-report",
    auditMetadata: { createdBy: "CAS Workflow", externalDelivery: "Queued" }
  },
  {
    id: "msg-1002-1",
    organizationId: "org-firm-1",
    orderId: "ord-1002",
    sender: "Evan Brooks",
    senderRole: "reviewer",
    recipients: ["Priya Shah"],
    visibility: "Assigned appraiser",
    body: "Please respond item by item to the FHA repair commentary before uploading the revised report.",
    attachmentIds: ["doc-1002-revision"],
    createdAt: "Jul 9, 2:18 PM",
    readBy: ["Evan Brooks"],
    pinned: false,
    channel: "Revision request",
    relatedRevisionId: "rev-1002-fha",
    auditMetadata: { createdBy: "Evan Brooks", externalDelivery: "Not sent" }
  }
];

export const revisionRequests: RevisionRequest[] = [
  {
    id: "rev-1002-fha",
    organizationId: "org-firm-1",
    orderId: "ord-1002",
    requestor: "Evan Brooks",
    receivedAt: "2026-07-09",
    source: "Reviewer",
    category: "FHA repair commentary",
    priority: "Rush",
    dueDate: "2026-07-10",
    clientVisibleWording: "The report is being updated to clarify FHA repair commentary.",
    internalReviewerWording: "Clarify repair condition, photo reference, and cost-to-cure support.",
    assignedAppraiser: "Priya Shah",
    status: "In Progress",
    items: [
      { id: "revitem-1002-1", label: "Add photo reference for damaged fascia", relatedPageSection: "Subject improvements", relatedDocumentId: "doc-1002-revision", response: "Photo 14 added with comment.", completed: true, attachmentIds: [], reviewerApproved: false, conversationMessageIds: ["msg-1002-1"], history: [{ at: "Jul 9, 2:18 PM", actor: "Evan Brooks", action: "Revision item created" }] },
      { id: "revitem-1002-2", label: "Clarify whether repair is required prior to closing", relatedPageSection: "FHA VC sheet", response: "", completed: false, attachmentIds: [], reviewerApproved: false, conversationMessageIds: ["msg-1002-1"], history: [{ at: "Jul 9, 2:18 PM", actor: "Evan Brooks", action: "Revision item created" }] }
    ],
    auditTrail: [
      { id: "rev-1002-audit-1", action: "Revision created", actor: "Evan Brooks", at: "Jul 9, 2:18 PM" },
      { id: "rev-1002-audit-2", action: "Assigned to Priya Shah", actor: "Nora Fields", at: "Jul 9, 2:31 PM" }
    ]
  }
];

export const reportSubmissions: ReportSubmission[] = [
  {
    id: "submission-1001",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    submittedBy: "Jordan Lee",
    submittedAt: "Today, 9:32 AM",
    reportPdfDocumentId: "doc-1001-report",
    xmlDocumentId: "doc-1001-xml",
    supportingDocumentIds: ["doc-1001-order"],
    submissionNote: "Updated report package includes addendum and XML.",
    certificationAccepted: true,
    status: "Submitted"
  }
];

export const deliveryRecords: DeliveryRecord[] = [
  {
    id: "delivery-1001",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    recipientName: "Claire Moon",
    recipientEmail: "claire@harborpoint.example",
    fileIds: ["doc-1001-report", "doc-1001-xml"],
    deliveryNote: "Final report package pending reviewer approval.",
    secureLink: "https://cas.example/deliveries/delivery-1001",
    status: "Ready",
    losHookStatus: "Not configured",
    emailHookStatus: "Development log"
  }
];

export const documentAuditEvents: DocumentAuditEvent[] = [
  { id: "audit-doc-1", organizationId: "org-firm-1", orderId: "ord-1001", documentId: "doc-1001-report", event: "Version replaced", actor: "Jordan Lee", at: "Today, 9:30 AM", detail: "Report PDF replaced with version 2." },
  { id: "audit-doc-2", organizationId: "org-firm-1", orderId: "ord-1001", messageId: "msg-1001-1", event: "Message sent", actor: "Maya Chen", at: "Today, 9:45 AM", detail: "Reviewer comment created with internal visibility." },
  { id: "audit-doc-3", organizationId: "org-firm-1", orderId: "ord-1002", revisionId: "rev-1002-fha", event: "Revision created", actor: "Evan Brooks", at: "Jul 9, 2:18 PM", detail: "FHA repair revision request opened." }
];

export const accountingEntries: AccountingEntry[] = [
  {
    id: "acct-1",
    orderId: "ord-1001",
    client: "HarborPoint Lending",
    appraiser: "Jordan Lee",
    productType: "1004 URAR",
    county: "Cobb",
    completedAt: "2026-06-30",
    fee: 575,
    techFee: 25,
    otherNonCommissionableFees: 50,
    commissionSplit: 50,
    defaultAppraiserSplit: 60,
    orderSplitOverride: 50,
    commissionableBase: 500,
    calculatedPayout: 250,
    finalPayout: 250,
    calculationSource: "Order split override",
    appraiserSplit: 250,
    companyRevenue: 250,
    status: "Ready to invoice",
    month: "2026-06"
  },
  {
    id: "acct-2",
    orderId: "ord-1002",
    client: "Northstar Mortgage",
    appraiser: "Priya Shah",
    productType: "FHA 1004",
    county: "Fulton",
    completedAt: "2026-06-30",
    fee: 650,
    techFee: 35,
    commissionSplit: 58,
    defaultAppraiserSplit: 58,
    fixedPayoutOverride: 125,
    commissionableBase: 615,
    calculatedPayout: 357,
    finalPayout: 125,
    calculationSource: "Fixed order payout",
    manualAdjustmentReason: "Fixed reviewer-approved payout for demo correction.",
    appraiserSplit: 125,
    companyRevenue: 490,
    status: "Payout pending",
    month: "2026-06"
  },
  {
    id: "acct-3",
    orderId: "ord-1005",
    client: "Seaside Bank",
    appraiser: "Talia Morris",
    productType: "Luxury 1004",
    county: "Fulton",
    completedAt: "2026-06-21",
    fee: 725,
    techFee: 35,
    commissionSplit: 63,
    defaultAppraiserSplit: 70,
    orderSplitOverride: 63,
    commissionableBase: 690,
    calculatedPayout: 435,
    finalPayout: 435,
    calculationSource: "Order split override",
    appraiserSplit: 435,
    companyRevenue: 255,
    status: "Paid",
    month: "2026-06",
    paidAt: "2026-06-28",
    approvedBy: "Nora Fields",
    approvedDate: "2026-06-28",
    locked: true,
    payrollSnapshot: {
      grossFee: 725,
      techFee: 35,
      otherNonCommissionableFees: 0,
      commissionableBase: 690,
      defaultAppraiserSplit: 70,
      orderSplitOverride: 63,
      calculatedPayout: 435,
      finalPayout: 435,
      calculationSource: "Order split override",
      approvedBy: "Nora Fields",
      approvedDate: "2026-06-28",
      locked: true
    }
  },
  {
    id: "acct-4",
    orderId: "ord-1009",
    client: "RidgeLine Bank",
    appraiser: "Jordan Lee",
    productType: "2055 Exterior",
    county: "Cherokee",
    completedAt: "2026-07-03",
    fee: 550,
    techFee: 25,
    commissionSplit: 60,
    defaultAppraiserSplit: 60,
    commissionableBase: 525,
    calculatedPayout: 315,
    finalPayout: 315,
    calculationSource: "Appraiser default split",
    appraiserSplit: 315,
    companyRevenue: 210,
    status: "Unpaid",
    month: "2026-07"
  },
  {
    id: "acct-5",
    orderId: "ord-1010",
    client: "Summit Credit Union",
    appraiser: "Unassigned",
    productType: "1004 URAR",
    county: "Douglas",
    completedAt: "2026-07-04",
    fee: 540,
    techFee: 25,
    commissionSplit: 50,
    commissionableBase: 515,
    calculatedPayout: 258,
    finalPayout: 258,
    calculationSource: "Organization default split",
    appraiserSplit: 258,
    companyRevenue: 257,
    status: "Unpaid",
    month: "2026-07"
  }
];

export const invoices: Invoice[] = [
  {
    id: "inv-1001",
    organizationId: "org-firm-1",
    invoiceNumber: "CAA-INV-260101",
    client: "HarborPoint Lending",
    billingParty: "HarborPoint Lending",
    billToContact: "Claire Moon",
    amount: 3275,
    subtotal: 3275,
    taxAmount: 0,
    balanceDue: 3275,
    status: "Sent",
    dueDate: "2026-07-15",
    orderCount: 5,
    paymentTerms: "Net 15",
    notes: "Appraisal services billed by monthly lender statement.",
    sentDate: "2026-07-01"
  },
  {
    id: "inv-1002",
    organizationId: "org-firm-1",
    invoiceNumber: "CAA-INV-260102",
    client: "National Valuation Services",
    billingParty: "National Valuation Services",
    billToContact: "Derek Sloan",
    amount: 4180,
    subtotal: 4180,
    taxAmount: 0,
    balanceDue: 4180,
    status: "Overdue",
    dueDate: "2026-06-28",
    orderCount: 6,
    paymentTerms: "Net 10",
    notes: "Past-due AMC batch invoice.",
    sentDate: "2026-06-18"
  },
  {
    id: "inv-1003",
    organizationId: "org-firm-1",
    invoiceNumber: "CAA-INV-260103",
    client: "Seaside Bank",
    billingParty: "Seaside Bank",
    billToContact: "Taylor Price",
    amount: 2210,
    subtotal: 2210,
    taxAmount: 0,
    balanceDue: 0,
    status: "Paid",
    dueDate: "2026-06-30",
    orderCount: 3,
    paymentTerms: "Net 15",
    paidDate: "2026-06-27"
  },
  {
    id: "inv-1004",
    organizationId: "org-firm-1",
    invoiceNumber: "CAA-INV-260104",
    client: "RidgeLine Bank",
    billingParty: "RidgeLine Bank",
    billToContact: "Morgan Hale",
    amount: 1650,
    subtotal: 1650,
    taxAmount: 0,
    balanceDue: 1650,
    status: "Draft",
    dueDate: "2026-07-20",
    orderCount: 3,
    paymentTerms: "Net 15",
    draftDate: "2026-07-08"
  }
];

export const invoiceSettings: InvoiceSettings[] = [
  {
    id: "invoice-settings-caa",
    organizationId: "org-firm-1",
    companyName: "CAA Real Property Services",
    companyAddress: "1100 Circle 75 Pkwy, Atlanta, GA",
    taxId: "XX-XXX4581",
    invoicePrefix: "CAA-INV",
    nextInvoiceNumber: 260105,
    defaultPaymentTerms: "Net 15",
    defaultInvoiceNotes: "Thank you for your business. Please include the invoice number with payment.",
    paymentInstructions: "ACH preferred. Check payments accepted at the company remittance address."
  },
  {
    id: "invoice-settings-solo",
    organizationId: "org-solo-1",
    companyName: "Upstate Appraisal Group",
    companyAddress: "88 West Paces Ferry, Atlanta, GA",
    invoicePrefix: "TMA",
    nextInvoiceNumber: 260021,
    defaultPaymentTerms: "Due on receipt",
    defaultInvoiceNotes: "Report delivery may be held until payment is confirmed for private-client work.",
    paymentInstructions: "Pay by card, ACH, or check after invoice delivery."
  }
];

export const notificationTemplates: NotificationTemplate[] = [
  {
    eventKey: "public_order_request_submitted",
    label: "Public request submitted",
    subject: "New public appraisal request",
    preview: "A public order request is waiting for staff review.",
    defaultAudience: "Order desk and organization admins"
  },
  {
    eventKey: "order_assigned",
    label: "Order assigned",
    subject: "You have a new appraisal assignment",
    preview: "The assigned appraiser receives order context and next steps.",
    defaultAudience: "Assigned appraiser"
  },
  {
    eventKey: "due_date_warning",
    label: "Due-date warning",
    subject: "CAS due-date warning",
    preview: "An active appraisal order is approaching its due date.",
    defaultAudience: "Office staff, appraiser, and reviewer"
  },
  {
    eventKey: "invoice_generated",
    label: "Invoice generated",
    subject: "Invoice ready for review",
    preview: "A draft invoice was generated from an assignment.",
    defaultAudience: "Accounting users"
  }
];

export const notificationPreferences: NotificationPreference[] = [
  { id: "pref-1", organizationId: "org-firm-1", eventKey: "public_order_request_submitted", emailEnabled: true, inAppEnabled: true, cadence: "Immediate" },
  { id: "pref-2", organizationId: "org-firm-1", eventKey: "order_assigned", emailEnabled: true, inAppEnabled: true, cadence: "Immediate" },
  { id: "pref-3", organizationId: "org-firm-1", eventKey: "due_date_warning", emailEnabled: true, inAppEnabled: true, cadence: "Daily digest" },
  { id: "pref-4", organizationId: "org-firm-1", eventKey: "invoice_generated", emailEnabled: false, inAppEnabled: true, cadence: "Daily digest" }
];

export const emailDeliveryRecords: EmailDeliveryRecord[] = [
  {
    id: "email-1",
    organizationId: "org-firm-1",
    eventKey: "public_order_request_submitted",
    recipient: "ops@caavaluation.example",
    subject: "New public appraisal request",
    status: "Logged",
    provider: "development-log",
    createdAt: "2026-07-09T16:20:00Z",
    visibilityClassification: "internal",
    attemptCount: 1,
    plaintextPreview: "Demo email simulated. New public appraisal request is ready for intake review."
  },
  {
    id: "email-bid-1",
    organizationId: "org-firm-1",
    eventKey: "bid_request_sent",
    recipient: "renee@northmetro.example",
    recipientRole: "appraiser",
    subject: "New appraisal bid opportunity in CAS",
    status: "Logged",
    provider: "development-log",
    createdAt: "2026-07-09T14:16:00Z",
    sentAt: "2026-07-09T14:16:04Z",
    visibilityClassification: "appraiser_safe",
    actionUrl: "/orders/ord-1011",
    attemptCount: 1,
    plaintextPreview: "Demo email simulated. You have a new appraisal bid opportunity from CAA Real Property Services."
  },
  {
    id: "email-delivery-1",
    organizationId: "org-firm-1",
    eventKey: "final_report_delivered",
    recipient: "claire@harborpoint.example",
    recipientRole: "client_user",
    subject: "Your appraisal report is ready",
    status: "Logged",
    provider: "development-log",
    createdAt: "2026-07-09T18:12:00Z",
    sentAt: "2026-07-09T18:12:03Z",
    visibilityClassification: "client_safe",
    actionUrl: "/orders/ord-1001",
    attemptCount: 1,
    plaintextPreview: "Demo email simulated. Your appraisal report is ready to view securely in CAS."
  }
];

export const organizationNotificationSettings: OrganizationNotificationSettings[] = [
  {
    id: "notif-settings-firm-1",
    organizationId: "org-firm-1",
    emailEnabled: false,
    defaultDueWarningHours: [72, 48, 24, 0],
    bidReminderHours: [24, 4],
    assignmentAcceptanceHours: 12,
    inspectionReminderHours: [24, 8],
    revisionReminderHours: [24, 0],
    invoiceReminderDays: [7, 1, 0],
    complianceWarningDays: [60, 30, 14, 7, 0],
    clientReceivesInspectionStatus: true,
    clientReceivesAssignmentIdentity: false,
    clientReceivesReviewStatus: true,
    clientsReceiveDeliveryEmail: true,
    copyOfficeStaffOnClientEvents: true,
    escalationRecipientRole: "company_admin",
    replyToEmail: "support@caavaluation.example",
    branding: { accent: "#2563eb", logoAlt: "CAA Real Property Services" }
  }
];

export const communicationEvents: CommunicationEvent[] = [
  {
    id: "comm-bid-1",
    organizationId: "org-firm-1",
    orderId: "ord-1011",
    actorUserId: "user-admin",
    eventType: "bid_request_sent",
    channel: "email",
    recipient: "Renee Walker",
    recipientUserId: "user-solo",
    recipientOrganizationId: "org-vendor-1",
    recipientRole: "appraiser",
    visibilityClassification: "appraiser_safe",
    subject: "New appraisal bid opportunity in CAS",
    sanitizedMessage: "You have a new appraisal bid opportunity from CAA Real Property Services for CAA-26-1058.",
    actionUrl: "/orders/ord-1011",
    deliveryStatus: "simulated",
    notificationQueueId: "notifq-bid-1",
    emailDeliveryId: "email-bid-1",
    retryCount: 0,
    occurredAt: "2026-07-09T14:16:04Z",
    metadata: { omittedFields: "other bidders, other bid amounts, internal ranking" }
  },
  {
    id: "comm-assignment-1",
    organizationId: "org-firm-1",
    orderId: "ord-1003",
    actorUserId: "user-admin",
    eventType: "direct_assignment_sent",
    channel: "in_app",
    recipient: "Priya Shah",
    recipientUserId: "user-appraiser",
    recipientOrganizationId: "org-firm-1",
    recipientRole: "appraiser",
    visibilityClassification: "appraiser_safe",
    subject: "New appraisal assignment in CAS",
    sanitizedMessage: "You have a new appraisal assignment for CAA-26-1050 due July 10, 2026.",
    actionUrl: "/orders/ord-1003",
    deliveryStatus: "created",
    notificationQueueId: "notifq-assignment-demo",
    retryCount: 0,
    occurredAt: "2026-07-09T13:45:00Z",
    metadata: { omittedFields: "client fee, AMC margin, payroll" }
  },
  {
    id: "comm-delivery-1",
    organizationId: "org-firm-1",
    orderId: "ord-1001",
    actorUserId: "user-reviewer",
    eventType: "final_report_delivered",
    channel: "email",
    recipient: "Claire Moon",
    recipientUserId: "user-client",
    recipientOrganizationId: "org-client-1",
    recipientRole: "client_user",
    visibilityClassification: "client_safe",
    subject: "Your appraisal report is ready",
    sanitizedMessage: "Your appraisal report is ready to view securely in CAS.",
    actionUrl: "/orders/ord-1001",
    deliveryStatus: "simulated",
    notificationQueueId: "notifq-delivery-1",
    emailDeliveryId: "email-delivery-1",
    retryCount: 0,
    occurredAt: "2026-07-09T18:12:03Z",
    metadata: { omittedFields: "storage paths, signed URLs, internal notes" }
  }
];

export const notificationReminderState: NotificationReminderState[] = [
  {
    id: "reminder-state-1",
    organizationId: "org-firm-1",
    reminderKey: "order:ord-1002:revision_due_soon",
    eventType: "revision_due_soon",
    relatedOrderId: "ord-1002",
    firstTriggeredAt: "2026-07-09T17:44:00Z",
    lastTriggeredAt: "2026-07-09T17:44:00Z",
    triggerCount: 1
  }
];

export const integrationSettings: IntegrationSetting[] = [
  {
    id: "integration-lqb-1",
    organizationId: "org-client-1",
    provider: "lendingqb_meridianlink",
    providerLabel: "LendingQB / MeridianLink Mortgage",
    status: "Not connected",
    credentialReference: "vault://los/lendingqb/demo-placeholder",
    syncStatus: "Idle",
    retryCount: 0,
    fieldMappings: [
      { id: "map-1", externalField: "LoanNumber", casField: "fileNumber", required: true },
      { id: "map-2", externalField: "Borrower.FullName", casField: "borrower", required: true },
      { id: "map-3", externalField: "SubjectProperty.Address", casField: "address", required: true },
      { id: "map-4", externalField: "LoanOfficer.Name", casField: "lenderContact", required: false },
      { id: "map-5", externalField: "Loan.Purpose", casField: "loanType", required: false },
      { id: "map-6", externalField: "Documents", casField: "documentsList", required: false }
    ],
    statusMappings: [
      { id: "status-map-1", externalStatus: "Vendor ordered", casStatus: "New" },
      { id: "status-map-2", externalStatus: "Inspection scheduled", casStatus: "Inspection Scheduled" },
      { id: "status-map-3", externalStatus: "Report delivered", casStatus: "Delivered" }
    ],
    documentMappings: [
      { id: "doc-map-1", externalDocumentType: "Purchase Contract", casDocumentType: "Order package", direction: "Import" },
      { id: "doc-map-2", externalDocumentType: "Final Appraisal", casDocumentType: "Report", direction: "Export" },
      { id: "doc-map-3", externalDocumentType: "Vendor Message Attachment", casDocumentType: "Client document", direction: "Both" }
    ]
  }
];

export const integrationLogs: IntegrationLog[] = [
  {
    id: "integration-log-1",
    integrationId: "integration-lqb-1",
    event: "Adapter scaffolded",
    status: "Success",
    detail: "Mock LendingQB adapter is available for demo import and status-push flows.",
    createdAt: "2026-07-09T18:00:00Z"
  }
];

export const automationRules: AutomationRule[] = [
  {
    id: "auto-new-order-triage",
    organizationId: "org-firm-1",
    name: "New order triage and assignment prep",
    description: "Creates an intake task, notifies the order desk, and flags documents when a new order arrives.",
    enabled: true,
    trigger: "order_created",
    triggerLabel: "When an order is created",
    conditions: [
      { id: "auto-cond-1", field: "current_status", operator: "equals", value: "New", label: "Status is New" },
      { id: "auto-cond-2", field: "missing_documents", operator: "is", value: "true", label: "Documents may need review" }
    ],
    actions: [
      { id: "auto-act-1", type: "create_task", target: "Order desk", value: "Review order package and confirm due date", label: "Create intake review task" },
      { id: "auto-act-2", type: "send_in_app_notification", target: "office_staff", value: "New order ready for triage", label: "Notify office staff" },
      { id: "auto-act-3", type: "write_audit_log", target: "Order", value: "Automation evaluated new order", label: "Write audit log" }
    ],
    executionOrder: 10,
    lastRunAt: "2026-07-09T13:08:00Z",
    runCount: 42,
    failureCount: 0,
    createdBy: "Nora Fields",
    createdAt: "2026-07-01T09:00:00Z",
    auditMetadata: { createdBy: "Nora Fields", updatedBy: "Mina Patel", updatedAt: "2026-07-08T16:30:00Z" }
  },
  {
    id: "auto-assignment-accepted",
    organizationId: "org-firm-1",
    name: "Assignment accepted follow-up",
    description: "Moves accepted work toward inspection scheduling and reminds the appraiser if access is incomplete.",
    enabled: true,
    trigger: "assignment_accepted",
    triggerLabel: "When appraiser accepts assignment",
    conditions: [
      { id: "auto-cond-3", field: "current_status", operator: "equals", value: "Accepted", label: "Status is Accepted" }
    ],
    actions: [
      { id: "auto-act-4", type: "change_status", target: "Order", value: "Accepted", label: "Confirm accepted status" },
      { id: "auto-act-5", type: "create_follow_up", target: "Assigned appraiser", value: "Schedule inspection or add access issue", label: "Create inspection follow-up" }
    ],
    executionOrder: 20,
    lastRunAt: "2026-07-08T20:18:00Z",
    runCount: 18,
    failureCount: 1,
    createdBy: "Nora Fields",
    createdAt: "2026-07-01T09:10:00Z",
    auditMetadata: { createdBy: "Nora Fields", updatedAt: "2026-07-08T20:18:00Z" }
  },
  {
    id: "auto-inspection-scheduled",
    organizationId: "org-firm-1",
    name: "Inspection scheduled client update",
    description: "Logs the inspection date, queues a client-facing status note, and prepares calendar sync.",
    enabled: true,
    trigger: "inspection_scheduled",
    triggerLabel: "When inspection is scheduled",
    conditions: [
      { id: "auto-cond-4", field: "current_status", operator: "equals", value: "Inspection Scheduled", label: "Inspection status is scheduled" }
    ],
    actions: [
      { id: "auto-act-6", type: "create_calendar_event", target: "Assigned appraiser", value: "Inspection appointment", label: "Prepare calendar event" },
      { id: "auto-act-7", type: "add_client_message", target: "Client portal", value: "Inspection has been scheduled", label: "Add client-facing status comment" }
    ],
    executionOrder: 30,
    lastRunAt: "2026-07-09T14:12:00Z",
    runCount: 27,
    failureCount: 0,
    createdBy: "Mina Patel",
    createdAt: "2026-07-01T09:20:00Z",
    auditMetadata: { createdBy: "Mina Patel" }
  },
  {
    id: "auto-report-submitted",
    organizationId: "org-firm-1",
    name: "Report submitted review routing",
    description: "Assigns the report to review, notifies the reviewer, and creates a same-day quality-control task.",
    enabled: true,
    trigger: "report_submitted",
    triggerLabel: "When report is submitted",
    conditions: [
      { id: "auto-cond-5", field: "report_standard", operator: "contains", value: "UAD", label: "Report standard includes UAD" }
    ],
    actions: [
      { id: "auto-act-8", type: "assign_reviewer", target: "Review desk", value: "Best available reviewer", label: "Route to reviewer" },
      { id: "auto-act-9", type: "create_task", target: "Reviewer", value: "Complete QC checklist", label: "Create review task" },
      { id: "auto-act-10", type: "send_in_app_notification", target: "reviewer", value: "New report ready for review", label: "Notify reviewer" }
    ],
    executionOrder: 40,
    lastRunAt: "2026-07-09T15:02:00Z",
    runCount: 33,
    failureCount: 0,
    createdBy: "Nora Fields",
    createdAt: "2026-07-01T09:30:00Z",
    auditMetadata: { createdBy: "Nora Fields" }
  },
  {
    id: "auto-revision-requested",
    organizationId: "org-firm-1",
    name: "Revision requested response loop",
    description: "Creates an appraiser follow-up, alerts staff, and keeps the client-facing wording controlled.",
    enabled: true,
    trigger: "revision_requested",
    triggerLabel: "When a revision is requested",
    conditions: [
      { id: "auto-cond-6", field: "current_status", operator: "contains", value: "Revision", label: "Revision status is active" }
    ],
    actions: [
      { id: "auto-act-11", type: "create_task", target: "Assigned appraiser", value: "Respond to revision request", label: "Create appraiser revision task" },
      { id: "auto-act-12", type: "notify_roles", target: "office_staff,reviewer", value: "Revision loop is active", label: "Notify office and reviewer" }
    ],
    executionOrder: 50,
    lastRunAt: "2026-07-09T17:44:00Z",
    runCount: 16,
    failureCount: 0,
    createdBy: "Maya Chen",
    createdAt: "2026-07-01T09:40:00Z",
    auditMetadata: { createdBy: "Maya Chen" }
  },
  {
    id: "auto-report-delivered",
    organizationId: "org-firm-1",
    name: "Delivery and completion accounting",
    description: "Queues delivery receipt, creates accounting entry, and drafts the invoice after delivery.",
    enabled: true,
    trigger: "report_delivered",
    triggerLabel: "When report is delivered",
    conditions: [
      { id: "auto-cond-7", field: "current_status", operator: "equals", value: "Delivered", label: "Status is Delivered" }
    ],
    actions: [
      { id: "auto-act-13", type: "create_accounting_entry", target: "Accounting", value: "Post fee and payout", label: "Create accounting entry" },
      { id: "auto-act-14", type: "create_invoice_draft", target: "Accounting", value: "Draft client invoice", label: "Draft invoice" }
    ],
    executionOrder: 60,
    lastRunAt: "2026-07-08T19:25:00Z",
    runCount: 24,
    failureCount: 0,
    createdBy: "Nora Fields",
    createdAt: "2026-07-01T09:50:00Z",
    auditMetadata: { createdBy: "Nora Fields" }
  },
  {
    id: "auto-due-date-watch",
    organizationId: "org-firm-1",
    name: "Due date risk watch",
    description: "Escalates orders due within 24 hours or already past due, with a clear staff task.",
    enabled: true,
    trigger: "due_within",
    triggerLabel: "When order is due within selected time",
    conditions: [
      { id: "auto-cond-8", field: "due_proximity", operator: "within_days", value: "1", label: "Due within one day" },
      { id: "auto-cond-9", field: "current_status", operator: "not_equals", value: "Completed", label: "Order is not complete" }
    ],
    actions: [
      { id: "auto-act-15", type: "flag_risk", target: "Order", value: "High", label: "Flag order risk" },
      { id: "auto-act-16", type: "create_task", target: "Office staff", value: "Confirm delivery plan", label: "Create due-date follow-up" }
    ],
    executionOrder: 70,
    lastRunAt: "2026-07-09T12:00:00Z",
    runCount: 58,
    failureCount: 2,
    createdBy: "Mina Patel",
    createdAt: "2026-07-01T10:00:00Z",
    auditMetadata: { createdBy: "Mina Patel", updatedAt: "2026-07-07T15:45:00Z" }
  },
  {
    id: "auto-invoice-overdue",
    organizationId: "org-firm-1",
    name: "Overdue invoice follow-up",
    description: "Creates accounting follow-ups for overdue invoices without exposing payroll details to non-accounting users.",
    enabled: true,
    trigger: "invoice_overdue",
    triggerLabel: "When invoice is overdue",
    conditions: [
      { id: "auto-cond-10", field: "invoice_status", operator: "equals", value: "Overdue", label: "Invoice is overdue" }
    ],
    actions: [
      { id: "auto-act-17", type: "create_follow_up", target: "Accounting", value: "Contact client AR", label: "Create invoice follow-up" },
      { id: "auto-act-18", type: "queue_email", target: "Client billing contact", value: "Payment reminder", label: "Queue payment reminder" }
    ],
    executionOrder: 80,
    lastRunAt: "2026-07-09T11:15:00Z",
    runCount: 12,
    failureCount: 1,
    createdBy: "Nora Fields",
    createdAt: "2026-07-01T10:10:00Z",
    auditMetadata: { createdBy: "Nora Fields" }
  },
  {
    id: "auto-compliance-expiring",
    organizationId: "org-firm-1",
    name: "Vendor compliance renewal reminder",
    description: "Watches appraiser and vendor documents and creates renewal requests before coverage is at risk.",
    enabled: true,
    trigger: "vendor_compliance_expiring",
    triggerLabel: "When vendor compliance is expiring",
    conditions: [
      { id: "auto-cond-11", field: "vendor_compliance", operator: "within_days", value: "30", label: "Compliance expires within 30 days" }
    ],
    actions: [
      { id: "auto-act-19", type: "request_documents", target: "Vendor", value: "Request updated license/E&O/W-9", label: "Request updated document" },
      { id: "auto-act-20", type: "create_task", target: "Vendor desk", value: "Review renewal once uploaded", label: "Create compliance review task" }
    ],
    executionOrder: 90,
    lastRunAt: "2026-07-09T09:30:00Z",
    runCount: 21,
    failureCount: 0,
    createdBy: "Derek Sloan",
    createdAt: "2026-07-01T10:20:00Z",
    auditMetadata: { createdBy: "Derek Sloan" }
  },
  {
    id: "auto-public-request",
    organizationId: "org-firm-1",
    name: "Public order request intake",
    description: "Creates a staff review task and notification when a non-LOS customer submits an appraisal request.",
    enabled: true,
    trigger: "public_request_submitted",
    triggerLabel: "When public request is submitted",
    conditions: [
      { id: "auto-cond-12", field: "purpose", operator: "contains", value: "appraisal", label: "Request appears to be an appraisal order" }
    ],
    actions: [
      { id: "auto-act-21", type: "create_task", target: "Order desk", value: "Review public request and convert to order", label: "Create public request task" },
      { id: "auto-act-22", type: "send_in_app_notification", target: "company_admin", value: "Public request submitted", label: "Notify admin" }
    ],
    executionOrder: 100,
    lastRunAt: "2026-07-09T16:21:00Z",
    runCount: 7,
    failureCount: 0,
    createdBy: "Nora Fields",
    createdAt: "2026-07-01T10:30:00Z",
    auditMetadata: { createdBy: "Nora Fields" }
  }
];

export const automationRuns: AutomationRun[] = [
  {
    id: "auto-run-1",
    ruleId: "auto-new-order-triage",
    organizationId: "org-firm-1",
    status: "Success",
    startedAt: "2026-07-09T13:08:00Z",
    finishedAt: "2026-07-09T13:08:02Z",
    relatedOrderId: "ord-1011",
    relatedTaskId: "task-intake-1",
    steps: [
      { id: "auto-run-1-step-1", actionLabel: "Create intake review task", status: "Success", detail: "Task assigned to Mina Patel.", at: "2026-07-09T13:08:01Z" },
      { id: "auto-run-1-step-2", actionLabel: "Notify office staff", status: "Success", detail: "In-app notification queued.", at: "2026-07-09T13:08:02Z" }
    ]
  },
  {
    id: "auto-run-2",
    ruleId: "auto-due-date-watch",
    organizationId: "org-firm-1",
    status: "Partial",
    startedAt: "2026-07-09T12:00:00Z",
    finishedAt: "2026-07-09T12:00:04Z",
    relatedOrderId: "ord-1003",
    relatedTaskId: "task-due-1",
    steps: [
      { id: "auto-run-2-step-1", actionLabel: "Flag order risk", status: "Success", detail: "Order marked high risk.", at: "2026-07-09T12:00:02Z" },
      { id: "auto-run-2-step-2", actionLabel: "Create due-date follow-up", status: "Success", detail: "Follow-up assigned to office staff.", at: "2026-07-09T12:00:03Z" },
      { id: "auto-run-2-step-3", actionLabel: "Queue email", status: "Skipped", detail: "Email disabled by digest preference.", at: "2026-07-09T12:00:04Z" }
    ]
  },
  {
    id: "auto-run-3",
    ruleId: "auto-invoice-overdue",
    organizationId: "org-firm-1",
    status: "Failed",
    startedAt: "2026-07-09T11:15:00Z",
    finishedAt: "2026-07-09T11:15:03Z",
    relatedInvoiceId: "inv-1002",
    steps: [
      { id: "auto-run-3-step-1", actionLabel: "Create invoice follow-up", status: "Success", detail: "Task assigned to accounting.", at: "2026-07-09T11:15:01Z" },
      { id: "auto-run-3-step-2", actionLabel: "Queue payment reminder", status: "Failed", detail: "Client billing email missing confirmation preference.", at: "2026-07-09T11:15:03Z" }
    ]
  }
];

export const workflowTasks: WorkflowTask[] = [
  {
    id: "task-intake-1",
    organizationId: "org-firm-1",
    relatedOrderId: "ord-1011",
    relatedClient: "HarborPoint Lending",
    title: "Review new order package",
    description: "Confirm product type, due date, fee, and whether the engagement letter has the complete lender instruction set.",
    assignedTo: "Mina Patel",
    assignedRole: "office_staff",
    createdBy: "CAS Automation",
    dueDate: "2026-07-09",
    priority: "High",
    status: "Open",
    source: "Automation",
    automationRuleId: "auto-new-order-triage",
    auditHistory: [{ id: "task-intake-1-audit", action: "Task created by automation", actor: "CAS Automation", at: "Today, 9:08 AM" }]
  },
  {
    id: "task-due-1",
    organizationId: "org-firm-1",
    relatedOrderId: "ord-1003",
    relatedClient: "National Valuation Services",
    title: "Confirm delivery plan for past-due file",
    description: "Call the appraiser, confirm completion ETA, and add a client-safe status comment before noon.",
    assignedTo: "Mina Patel",
    assignedRole: "office_staff",
    createdBy: "Due date risk watch",
    dueDate: "2026-07-09",
    priority: "Rush",
    status: "In Progress",
    source: "Automation",
    automationRuleId: "auto-due-date-watch",
    auditHistory: [
      { id: "task-due-1-audit-1", action: "Task created by automation", actor: "CAS Automation", at: "Today, 8:00 AM" },
      { id: "task-due-1-audit-2", action: "Task started", actor: "Mina Patel", at: "Today, 8:17 AM" }
    ]
  },
  {
    id: "task-review-1",
    organizationId: "org-firm-1",
    relatedOrderId: "ord-1008",
    title: "Complete UAD 3.6 readiness review",
    description: "Run the UAD 3.6 review template and send appraiser questions in the structured revision panel.",
    assignedTo: "Maya Chen",
    assignedRole: "reviewer",
    createdBy: "Report submitted review routing",
    dueDate: "2026-07-09",
    priority: "High",
    status: "Open",
    source: "Automation",
    automationRuleId: "auto-report-submitted",
    auditHistory: [{ id: "task-review-1-audit", action: "Task created by automation", actor: "CAS Automation", at: "Today, 10:02 AM" }]
  },
  {
    id: "task-revision-1",
    organizationId: "org-firm-1",
    relatedOrderId: "ord-1002",
    relatedClient: "Seaside Bank",
    title: "Respond to reviewer revision request",
    description: "Update comparable rationale, attach the revised PDF/XML, and mark each revision item complete.",
    assignedTo: "Jordan Lee",
    assignedRole: "appraiser",
    createdBy: "Revision requested response loop",
    dueDate: "2026-07-10",
    priority: "High",
    status: "Waiting",
    source: "Automation",
    automationRuleId: "auto-revision-requested",
    auditHistory: [{ id: "task-revision-1-audit", action: "Task created by automation", actor: "CAS Automation", at: "Yesterday, 4:44 PM" }]
  },
  {
    id: "task-invoice-1",
    organizationId: "org-firm-1",
    relatedInvoiceId: "inv-1002",
    relatedClient: "National Valuation Services",
    title: "Follow up on overdue AMC invoice",
    description: "Confirm payment date with National Valuation Services and mark invoice status once funds are received.",
    assignedTo: "Nora Fields",
    assignedRole: "company_admin",
    createdBy: "Overdue invoice follow-up",
    dueDate: "2026-07-09",
    priority: "Watch",
    status: "Open",
    source: "Automation",
    automationRuleId: "auto-invoice-overdue",
    auditHistory: [{ id: "task-invoice-1-audit", action: "Task created by automation", actor: "CAS Automation", at: "Today, 7:15 AM" }]
  },
  {
    id: "task-compliance-1",
    organizationId: "org-firm-1",
    relatedVendorId: "ven-3",
    title: "Request updated E&O certificate",
    description: "Vendor coverage expires soon. Request updated proof, review upload, and avoid assigning new work until current.",
    assignedTo: "Mina Patel",
    assignedRole: "office_staff",
    createdBy: "Vendor compliance renewal reminder",
    dueDate: "2026-07-12",
    priority: "Standard",
    status: "Open",
    source: "Automation",
    automationRuleId: "auto-compliance-expiring",
    auditHistory: [{ id: "task-compliance-1-audit", action: "Task created by automation", actor: "CAS Automation", at: "Today, 9:30 AM" }]
  },
  {
    id: "task-manual-1",
    organizationId: "org-firm-1",
    relatedOrderId: "ord-1005",
    title: "Call listing agent about access window",
    description: "Borrower prefers afternoon access. Confirm whether Friday inspection still works before reassigning.",
    assignedTo: "Mina Patel",
    assignedRole: "office_staff",
    createdBy: "Nora Fields",
    dueDate: "2026-07-11",
    priority: "Standard",
    status: "Open",
    source: "Manual",
    auditHistory: [{ id: "task-manual-1-audit", action: "Manual task created", actor: "Nora Fields", at: "Yesterday, 2:22 PM" }]
  }
];

export const notificationQueue: NotificationQueueItem[] = [
  {
    id: "notifq-1",
    organizationId: "org-firm-1",
    recipient: "Mina Patel",
    recipientRole: "office_staff",
    eventType: "new_order_received",
    channel: "In-app",
    status: "Pending",
    attemptCount: 0,
    relatedOrderId: "ord-1011",
    relatedTaskId: "task-intake-1",
    digestGroup: "order-desk",
    queuedAt: "2026-07-09T13:08:02Z",
    subject: "New order ready for triage",
    preview: "CAA-26-1058 needs order desk review before assignment."
  },
  {
    id: "notifq-2",
    organizationId: "org-firm-1",
    recipient: "Maya Chen",
    recipientRole: "reviewer",
    eventType: "report_submitted",
    channel: "In-app",
    status: "Sent",
    attemptCount: 1,
    relatedOrderId: "ord-1008",
    relatedTaskId: "task-review-1",
    queuedAt: "2026-07-09T15:02:00Z",
    sentAt: "2026-07-09T15:02:04Z",
    subject: "Report ready for review",
    preview: "UAD 3.6 readiness review is waiting in the review queue."
  },
  {
    id: "notifq-3",
    organizationId: "org-firm-1",
    recipient: "Jordan Lee",
    recipientRole: "appraiser",
    eventType: "revisions_requested",
    channel: "Email",
    status: "Failed",
    attemptCount: 2,
    failureReason: "Demo email provider rejected the appraiser sandbox address.",
    relatedOrderId: "ord-1002",
    relatedTaskId: "task-revision-1",
    digestGroup: "appraiser-action",
    queuedAt: "2026-07-09T17:44:00Z",
    subject: "Revision request needs your response",
    preview: "The reviewer returned CAA-26-1049 with two requested corrections."
  },
  {
    id: "notifq-4",
    organizationId: "org-firm-1",
    recipient: "Nora Fields",
    recipientRole: "company_admin",
    eventType: "invoice_generated",
    channel: "Digest",
    status: "Read",
    attemptCount: 1,
    relatedInvoiceId: "inv-1004",
    digestGroup: "accounting-digest",
    queuedAt: "2026-07-08T18:00:00Z",
    sentAt: "2026-07-09T08:00:00Z",
    readAt: "2026-07-09T08:21:00Z",
    subject: "Accounting digest: invoices and payroll",
    preview: "One draft invoice and four payout items need review."
  }
];

export const scheduledJobs: ScheduledJob[] = [
  {
    id: "job-due-reminders",
    organizationId: "org-firm-1",
    name: "Due-date reminders",
    description: "Scans open orders for due today, due tomorrow, and overdue risk.",
    jobType: "Due-date reminders",
    enabled: true,
    schedule: "0 8 * * 1-6",
    provider: "Vercel Cron",
    lastRunAt: "2026-07-09T12:00:00Z",
    nextRunAt: "2026-07-10T12:00:00Z",
    status: "Idle",
    runCount: 58
  },
  {
    id: "job-invoice-reminders",
    organizationId: "org-firm-1",
    name: "Invoice reminders",
    description: "Finds overdue invoices and queues client follow-up tasks respecting notification preferences.",
    jobType: "Invoice reminders",
    enabled: true,
    schedule: "15 9 * * 1,3,5",
    provider: "Supabase scheduled function",
    lastRunAt: "2026-07-09T13:15:00Z",
    nextRunAt: "2026-07-10T13:15:00Z",
    status: "Idle",
    runCount: 12
  },
  {
    id: "job-compliance",
    organizationId: "org-firm-1",
    name: "Compliance expiration sweep",
    description: "Creates renewal tasks for expiring appraiser licenses, E&O, W-9, and vendor documents.",
    jobType: "Compliance reminders",
    enabled: true,
    schedule: "30 9 * * 1",
    provider: "Vercel Cron",
    lastRunAt: "2026-07-06T13:30:00Z",
    nextRunAt: "2026-07-13T13:30:00Z",
    status: "Idle",
    runCount: 21
  },
  {
    id: "job-stale-review",
    organizationId: "org-firm-1",
    name: "Stale review sweep",
    description: "Finds submitted reports without reviewer movement and escalates the review lane.",
    jobType: "Stale review sweep",
    enabled: false,
    schedule: "0 10 * * 1-5",
    provider: "CAS demo scheduler",
    nextRunAt: "Not scheduled",
    status: "Idle",
    runCount: 0
  }
];

export const webhookEvents: WebhookEvent[] = [
  {
    id: "webhook-1",
    organizationId: "org-firm-1",
    provider: "Public order portal",
    eventType: "public_request_submitted",
    status: "Processed",
    receivedAt: "2026-07-09T16:20:00Z",
    processedAt: "2026-07-09T16:20:04Z",
    payloadSummary: "Estate appraisal request from Elaine Porter with two uploaded documents."
  },
  {
    id: "webhook-2",
    organizationId: "org-client-1",
    provider: "LendingQB placeholder",
    eventType: "order_status_changed",
    status: "Received",
    receivedAt: "2026-07-09T18:06:00Z",
    payloadSummary: "LOS status push received but sync is not connected in demo mode.",
    relatedOrderId: "ord-1001"
  }
];

export const reviewQueue: ReviewQueueItem[] = [
  { id: "rq-1", orderId: "ord-1001", reviewer: "Maya Chen", submittedAt: "Today, 10:48 AM", status: "In review", checklistOpen: 1 },
  { id: "rq-2", orderId: "ord-1002", reviewer: "Evan Brooks", submittedAt: "Yesterday, 4:22 PM", status: "Returned", checklistOpen: 2 },
  { id: "rq-3", orderId: "ord-1008", reviewer: "Rachel Kim", submittedAt: "Today, 8:10 AM", status: "Ready for review", checklistOpen: 3 },
  { id: "rq-4", orderId: "ord-1009", reviewer: "Maya Chen", submittedAt: "Jun 30, 3:04 PM", status: "Approved", checklistOpen: 0 }
];

export const reviewTemplates = [
  "Legacy conventional checklist",
  "FHA minimum property requirements",
  "VA Tidewater and MPR checklist",
  "UAD 3.6 URAR readiness",
  "Non-lending/private appraisal checklist",
  "Missing exhibit request",
  "Comparable selection rationale",
  "Ready for delivery note"
];
