import type {
  AccountingEntry,
  Invoice,
  Organization,
  PortalUser,
  ReviewQueueItem,
  VendorDocument
} from "@/types/domain";

export const organizations: Organization[] = [
  {
    id: "org-firm-1",
    name: "CAA Valuation Group",
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
    fee: 575,
    techFee: 25,
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
    fee: 650,
    techFee: 35,
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
    fee: 725,
    techFee: 35,
    appraiserSplit: 435,
    companyRevenue: 325,
    status: "Paid",
    month: "2026-06"
  },
  {
    id: "acct-4",
    orderId: "ord-1009",
    client: "RidgeLine Bank",
    appraiser: "Jordan Lee",
    fee: 550,
    techFee: 25,
    appraiserSplit: 330,
    companyRevenue: 245,
    status: "Unpaid",
    month: "2026-07"
  }
];

export const invoices: Invoice[] = [
  { id: "inv-1001", client: "HarborPoint Lending", amount: 3275, status: "Sent", dueDate: "2026-07-15", orderCount: 5 },
  { id: "inv-1002", client: "Pioneer AMC", amount: 4180, status: "Overdue", dueDate: "2026-06-28", orderCount: 6 },
  { id: "inv-1003", client: "Seaside Bank", amount: 2210, status: "Paid", dueDate: "2026-06-30", orderCount: 3 },
  { id: "inv-1004", client: "RidgeLine Bank", amount: 1650, status: "Draft", dueDate: "2026-07-20", orderCount: 3 }
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
