import type {
  AccountingEntry,
  EmailDeliveryRecord,
  IntegrationLog,
  IntegrationSetting,
  Invoice,
  InvoiceSettings,
  NotificationPreference,
  NotificationTemplate,
  OrganizationInvitation,
  Organization,
  PortalUser,
  PublicOrderRequest,
  PublicOrderSettings,
  ReviewQueueItem,
  VendorDocument
} from "@/types/domain";

export const organizations: Organization[] = [
  {
    id: "org-firm-1",
    name: "CAA Valuation Group",
    slug: "caa-valuation",
    type: "appraisal_firm",
    status: "Active",
    primaryContact: "Nora Fields",
    email: "ops@caavaluation.example",
    phone: "(404) 555-0100",
    address: "1100 Circle 75 Pkwy, Atlanta, GA"
  },
  {
    id: "org-amc-1",
    name: "Pioneer AMC",
    slug: "pioneer-amc",
    type: "amc",
    status: "Active",
    primaryContact: "Derek Sloan",
    email: "vendors@pioneeramc.example",
    phone: "(404) 555-0191",
    address: "2555 Cumberland Pkwy, Atlanta, GA"
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
    address: "200 Market Street, Savannah, GA"
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
    address: "44 Church Street, Marietta, GA"
  },
  {
    id: "org-solo-1",
    name: "Talia Morris Appraisals",
    slug: "talia-morris-appraisals",
    type: "solo_appraiser",
    status: "Active",
    primaryContact: "Talia Morris",
    email: "talia@appraisals.example",
    phone: "(770) 555-0168",
    address: "88 West Paces Ferry, Atlanta, GA"
  }
];

export const portalUsers: PortalUser[] = [
  {
    id: "user-admin",
    name: "Nora Fields",
    email: "nora@caavaluation.example",
    role: "company_admin",
    organizationId: "org-firm-1",
    title: "Company Admin"
  },
  {
    id: "user-office",
    name: "Mina Patel",
    email: "mina@caavaluation.example",
    role: "office_staff",
    organizationId: "org-firm-1",
    title: "Office Staff"
  },
  {
    id: "user-appraiser",
    name: "Jordan Lee",
    email: "jordan@caavaluation.example",
    role: "appraiser",
    organizationId: "org-firm-1",
    title: "Staff Appraiser",
    appraiserName: "Jordan Lee"
  },
  {
    id: "user-reviewer",
    name: "Maya Chen",
    email: "maya@caavaluation.example",
    role: "reviewer",
    organizationId: "org-firm-1",
    title: "Reviewer"
  },
  {
    id: "user-amc",
    name: "Derek Sloan",
    email: "derek@pioneeramc.example",
    role: "amc_admin",
    organizationId: "org-amc-1",
    title: "AMC Admin"
  },
  {
    id: "user-client",
    name: "Claire Moon",
    email: "claire@harborpoint.example",
    role: "client_user",
    organizationId: "org-client-1",
    title: "Lender Client",
    clientName: "HarborPoint Lending"
  },
  {
    id: "user-solo",
    name: "Talia Morris",
    email: "talia@appraisals.example",
    role: "solo_appraiser",
    organizationId: "org-solo-1",
    title: "Solo Appraiser",
    appraiserName: "Talia Morris"
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
    brandName: "CAA Valuation Group",
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
    brandName: "Talia Morris Appraisals",
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
    commissionSplit: 60,
    appraiserSplit: 345,
    companyRevenue: 255,
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
    commissionSplit: 60,
    appraiserSplit: 390,
    companyRevenue: 295,
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
    commissionSplit: 60,
    appraiserSplit: 435,
    companyRevenue: 325,
    status: "Paid",
    month: "2026-06",
    paidAt: "2026-06-28"
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
    appraiserSplit: 330,
    companyRevenue: 245,
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
    client: "Pioneer AMC",
    billingParty: "Pioneer AMC",
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
    companyName: "CAA Valuation Group",
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
    companyName: "Talia Morris Appraisals",
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
    createdAt: "2026-07-09T16:20:00Z"
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

export const reviewQueue: ReviewQueueItem[] = [
  { id: "rq-1", orderId: "ord-1001", reviewer: "Maya Chen", submittedAt: "Today, 10:48 AM", status: "In review", checklistOpen: 1 },
  { id: "rq-2", orderId: "ord-1002", reviewer: "Evan Brooks", submittedAt: "Yesterday, 4:22 PM", status: "Returned", checklistOpen: 2 },
  { id: "rq-3", orderId: "ord-1008", reviewer: "Rachel Kim", submittedAt: "Today, 8:10 AM", status: "Ready for review", checklistOpen: 3 },
  { id: "rq-4", orderId: "ord-1009", reviewer: "Maya Chen", submittedAt: "Jun 30, 3:04 PM", status: "Approved", checklistOpen: 0 }
];

export const reviewTemplates = [
  "Missing exhibit request",
  "FHA repair commentary",
  "Comparable selection rationale",
  "UAD consistency correction",
  "Ready for delivery note"
];
