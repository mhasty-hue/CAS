import type {
  AppraiserProfile,
  CalendarPreference,
  ChartPoint,
  ClientProfile,
  CompanyUser,
  Kpi,
  NotificationItem,
  Order,
  OrderFormTemplate,
  PermissionKey,
  ReviewerProfile,
  VendorProfile
} from "@/types/domain";

export const workflowSteps = [
  "New Order",
  "Unassigned",
  "Assigned",
  "Accepted",
  "Inspection Scheduled",
  "Inspected",
  "Report In Progress",
  "Submitted",
  "In Review",
  "Ready for Delivery",
  "Delivered",
  "Completed"
];

export const permissionCatalog: Array<{ key: PermissionKey; label: string; group: string }> = [
  { key: "view_all_orders", label: "View all orders", group: "Orders" },
  { key: "create_orders", label: "Create orders", group: "Orders" },
  { key: "assign_orders", label: "Assign orders", group: "Orders" },
  { key: "edit_due_dates", label: "Edit due dates", group: "Orders" },
  { key: "upload_documents", label: "Upload documents", group: "Documents" },
  { key: "delete_documents", label: "Delete documents", group: "Documents" },
  { key: "see_accounting", label: "See accounting", group: "Accounting" },
  { key: "see_appraiser_payouts", label: "See appraiser payouts", group: "Accounting" },
  { key: "manage_users", label: "Manage users", group: "Admin" },
  { key: "manage_clients", label: "Manage clients", group: "Admin" },
  { key: "review_reports", label: "Review reports", group: "Review" },
  { key: "deliver_reports", label: "Deliver reports", group: "Review" },
  { key: "invite_vendors", label: "Invite vendors", group: "AMC" },
  { key: "approve_vendors", label: "Approve vendors", group: "AMC" },
  { key: "manage_workflows", label: "Manage workflows", group: "Admin" },
  { key: "export_reports", label: "Export reports", group: "Reporting" },
  { key: "view_own_orders_only", label: "View own orders only", group: "Orders" },
  { key: "invite_users", label: "canInviteUsers", group: "Company users" },
  { key: "manage_company_users", label: "canManageCompanyUsers", group: "Company users" },
  { key: "manage_accounting", label: "canManageAccounting", group: "Accounting" },
  { key: "customize_order_forms", label: "canCustomizeOrderForms", group: "Order intake" },
  { key: "view_accounting_summary", label: "View accounting summary", group: "Accounting" },
  { key: "view_full_accounting", label: "View full accounting", group: "Accounting" },
  { key: "prepare_payroll", label: "Prepare payroll", group: "Accounting" },
  { key: "approve_payroll", label: "Approve payroll", group: "Accounting" },
  { key: "edit_commission_defaults", label: "Edit commission defaults", group: "Accounting" },
  { key: "override_order_commission", label: "Override order commission", group: "Accounting" },
  { key: "generate_invoices", label: "Generate invoices", group: "Invoicing" },
  { key: "edit_invoices", label: "Edit invoices", group: "Invoicing" },
  { key: "mark_invoices_paid", label: "Mark invoices paid", group: "Invoicing" },
  { key: "view_own_pay", label: "View own pay", group: "Accounting" },
  { key: "manage_public_ordering", label: "Manage public ordering", group: "Public intake" },
  { key: "manage_notification_settings", label: "Manage notification settings", group: "Notifications" },
  { key: "manage_integrations", label: "Manage integrations", group: "Integrations" },
  { key: "upload_order_documents", label: "Upload order documents", group: "Documents" },
  { key: "view_internal_documents", label: "View internal documents", group: "Documents" },
  { key: "view_client_documents", label: "View client documents", group: "Documents" },
  { key: "archive_documents", label: "Archive documents", group: "Documents" },
  { key: "manage_document_visibility", label: "Manage document visibility", group: "Documents" },
  { key: "deliver_final_report", label: "Deliver final report", group: "Documents" },
  { key: "view_vendor_compliance_documents", label: "View vendor compliance", group: "Documents" },
  { key: "download_xml", label: "Download XML", group: "Documents" },
  { key: "view_workfile_documents", label: "View workfile documents", group: "Documents" }
];

const documents = (fileNumber: string, reportStatus: "Ready" | "Missing" | "Needs review" = "Ready") => [
  {
    id: `${fileNumber}-engagement`,
    name: "Engagement letter.pdf",
    type: "Engagement",
    status: "Ready" as const,
    uploadedBy: "Nora Fields",
    uploadedAt: "Jun 28, 9:14 AM"
  },
  {
    id: `${fileNumber}-order`,
    name: "Client order package.pdf",
    type: "Order package",
    status: "Ready" as const,
    uploadedBy: "CAS Intake",
    uploadedAt: "Jun 28, 9:16 AM"
  },
  {
    id: `${fileNumber}-report`,
    name: "Appraisal report.pdf",
    type: "Report",
    status: reportStatus,
    uploadedBy: reportStatus === "Missing" ? "Pending" : "Assigned appraiser",
    uploadedAt: reportStatus === "Missing" ? "Not uploaded" : "Jun 30, 10:42 AM"
  }
];

const timeline = (fileNumber: string, appraiser: string) => [
  {
    label: "Order received",
    detail: `${fileNumber} imported from client portal`,
    at: "Jun 27, 9:18 AM",
    actor: "CAS Intake"
  },
  {
    label: "Assignment reviewed",
    detail: "Coverage, fee, product, and due date checked",
    at: "Jun 27, 9:41 AM",
    actor: "Nora Fields"
  },
  {
    label: appraiser === "Unassigned" ? "Awaiting assignment" : "Appraiser notified",
    detail: appraiser === "Unassigned" ? "Order is queued for coverage selection" : `${appraiser} received the assignment package`,
    at: "Jun 27, 10:02 AM",
    actor: "CAS Workflow"
  }
];

const assignmentHistory = (fileNumber: string, appraiser: string) =>
  appraiser === "Unassigned"
    ? []
    : [
        {
          id: `${fileNumber}-assignment`,
          appraiser,
          action: "Assigned" as const,
          actor: "Nora Fields",
          note: "Matched by county coverage, current workload, and client preference.",
          at: "Jun 27, 10:02 AM"
        },
        {
          id: `${fileNumber}-accepted`,
          appraiser,
          action: "Accepted" as const,
          actor: appraiser,
          note: "Accepted with standard access instructions.",
          at: "Jun 27, 10:21 AM"
        }
      ];

const auditTrail = (fileNumber: string) => [
  { id: `${fileNumber}-audit-1`, action: "Order created", actor: "CAS Intake", at: "Jun 27, 9:18 AM" },
  { id: `${fileNumber}-audit-2`, action: "Documents attached", actor: "Nora Fields", at: "Jun 27, 9:22 AM" },
  { id: `${fileNumber}-audit-3`, action: "Due date confirmed", actor: "Nora Fields", at: "Jun 27, 9:41 AM" }
];

export const reviewers: ReviewerProfile[] = [
  { id: "rev-1", name: "Maya Chen", queue: 7, specialties: ["Conventional", "Complex", "Luxury"] },
  { id: "rev-2", name: "Evan Brooks", queue: 5, specialties: ["FHA", "VA", "Rural"] },
  { id: "rev-3", name: "Rachel Kim", queue: 4, specialties: ["Review", "Desktop", "Quality control"] }
];

export const orders: Order[] = [
  {
    id: "ord-1001",
    fileNumber: "CAA-26-1048",
    productType: "1004 URAR",
    client: "HarborPoint Lending",
    amc: "Direct Lender",
    borrower: "Avery Mitchell",
    address: "1840 Magnolia Trace",
    city: "Marietta",
    state: "GA",
    zip: "30064",
    county: "Cobb",
    appraiser: "Jordan Lee",
    reviewer: "Maya Chen",
    orderedDate: "2026-06-24",
    dueDate: "2026-06-30",
    inspectionDate: "2026-06-27",
    status: "In Review",
    priority: "High",
    fee: 575,
    techFee: 25,
    appraiserPayout: 345,
    documents: 9,
    lastUpdate: "Report submitted 2h ago",
    nextAction: "Complete review checklist",
    loanType: "Conventional",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Avery Mitchell",
    contactPhone: "(404) 555-0128",
    accessInfo: "Borrower available after 10 AM. Lockbox at side gate.",
    assignmentPreference: "Preferred staff appraiser",
    lenderContact: "Claire Moon",
    parcelNumber: "17-0216-0-081-0",
    timeline: timeline("CAA-26-1048", "Jordan Lee"),
    notes: [
      {
        id: "n1",
        author: "Maya Chen",
        body: "Reviewer requested contract addendum before final approval.",
        visibility: "internal",
        createdAt: "Jun 30, 11:16 AM"
      }
    ],
    clientComments: [
      {
        id: "c1",
        author: "Claire Moon",
        body: "Please deliver the final PDF and XML together.",
        visibility: "client",
        createdAt: "Jun 29, 3:10 PM"
      }
    ],
    documentsList: documents("CAA-26-1048", "Needs review"),
    assignmentHistory: assignmentHistory("CAA-26-1048", "Jordan Lee"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1048"),
    reviewItems: [
      { label: "Subject photos present", category: "Required exhibits", complete: true },
      { label: "Contract addendum attached", category: "Contract", complete: false, severity: "warning" },
      { label: "Comparable map included", category: "Maps", complete: true }
    ]
  },
  {
    id: "ord-1002",
    fileNumber: "CAA-26-1049",
    productType: "FHA 1004",
    client: "Northstar Mortgage",
    amc: "Pioneer AMC",
    borrower: "Sofia Grant",
    address: "72 Riverbend Court",
    city: "Roswell",
    state: "GA",
    zip: "30076",
    county: "Fulton",
    appraiser: "Priya Shah",
    reviewer: "Evan Brooks",
    orderedDate: "2026-06-23",
    dueDate: "2026-06-30",
    inspectionDate: "2026-06-26",
    status: "Revisions Needed",
    priority: "Rush",
    fee: 650,
    techFee: 35,
    appraiserPayout: 390,
    documents: 11,
    lastUpdate: "Revision request sent",
    nextAction: "Appraiser response due today",
    loanType: "FHA",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Sofia Grant",
    contactPhone: "(678) 555-0183",
    accessInfo: "Owner will meet appraiser. FHA utilities are on.",
    assignmentPreference: "FHA-certified panel appraiser",
    lenderContact: "Sam Ortiz",
    parcelNumber: "12-3114-0-229-0",
    timeline: timeline("CAA-26-1049", "Priya Shah"),
    notes: [
      {
        id: "n2",
        author: "Evan Brooks",
        body: "FHA repair commentary needs stronger support and photo reference.",
        visibility: "appraiser",
        createdAt: "Jun 30, 9:04 AM"
      }
    ],
    clientComments: [
      {
        id: "c2",
        author: "Pioneer AMC",
        body: "Client will accept an addendum if the revision is returned today.",
        visibility: "client",
        createdAt: "Jun 30, 10:02 AM"
      }
    ],
    documentsList: documents("CAA-26-1049", "Needs review"),
    assignmentHistory: assignmentHistory("CAA-26-1049", "Priya Shah"),
    revisionLog: [
      {
        id: "r1",
        requestedBy: "Evan Brooks",
        summary: "Clarify FHA repair condition and add photo reference.",
        status: "Sent to appraiser",
        requestedAt: "Jun 30, 9:04 AM"
      }
    ],
    auditTrail: auditTrail("CAA-26-1049"),
    reviewItems: [
      { label: "FHA utilities checked", category: "FHA", complete: true },
      { label: "Repair condition commentary", category: "FHA", complete: false, severity: "blocker" },
      { label: "UAD consistency", category: "UAD", complete: true }
    ]
  },
  {
    id: "ord-1003",
    fileNumber: "CAA-26-1050",
    productType: "2055 Exterior",
    client: "Seaside Bank",
    amc: "Direct Lender",
    borrower: "Noah Turner",
    address: "913 Laurel Park Lane",
    city: "Woodstock",
    state: "GA",
    zip: "30188",
    county: "Cherokee",
    appraiser: "Marcus King",
    reviewer: "Maya Chen",
    orderedDate: "2026-06-25",
    dueDate: "2026-07-02",
    inspectionDate: "2026-06-30",
    status: "Inspection Scheduled",
    priority: "Standard",
    fee: 425,
    techFee: 20,
    appraiserPayout: 255,
    documents: 5,
    lastUpdate: "Inspection confirmed",
    nextAction: "Mark inspected",
    loanType: "Conventional",
    occupancy: "Investment",
    propertyType: "Townhome",
    contactName: "Noah Turner",
    contactPhone: "(770) 555-0144",
    accessInfo: "Exterior only. Community gate code 1749.",
    assignmentPreference: "Best coverage fit",
    lenderContact: "Janelle Price",
    parcelNumber: "15N09-108-A",
    timeline: timeline("CAA-26-1050", "Marcus King"),
    notes: [
      {
        id: "n3",
        author: "Nora Fields",
        body: "Borrower requested a morning exterior window due to gated access.",
        visibility: "internal",
        createdAt: "Jun 28, 4:42 PM"
      }
    ],
    clientComments: [],
    documentsList: documents("CAA-26-1050", "Missing"),
    assignmentHistory: assignmentHistory("CAA-26-1050", "Marcus King"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1050"),
    reviewItems: [
      { label: "Exterior photos", category: "Subject photos", complete: false },
      { label: "Comparable selection", category: "General appraisal", complete: false }
    ]
  },
  {
    id: "ord-1004",
    fileNumber: "CAA-26-1051",
    productType: "VA 1004",
    client: "Patriot Home Loans",
    amc: "Cobalt AMC",
    borrower: "Elena Ruiz",
    address: "440 Brookstone Way",
    city: "Kennesaw",
    state: "GA",
    zip: "30144",
    county: "Cobb",
    appraiser: "Jordan Lee",
    reviewer: "Evan Brooks",
    orderedDate: "2026-06-20",
    dueDate: "2026-06-28",
    inspectionDate: "2026-06-24",
    status: "Report In Progress",
    priority: "Rush",
    fee: 700,
    techFee: 35,
    appraiserPayout: 420,
    documents: 9,
    lastUpdate: "No update in 18h",
    nextAction: "Escalate overdue report",
    loanType: "VA",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Elena Ruiz",
    contactPhone: "(404) 555-0199",
    accessInfo: "Seller agent will provide access. Confirm MPR utilities.",
    assignmentPreference: "VA panel",
    lenderContact: "Miles Carter",
    parcelNumber: "20-0135-0-047-0",
    timeline: timeline("CAA-26-1051", "Jordan Lee"),
    notes: [
      {
        id: "n4",
        author: "CAS Workflow",
        body: "Due date alert sent to appraiser and manager.",
        visibility: "internal",
        createdAt: "Jun 30, 8:00 AM"
      }
    ],
    clientComments: [
      {
        id: "c4",
        author: "Cobalt AMC",
        body: "Escalation requested because the file is past due.",
        visibility: "client",
        createdAt: "Jun 30, 8:14 AM"
      }
    ],
    documentsList: documents("CAA-26-1051", "Missing"),
    assignmentHistory: assignmentHistory("CAA-26-1051", "Jordan Lee"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1051"),
    reviewItems: [
      { label: "VA required exhibits", category: "VA", complete: false, severity: "warning" }
    ]
  },
  {
    id: "ord-1005",
    fileNumber: "CAA-26-1052",
    productType: "Desktop Review",
    client: "Summit Credit Union",
    amc: "Pioneer AMC",
    borrower: "Liam Carter",
    address: "268 Oak Hall Drive",
    city: "Alpharetta",
    state: "GA",
    zip: "30004",
    county: "Fulton",
    appraiser: "Talia Morris",
    reviewer: "Rachel Kim",
    orderedDate: "2026-06-26",
    dueDate: "2026-07-01",
    status: "Report In Progress",
    priority: "Watch",
    fee: 325,
    techFee: 15,
    appraiserPayout: 195,
    documents: 4,
    lastUpdate: "Comparable set drafted",
    nextAction: "Submit report",
    loanType: "HELOC",
    occupancy: "Owner occupied",
    propertyType: "Condo",
    contactName: "Liam Carter",
    contactPhone: "(470) 555-0137",
    accessInfo: "Desktop review. No inspection contact needed.",
    assignmentPreference: "Desktop specialist",
    lenderContact: "Megan Hall",
    parcelNumber: "22-4871-0-089-0",
    timeline: timeline("CAA-26-1052", "Talia Morris"),
    notes: [
      {
        id: "n5",
        author: "Talia Morris",
        body: "Need client confirmation on renovation date.",
        visibility: "client",
        createdAt: "Jun 29, 12:27 PM"
      }
    ],
    clientComments: [],
    documentsList: documents("CAA-26-1052", "Missing"),
    assignmentHistory: assignmentHistory("CAA-26-1052", "Talia Morris"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1052"),
    reviewItems: [
      { label: "Comment consistency", category: "Comments consistency", complete: false }
    ]
  },
  {
    id: "ord-1006",
    fileNumber: "CAA-26-1053",
    productType: "1004 URAR",
    client: "HarborPoint Lending",
    amc: "Direct Lender",
    borrower: "Mina Patel",
    address: "18 Cedar Grove Place",
    city: "Smyrna",
    state: "GA",
    zip: "30080",
    county: "Cobb",
    appraiser: "Unassigned",
    reviewer: "Unassigned",
    orderedDate: "2026-06-30",
    dueDate: "2026-07-05",
    status: "Unassigned",
    priority: "Standard",
    fee: 550,
    techFee: 25,
    appraiserPayout: 330,
    documents: 6,
    lastUpdate: "Order intake complete",
    nextAction: "Assign appraiser",
    loanType: "Conventional",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Mina Patel",
    contactPhone: "(678) 555-0110",
    accessInfo: "Borrower prefers Friday afternoon.",
    assignmentPreference: "Lowest workload in Cobb",
    lenderContact: "Claire Moon",
    parcelNumber: "17-0188-0-043-0",
    timeline: timeline("CAA-26-1053", "Unassigned"),
    notes: [],
    clientComments: [],
    documentsList: documents("CAA-26-1053", "Missing"),
    assignmentHistory: [],
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1053"),
    reviewItems: []
  },
  {
    id: "ord-1007",
    fileNumber: "CAA-26-1054",
    productType: "Final Inspection",
    client: "RidgeLine Bank",
    amc: "Direct Lender",
    borrower: "Daniel Brooks",
    address: "602 Garden Mill Road",
    city: "Canton",
    state: "GA",
    zip: "30114",
    county: "Cherokee",
    appraiser: "Marcus King",
    reviewer: "Rachel Kim",
    orderedDate: "2026-06-29",
    dueDate: "2026-06-30",
    inspectionDate: "2026-06-30",
    status: "Assigned",
    priority: "High",
    fee: 175,
    techFee: 10,
    appraiserPayout: 105,
    documents: 3,
    lastUpdate: "Awaiting inspection photos",
    nextAction: "Upload completion photos",
    loanType: "Construction",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Site supervisor",
    contactPhone: "(770) 555-0122",
    accessInfo: "Builder lockbox. Verify repairs are complete.",
    assignmentPreference: "Original appraiser",
    lenderContact: "Iris Grant",
    parcelNumber: "14N23-124-B",
    timeline: timeline("CAA-26-1054", "Marcus King"),
    notes: [],
    clientComments: [],
    documentsList: documents("CAA-26-1054", "Missing"),
    assignmentHistory: assignmentHistory("CAA-26-1054", "Marcus King"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1054"),
    reviewItems: []
  },
  {
    id: "ord-1008",
    fileNumber: "CAA-26-1055",
    productType: "1004 URAR",
    client: "Northstar Mortgage",
    amc: "Pioneer AMC",
    borrower: "Grace Lin",
    address: "1452 Hidden Creek Drive",
    city: "Duluth",
    state: "GA",
    zip: "30097",
    county: "Gwinnett",
    appraiser: "Priya Shah",
    reviewer: "Maya Chen",
    orderedDate: "2026-06-28",
    dueDate: "2026-07-04",
    inspectionDate: "2026-07-01",
    status: "Accepted",
    priority: "Standard",
    fee: 560,
    techFee: 25,
    appraiserPayout: 336,
    documents: 7,
    lastUpdate: "Accepted by appraiser",
    nextAction: "Schedule inspection",
    loanType: "Conventional",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Grace Lin",
    contactPhone: "(678) 555-0188",
    accessInfo: "Borrower needs 24 hour notice.",
    assignmentPreference: "Preferred by client",
    lenderContact: "Sam Ortiz",
    parcelNumber: "R7258-144",
    timeline: timeline("CAA-26-1055", "Priya Shah"),
    notes: [],
    clientComments: [],
    documentsList: documents("CAA-26-1055", "Missing"),
    assignmentHistory: assignmentHistory("CAA-26-1055", "Priya Shah"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1055"),
    reviewItems: []
  },
  {
    id: "ord-1009",
    fileNumber: "CAA-26-1056",
    productType: "Luxury 1004",
    client: "HarborPoint Lending",
    amc: "Direct Lender",
    borrower: "Caroline West",
    address: "32 Kingsboro Circle",
    city: "Atlanta",
    state: "GA",
    zip: "30305",
    county: "Fulton",
    appraiser: "Talia Morris",
    reviewer: "Maya Chen",
    orderedDate: "2026-06-21",
    dueDate: "2026-07-03",
    inspectionDate: "2026-06-27",
    status: "Submitted",
    priority: "High",
    fee: 925,
    techFee: 45,
    appraiserPayout: 555,
    documents: 13,
    lastUpdate: "Submitted for review",
    nextAction: "Assign reviewer",
    loanType: "Jumbo",
    occupancy: "Primary residence",
    propertyType: "Luxury single family",
    contactName: "Caroline West",
    contactPhone: "(404) 555-0155",
    accessInfo: "Listing agent requires appointment confirmation.",
    assignmentPreference: "Luxury specialist",
    lenderContact: "Claire Moon",
    parcelNumber: "17-0100-0-391-0",
    timeline: timeline("CAA-26-1056", "Talia Morris"),
    notes: [],
    clientComments: [],
    documentsList: documents("CAA-26-1056", "Ready"),
    assignmentHistory: assignmentHistory("CAA-26-1056", "Talia Morris"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1056"),
    reviewItems: [
      { label: "Luxury comparable support", category: "General appraisal", complete: false, severity: "warning" }
    ]
  },
  {
    id: "ord-1010",
    fileNumber: "CAA-26-1057",
    productType: "1004 URAR",
    client: "Summit Credit Union",
    amc: "Direct Lender",
    borrower: "Owen Blake",
    address: "7125 Fox Meadow Lane",
    city: "Douglasville",
    state: "GA",
    zip: "30135",
    county: "Douglas",
    appraiser: "Unassigned",
    reviewer: "Unassigned",
    orderedDate: "2026-06-30",
    dueDate: "2026-07-06",
    status: "New",
    priority: "Watch",
    fee: 540,
    techFee: 25,
    appraiserPayout: 324,
    documents: 4,
    lastUpdate: "New order needs triage",
    nextAction: "Verify coverage",
    loanType: "Conventional",
    occupancy: "Investment",
    propertyType: "Single family",
    contactName: "Owen Blake",
    contactPhone: "(470) 555-0191",
    accessInfo: "Tenant occupied. Call property manager first.",
    assignmentPreference: "Best workload fit",
    lenderContact: "Megan Hall",
    parcelNumber: "0192-00-022-0",
    timeline: timeline("CAA-26-1057", "Unassigned"),
    notes: [],
    clientComments: [],
    documentsList: documents("CAA-26-1057", "Missing"),
    assignmentHistory: [],
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1057"),
    reviewItems: []
  },
  {
    id: "ord-1011",
    fileNumber: "CAA-26-1058",
    productType: "Desktop Review",
    client: "Seaside Bank",
    amc: "Cobalt AMC",
    borrower: "Hannah Moore",
    address: "210 Village Green",
    city: "Decatur",
    state: "GA",
    zip: "30030",
    county: "DeKalb",
    appraiser: "Priya Shah",
    reviewer: "Rachel Kim",
    orderedDate: "2026-06-19",
    dueDate: "2026-06-25",
    status: "Delivered",
    priority: "Standard",
    fee: 300,
    techFee: 15,
    appraiserPayout: 180,
    documents: 8,
    lastUpdate: "Delivered to client",
    nextAction: "Mark completed after invoice sync",
    loanType: "Portfolio",
    occupancy: "Owner occupied",
    propertyType: "Condo",
    contactName: "Hannah Moore",
    contactPhone: "(404) 555-0181",
    accessInfo: "Desktop review only.",
    assignmentPreference: "Desktop specialist",
    lenderContact: "Janelle Price",
    parcelNumber: "15-246-04-022",
    timeline: timeline("CAA-26-1058", "Priya Shah"),
    notes: [],
    clientComments: [
      {
        id: "c11",
        author: "Cobalt AMC",
        body: "Delivery received. Waiting on invoice confirmation.",
        visibility: "client",
        createdAt: "Jun 30, 1:41 PM"
      }
    ],
    documentsList: documents("CAA-26-1058", "Ready"),
    assignmentHistory: assignmentHistory("CAA-26-1058", "Priya Shah"),
    revisionLog: [],
    auditTrail: auditTrail("CAA-26-1058"),
    reviewItems: []
  },
  {
    id: "ord-1012",
    fileNumber: "CAA-26-1059",
    productType: "1004 URAR",
    client: "RidgeLine Bank",
    amc: "Direct Lender",
    borrower: "Ethan Cole",
    address: "55 Oakview Terrace",
    city: "Acworth",
    state: "GA",
    zip: "30101",
    county: "Cobb",
    appraiser: "Jordan Lee",
    reviewer: "Evan Brooks",
    orderedDate: "2026-06-10",
    dueDate: "2026-06-20",
    inspectionDate: "2026-06-15",
    status: "Completed",
    priority: "Standard",
    fee: 565,
    techFee: 25,
    appraiserPayout: 339,
    documents: 10,
    lastUpdate: "Completed and paid",
    nextAction: "No action",
    loanType: "Conventional",
    occupancy: "Primary residence",
    propertyType: "Single family",
    contactName: "Ethan Cole",
    contactPhone: "(770) 555-0141",
    accessInfo: "Completed.",
    assignmentPreference: "Preferred staff appraiser",
    lenderContact: "Iris Grant",
    parcelNumber: "20-0110-0-118-0",
    timeline: timeline("CAA-26-1059", "Jordan Lee"),
    notes: [],
    clientComments: [],
    documentsList: documents("CAA-26-1059", "Ready"),
    assignmentHistory: assignmentHistory("CAA-26-1059", "Jordan Lee"),
    revisionLog: [
      {
        id: "r12",
        requestedBy: "Evan Brooks",
        summary: "Minor reconciliation language update.",
        status: "Resolved",
        requestedAt: "Jun 19, 2:12 PM"
      }
    ],
    auditTrail: auditTrail("CAA-26-1059"),
    reviewItems: []
  }
];

export const dashboardKpis: Kpi[] = [
  { label: "New orders", value: "18", change: "+12% vs last week", tone: "good" },
  { label: "Unassigned", value: "6", change: "3 need coverage", tone: "warn" },
  { label: "Open orders", value: "142", change: "+9 active today", tone: "neutral" },
  { label: "Due today", value: "11", change: "4 in review", tone: "warn" },
  { label: "Past due", value: "3", change: "2 escalated", tone: "bad" },
  { label: "Revenue month", value: "$86.4k", change: "+18% YoY", tone: "good" },
  { label: "Avg turn time", value: "5.8d", change: "0.6d faster", tone: "good" },
  { label: "Revision rate", value: "6.7%", change: "1.1% lower", tone: "good" }
];

export const volumeChart: ChartPoint[] = [
  { label: "Jan", current: 118, previous: 102 },
  { label: "Feb", current: 126, previous: 111 },
  { label: "Mar", current: 139, previous: 117 },
  { label: "Apr", current: 151, previous: 131 },
  { label: "May", current: 168, previous: 144 },
  { label: "Jun", current: 176, previous: 153 }
];

export const revenueChart: ChartPoint[] = [
  { label: "Jan", current: 62, previous: 55 },
  { label: "Feb", current: 67, previous: 59 },
  { label: "Mar", current: 73, previous: 63 },
  { label: "Apr", current: 78, previous: 70 },
  { label: "May", current: 82, previous: 74 },
  { label: "Jun", current: 86, previous: 77 }
];

export const appraisers: AppraiserProfile[] = [
  {
    id: "app-1",
    name: "Jordan Lee",
    role: "Staff",
    counties: ["Cobb", "Paulding", "Cherokee"],
    capacity: 12,
    activeOrders: 10,
    dueThisWeek: 6,
    avgTurnDays: 5.2,
    revisionRate: 4.8,
    payoutDue: 6320,
    licenseStatus: "Current",
    defaultCommissionSplit: 60
  },
  {
    id: "app-2",
    name: "Priya Shah",
    role: "Panel",
    counties: ["Fulton", "DeKalb", "Gwinnett"],
    capacity: 10,
    activeOrders: 8,
    dueThisWeek: 5,
    avgTurnDays: 5.6,
    revisionRate: 5.9,
    payoutDue: 4875,
    licenseStatus: "Expiring",
    defaultCommissionSplit: 58
  },
  {
    id: "app-3",
    name: "Marcus King",
    role: "Staff",
    counties: ["Cherokee", "Bartow", "Cobb"],
    capacity: 9,
    activeOrders: 6,
    dueThisWeek: 3,
    avgTurnDays: 4.9,
    revisionRate: 3.2,
    payoutDue: 3920,
    licenseStatus: "Current",
    defaultCommissionSplit: 62
  },
  {
    id: "app-4",
    name: "Talia Morris",
    role: "Solo",
    counties: ["Fulton", "Cobb", "DeKalb"],
    capacity: 7,
    activeOrders: 5,
    dueThisWeek: 3,
    avgTurnDays: 6.1,
    revisionRate: 7.4,
    payoutDue: 2880,
    licenseStatus: "Current",
    defaultCommissionSplit: 70
  },
  {
    id: "app-5",
    name: "Ari Bennett",
    role: "Panel",
    counties: ["Douglas", "Paulding", "Cobb"],
    capacity: 8,
    activeOrders: 3,
    dueThisWeek: 1,
    avgTurnDays: 5.4,
    revisionRate: 4.1,
    payoutDue: 1410,
    licenseStatus: "Current",
    defaultCommissionSplit: 55
  }
];

export const vendors: VendorProfile[] = [
  {
    id: "ven-1",
    company: "North Metro Valuation",
    contact: "Renee Walker",
    distance: 8.4,
    coverage: ["Cobb", "Fulton", "Cherokee"],
    coverageZips: ["30064", "30339", "30144"],
    radiusMiles: 35,
    officeAddress: "44 Church Street, Marietta, GA",
    roster: ["Renee Walker", "Owen Walker", "Lena Cruz"],
    specialties: ["FHA", "Conventional", "Luxury"],
    status: "Approved",
    turnTime: 5,
    capacity: 14,
    workload: 9,
    rating: 4.8,
    feeSheet: [
      { product: "1004 URAR", fee: 575, turnDays: 5 },
      { product: "FHA 1004", fee: 650, turnDays: 6 },
      { product: "Luxury 1004", fee: 925, turnDays: 8 }
    ],
    documents: { w9: "Current", eo: "Current", license: "Current" }
  },
  {
    id: "ven-2",
    company: "Peachtree Appraisal Group",
    contact: "Andre Holt",
    distance: 17.2,
    coverage: ["Fulton", "DeKalb", "Gwinnett"],
    coverageZips: ["30305", "30319", "30030", "30097"],
    radiusMiles: 45,
    officeAddress: "725 Peachtree Street, Atlanta, GA",
    roster: ["Andre Holt", "Monica Perez"],
    specialties: ["VA", "FHA", "Rural"],
    status: "Pending documents",
    turnTime: 6,
    capacity: 9,
    workload: 6,
    rating: 4.3,
    feeSheet: [
      { product: "VA 1004", fee: 700, turnDays: 6 },
      { product: "FHA 1004", fee: 650, turnDays: 6 }
    ],
    documents: { w9: "Missing", eo: "Current", license: "Current" }
  },
  {
    id: "ven-3",
    company: "Blue Ridge Review Partners",
    contact: "Hannah Cole",
    distance: 24.9,
    coverage: ["Cherokee", "Bartow", "Pickens"],
    coverageZips: ["30114", "30115", "30143"],
    radiusMiles: 60,
    officeAddress: "300 Main Street, Canton, GA",
    roster: ["Hannah Cole", "Bryce Eaton"],
    specialties: ["Review", "Complex", "Acreage"],
    status: "Under review",
    turnTime: 7,
    capacity: 6,
    workload: 4,
    rating: 4.6,
    feeSheet: [
      { product: "Desktop Review", fee: 225, turnDays: 2 },
      { product: "Complex 1004", fee: 850, turnDays: 8 }
    ],
    documents: { w9: "Current", eo: "Expired", license: "Current" }
  }
];

export const notifications: NotificationItem[] = [
  {
    id: "note-1",
    title: "Revision requested",
    detail: "CAA-26-1049 needs FHA repair commentary updated.",
    tone: "warning",
    time: "9:04 AM"
  },
  {
    id: "note-2",
    title: "Report submitted",
    detail: "CAA-26-1048 is ready for review.",
    tone: "success",
    time: "10:48 AM"
  },
  {
    id: "note-3",
    title: "Vendor document expiring",
    detail: "Priya Shah license expires in 28 days.",
    tone: "danger",
    time: "11:22 AM"
  },
  {
    id: "note-4",
    title: "Invoice unpaid",
    detail: "Pioneer AMC has 6 invoices over 30 days.",
    tone: "info",
    time: "12:10 PM"
  }
];

export const savedViews = [
  "All",
  "New",
  "Unassigned",
  "Assigned",
  "Due Today",
  "Due This Week",
  "Past Due",
  "In Review",
  "Revisions",
  "Completed"
] as const;

export const productTypes = [
  "1004 URAR",
  "FHA 1004",
  "VA 1004",
  "2055 Exterior",
  "Desktop Review",
  "Final Inspection",
  "Luxury 1004"
];

export const clients = [
  "HarborPoint Lending",
  "Northstar Mortgage",
  "Seaside Bank",
  "Patriot Home Loans",
  "Summit Credit Union",
  "RidgeLine Bank"
];

export const clientProfiles: ClientProfile[] = [
  {
    id: "client-harbor",
    name: "HarborPoint Lending",
    organizationId: "org-client-1",
    status: "Active",
    defaultTurnDays: 5,
    contacts: [
      { id: "contact-harbor-1", name: "Claire Moon", title: "VP Mortgage Ops", email: "claire@harborpoint.example", phone: "(404) 555-0144" },
      { id: "contact-harbor-2", name: "Jon Reyes", title: "Processor", email: "jon@harborpoint.example", phone: "(404) 555-0199" }
    ],
    notes: "Prefers XML and final PDF delivered together. Rush orders require processor approval.",
    defaultFees: [
      { productType: "1004 URAR", fee: 575 },
      { productType: "FHA 1004", fee: 650 },
      { productType: "Final Inspection", fee: 175 }
    ]
  },
  {
    id: "client-northstar",
    name: "Northstar Mortgage",
    organizationId: "org-firm-1",
    status: "Active",
    defaultTurnDays: 6,
    contacts: [
      { id: "contact-northstar-1", name: "Mallory Chen", title: "Order Desk", email: "orders@northstar.example", phone: "(678) 555-0108" }
    ],
    notes: "FHA files need repair commentary highlighted in client comments before delivery.",
    defaultFees: [
      { productType: "1004 URAR", fee: 595 },
      { productType: "FHA 1004", fee: 675 },
      { productType: "Desktop Review", fee: 250 }
    ]
  },
  {
    id: "client-seaside",
    name: "Seaside Bank",
    organizationId: "org-firm-1",
    status: "Active",
    defaultTurnDays: 7,
    contacts: [
      { id: "contact-seaside-1", name: "Gina Porter", title: "Collateral Manager", email: "gina@seaside.example", phone: "(912) 555-0177" }
    ],
    notes: "Coastal and flood-zone files often need secondary review before client delivery.",
    defaultFees: [
      { productType: "1004 URAR", fee: 625 },
      { productType: "Luxury 1004", fee: 925 },
      { productType: "VA 1004", fee: 700 }
    ]
  },
  {
    id: "client-ridgeline",
    name: "RidgeLine Bank",
    organizationId: "org-firm-1",
    status: "Inactive",
    defaultTurnDays: 8,
    contacts: [
      { id: "contact-ridgeline-1", name: "Elliot Shaw", title: "Credit Admin", email: "elliot@ridgeline.example", phone: "(706) 555-0182" }
    ],
    notes: "Inactive while fee schedule is under renegotiation.",
    defaultFees: [
      { productType: "1004 URAR", fee: 550 },
      { productType: "2055 Exterior", fee: 425 }
    ]
  }
];

export const companyUsers: CompanyUser[] = [
  {
    id: "company-user-admin",
    name: "Nora Fields",
    email: "nora@caavaluation.example",
    role: "company_admin",
    status: "Active",
    permissions: ["invite_users", "manage_company_users", "manage_accounting", "manage_clients", "customize_order_forms", "view_all_orders", "assign_orders"],
    lastActive: "Today, 9:44 AM"
  },
  {
    id: "company-user-staff",
    name: "Mina Patel",
    email: "mina@caavaluation.example",
    role: "office_staff",
    status: "Active",
    permissions: ["view_all_orders", "create_orders", "assign_orders", "manage_clients"],
    lastActive: "Today, 8:21 AM"
  },
  {
    id: "company-user-reviewer",
    name: "Maya Chen",
    email: "maya@caavaluation.example",
    role: "reviewer",
    status: "Active",
    permissions: ["view_all_orders", "review_reports", "deliver_reports"],
    lastActive: "Yesterday, 5:12 PM"
  },
  {
    id: "company-user-pending",
    name: "Sam Ortega",
    email: "sam@caavaluation.example",
    role: "appraiser",
    status: "Pending invite",
    permissions: ["upload_documents", "see_appraiser_payouts", "view_own_orders_only"],
    lastActive: "Invite sent"
  }
];

export const defaultOrderFormTemplate: OrderFormTemplate = {
  id: "template-default",
  name: "Default appraisal intake",
  ownerType: "default",
  updatedAt: "2026-07-07",
  sections: [
    {
      id: "section-client",
      title: "Client and Loan",
      hidden: false,
      fields: [
        { id: "field-client", label: "Client", type: "select", required: true, options: clients },
        { id: "field-loan-type", label: "Loan type", type: "select", required: true, options: ["Conventional", "FHA", "VA", "USDA", "Jumbo", "Portfolio"] },
        { id: "field-product", label: "Product type", type: "select", required: true, options: productTypes },
        { id: "field-due-date", label: "Due date", type: "date", required: true }
      ]
    },
    {
      id: "section-property",
      title: "Borrower and Property",
      hidden: false,
      fields: [
        { id: "field-borrower", label: "Borrower", type: "text", required: true },
        { id: "field-address", label: "Property address", type: "text", required: true },
        { id: "field-county", label: "County", type: "text", required: true },
        { id: "field-access", label: "Contact/access info", type: "textarea", required: false }
      ]
    },
    {
      id: "section-fees",
      title: "Fees and Assignment",
      hidden: false,
      fields: [
        { id: "field-fee", label: "Fee", type: "currency", required: true },
        { id: "field-tech-fee", label: "Tech fee", type: "currency", required: true },
        { id: "field-priority", label: "Priority", type: "select", required: true, options: ["Standard", "Watch", "High", "Rush"] },
        { id: "field-assignment", label: "Assignment preference", type: "select", required: false, options: ["Best workload fit", "Preferred appraiser", "County specialist", "Manual assignment"] }
      ]
    },
    {
      id: "section-documents",
      title: "Documents",
      hidden: false,
      fields: [
        { id: "field-documents", label: "Document upload placeholder", type: "upload", required: false },
        { id: "field-notes", label: "Notes", type: "textarea", required: false }
      ]
    }
  ]
};

export const calendarPreferences: CalendarPreference[] = [
  { id: "cal-jordan", appraiser: "Jordan Lee", googleConnected: true, syncInspections: true, syncDueDates: true },
  { id: "cal-priya", appraiser: "Priya Shah", googleConnected: false, syncInspections: true, syncDueDates: false },
  { id: "cal-marcus", appraiser: "Marcus King", googleConnected: false, syncInspections: false, syncDueDates: true },
  { id: "cal-talia", appraiser: "Talia Morris", googleConnected: true, syncInspections: true, syncDueDates: true }
];
