import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Archive, BarChart3, Bell, Bot, Building2, CalendarDays, ClipboardCheck, FileCheck2, FileText, Gavel, Inbox, LayoutDashboard, ListChecks, ListTodo, MessageSquare, Network, Plus, ReceiptText, Settings, ShieldCheck, UserCheck, Users2, WalletCards } from "lucide-react";
import { savedViews } from "@/data/demo";
import type { OrderStatus, UserRole } from "@/types/domain";

export type NavId =
  | "dashboard"
  | "orders"
  | "completed-orders"
  | "cancelled-orders"
  | "all-orders"
  | "my-orders"
  | "connected"
  | "incoming-orders"
  | "bids"
  | "tasks"
  | "automations"
  | "new-order"
  | "place-order"
  | "calendar"
  | "review"
  | "review-queue"
  | "completed-reviews"
  | "templates"
  | "appraisers"
  | "clients"
  | "vendors"
  | "vendor-invites"
  | "compliance"
  | "accounting"
  | "pay"
  | "analytics"
  | "documents"
  | "messages"
  | "reports"
  | "revisions"
  | "notifications"
  | "settings";

export const navCatalog: Record<NavId, { label: string; icon: LucideIcon }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  orders: { label: "Active Orders", icon: ListChecks },
  "completed-orders": { label: "Completed", icon: FileCheck2 },
  "cancelled-orders": { label: "Cancelled", icon: Archive },
  "all-orders": { label: "All Orders", icon: ListChecks },
  "my-orders": { label: "My Orders", icon: ListChecks },
  connected: { label: "Connected", icon: Network },
  "incoming-orders": { label: "Incoming", icon: Inbox },
  bids: { label: "Bids", icon: Gavel },
  tasks: { label: "Tasks", icon: ListTodo },
  automations: { label: "Automations", icon: Bot },
  "new-order": { label: "New Order", icon: Plus },
  "place-order": { label: "Place Order", icon: Plus },
  calendar: { label: "Calendar", icon: CalendarDays },
  review: { label: "Review", icon: ClipboardCheck },
  "review-queue": { label: "Review Queue", icon: ClipboardCheck },
  "completed-reviews": { label: "Completed Reviews", icon: FileCheck2 },
  templates: { label: "Templates", icon: FileText },
  appraisers: { label: "Appraisers", icon: Users2 },
  clients: { label: "Clients", icon: Building2 },
  vendors: { label: "Vendors", icon: ShieldCheck },
  "vendor-invites": { label: "Vendor Invites", icon: UserCheck },
  compliance: { label: "Compliance", icon: ShieldCheck },
  accounting: { label: "Accounting", icon: WalletCards },
  pay: { label: "Pay", icon: ReceiptText },
  analytics: { label: "Analytics", icon: BarChart3 },
  documents: { label: "Documents", icon: FileText },
  messages: { label: "Messages", icon: MessageSquare },
  reports: { label: "Reports", icon: FileCheck2 },
  revisions: { label: "Revisions", icon: AlertTriangle },
  notifications: { label: "Notifications", icon: Bell },
  settings: { label: "Settings", icon: Settings }
};

export const roleNavigation: Record<UserRole, NavId[]> = {
  super_admin: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "automations", "orders", "completed-orders", "cancelled-orders", "all-orders", "new-order", "calendar", "review", "appraisers", "clients", "accounting", "analytics", "notifications", "settings"],
  company_admin: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "automations", "orders", "completed-orders", "cancelled-orders", "all-orders", "new-order", "calendar", "review", "appraisers", "clients", "accounting", "analytics", "notifications", "settings"],
  office_staff: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "automations", "orders", "completed-orders", "cancelled-orders", "new-order", "calendar", "appraisers", "clients", "documents", "notifications"],
  appraiser_manager: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "orders", "completed-orders", "calendar", "appraisers", "accounting", "analytics", "notifications"],
  appraiser: ["dashboard", "connected", "incoming-orders", "tasks", "my-orders", "completed-orders", "calendar", "revisions", "documents", "pay"],
  solo_appraiser: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "automations", "my-orders", "completed-orders", "place-order", "calendar", "revisions", "documents", "pay", "settings"],
  reviewer: ["dashboard", "connected", "tasks", "review-queue", "revisions", "completed-reviews", "documents", "templates"],
  amc_admin: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "automations", "orders", "completed-orders", "cancelled-orders", "place-order", "vendors", "vendor-invites", "compliance", "reports", "notifications", "settings"],
  amc_staff: ["dashboard", "connected", "incoming-orders", "bids", "tasks", "orders", "completed-orders", "place-order", "vendors", "vendor-invites", "reports", "notifications"],
  client_user: ["dashboard", "connected", "place-order", "my-orders", "completed-orders", "documents", "messages"]
};

export const statusFilters: Array<"All" | OrderStatus> = [
  "All",
  "New",
  "Unassigned",
  "Assigned",
  "Accepted",
  "Inspection Scheduled",
  "Inspected",
  "Report In Progress",
  "Submitted",
  "In Review",
  "Revisions Needed",
  "Revision Sent to Appraiser",
  "Ready for Delivery",
  "Delivered",
  "Completed",
  "On Hold",
  "Cancelled"
];

export type SavedView = (typeof savedViews)[number];

export const orderStatusOptions: OrderStatus[] = [
  "New",
  "Unassigned",
  "Assigned",
  "Accepted",
  "Inspection Scheduled",
  "Inspected",
  "Report In Progress",
  "Submitted",
  "In Review",
  "Revisions Needed",
  "Revision Sent to Appraiser",
  "Ready for Delivery",
  "Delivered",
  "Completed",
  "On Hold",
  "Cancelled"
];

export const demoMode = process.env.NEXT_PUBLIC_CAS_DEMO_MODE !== "false" && process.env.NEXT_PUBLIC_CAS_DATA_SOURCE !== "supabase";


export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    company_admin: "Company Admin",
    office_staff: "Office Staff",
    appraiser: "Appraiser",
    appraiser_manager: "Appraiser Manager",
    reviewer: "Reviewer",
    amc_admin: "AMC Admin",
    amc_staff: "AMC Staff",
    client_user: "Lender/Client",
    solo_appraiser: "Solo Appraiser"
  };
  return labels[role];
}
