import type {
  AppraiserProfile,
  ChartPoint,
  Kpi,
  NotificationItem,
  Order,
  PermissionKey,
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
  { key: "export_reports", label: "Export reports", group: "Reporting" }
];

const orderTimeline = (fileNumber: string) => [
  {
    label: "Order received",
    detail: `${fileNumber} imported from client portal`,
    at: "Jun 24, 9:18 AM",
    actor: "CAS Intake"
  },
  {
    label: "Assignment reviewed",
    detail: "Coverage, complexity, fee, and due date checked",
    at: "Jun 24, 9:41 AM",
    actor: "Nora Fields"
  },
  {
    label: "Appraiser notified",
    detail: "Assignment package and access notes sent",
    at: "Jun 24, 10:02 AM",
    actor: "CAS Workflow"
  }
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
    documents: 8,
    lastUpdate: "Report submitted 2h ago",
    nextAction: "Complete review checklist",
    loanType: "Conventional",
    occupancy: "Primary residence",
    propertyType: "Single family",
    timeline: orderTimeline("CAA-26-1048"),
    notes: [
      {
        id: "n1",
        author: "Maya Chen",
        body: "Reviewer requested contract addendum before final approval.",
        visibility: "internal",
        createdAt: "Jun 29, 11:16 AM"
      }
    ],
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
    dueDate: "2026-06-29",
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
    timeline: orderTimeline("CAA-26-1049"),
    notes: [
      {
        id: "n2",
        author: "Evan Brooks",
        body: "FHA repair commentary needs stronger support and photo reference.",
        visibility: "appraiser",
        createdAt: "Jun 29, 9:04 AM"
      }
    ],
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
    timeline: orderTimeline("CAA-26-1050"),
    notes: [
      {
        id: "n3",
        author: "Nora Fields",
        body: "Borrower requested a morning exterior window due to gated access.",
        visibility: "internal",
        createdAt: "Jun 28, 4:42 PM"
      }
    ],
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
    status: "Past Due" as never,
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
    timeline: orderTimeline("CAA-26-1051"),
    notes: [
      {
        id: "n4",
        author: "CAS Workflow",
        body: "Due date alert sent to appraiser and manager.",
        visibility: "internal",
        createdAt: "Jun 29, 8:00 AM"
      }
    ],
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
    reviewer: "Maya Chen",
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
    timeline: orderTimeline("CAA-26-1052"),
    notes: [
      {
        id: "n5",
        author: "Talia Morris",
        body: "Need client confirmation on renovation date.",
        visibility: "client",
        createdAt: "Jun 28, 12:27 PM"
      }
    ],
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
    orderedDate: "2026-06-29",
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
    timeline: [
      {
        label: "Order created",
        detail: "Loan package and engagement letter uploaded",
        at: "Jun 29, 10:31 AM",
        actor: "Nora Fields"
      }
    ],
    notes: [],
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
    licenseStatus: "Current"
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
    licenseStatus: "Expiring"
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
    licenseStatus: "Current"
  },
  {
    id: "app-4",
    name: "Talia Morris",
    role: "Solo",
    counties: ["Fulton", "Cobb"],
    capacity: 7,
    activeOrders: 5,
    dueThisWeek: 3,
    avgTurnDays: 6.1,
    revisionRate: 7.4,
    payoutDue: 2880,
    licenseStatus: "Current"
  }
];

export const vendors: VendorProfile[] = [
  {
    id: "ven-1",
    company: "North Metro Valuation",
    contact: "Renee Walker",
    distance: 8.4,
    coverage: ["Cobb", "Fulton", "Cherokee"],
    specialties: ["FHA", "Conventional", "Luxury"],
    status: "Approved",
    turnTime: 5,
    capacity: 14,
    documents: { w9: "Current", eo: "Current", license: "Current" }
  },
  {
    id: "ven-2",
    company: "Peachtree Appraisal Group",
    contact: "Andre Holt",
    distance: 17.2,
    coverage: ["Fulton", "DeKalb", "Gwinnett"],
    specialties: ["VA", "FHA", "Rural"],
    status: "Pending documents",
    turnTime: 6,
    capacity: 9,
    documents: { w9: "Missing", eo: "Current", license: "Current" }
  },
  {
    id: "ven-3",
    company: "Blue Ridge Review Partners",
    contact: "Hannah Cole",
    distance: 24.9,
    coverage: ["Cherokee", "Bartow", "Pickens"],
    specialties: ["Review", "Complex", "Acreage"],
    status: "Under review",
    turnTime: 7,
    capacity: 6,
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

export const savedViews = ["All active", "Due today", "Unassigned", "In review", "Past due", "Revisions"];

export const productTypes = ["1004 URAR", "FHA 1004", "VA 1004", "2055 Exterior", "Desktop Review", "Final Inspection"];

export const clients = ["HarborPoint Lending", "Northstar Mortgage", "Seaside Bank", "Patriot Home Loans", "Summit Credit Union"];
