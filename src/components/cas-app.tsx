"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Command,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  FileUp,
  Filter,
  Gauge,
  History,
  Home,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquare,
  PanelLeft,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UserCheck,
  UserCog,
  Users2,
  WalletCards,
  Workflow,
  X
} from "lucide-react";
import {
  appraisers,
  calendarPreferences,
  clientProfiles,
  clients,
  companyUsers,
  dashboardKpis,
  defaultOrderFormTemplate,
  notifications,
  orders,
  permissionCatalog,
  productTypes,
  revenueChart,
  reviewers,
  savedViews,
  vendors,
  volumeChart,
  workflowSteps
} from "@/data/demo";
import {
  accountingEntries,
  invoices,
  organizations,
  portalUsers,
  reviewQueue,
  reviewTemplates,
  vendorDocuments
} from "@/data/platform";
import type {
  AccountingEntry,
  AppraiserProfile,
  CalendarPreference,
  ChartPoint,
  ClientProfile,
  CompanyUser,
  Invoice,
  Kpi,
  Note,
  Order,
  OrderFormTemplate,
  OrderStatus,
  Organization,
  PermissionKey,
  PortalUser,
  UserRole,
  VendorDocument,
  VendorProfile
} from "@/types/domain";
import {
  canAssignOrders,
  canCreateOrders,
  canCustomizeOrderForms,
  canDeliverReports,
  canInviteUsers,
  canManageAccounting,
  canManageClients,
  canManageCompanyUsers,
  canInviteVendors,
  canReviewReports,
  canViewAccounting,
  canViewAllOrders,
  canViewOwnOrdersOnly
} from "@/lib/permissions";
import { cn, daysUntil, dueTone, formatCurrency, formatDate, priorityTone, statusTone } from "@/lib/utils";

type NavId =
  | "dashboard"
  | "orders"
  | "my-orders"
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

const navCatalog: Record<NavId, { label: string; icon: LucideIcon }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  orders: { label: "Orders", icon: ListChecks },
  "my-orders": { label: "My Orders", icon: ListChecks },
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

const roleNavigation: Record<UserRole, NavId[]> = {
  super_admin: ["dashboard", "orders", "new-order", "calendar", "review", "appraisers", "clients", "accounting", "analytics", "settings"],
  company_admin: ["dashboard", "orders", "new-order", "calendar", "review", "appraisers", "clients", "accounting", "analytics", "settings"],
  office_staff: ["dashboard", "orders", "new-order", "calendar", "appraisers", "clients", "documents", "notifications"],
  appraiser_manager: ["dashboard", "orders", "calendar", "appraisers", "accounting", "analytics"],
  appraiser: ["dashboard", "my-orders", "calendar", "revisions", "documents", "pay"],
  solo_appraiser: ["dashboard", "my-orders", "place-order", "calendar", "revisions", "documents", "pay", "settings"],
  reviewer: ["dashboard", "review-queue", "completed-reviews", "templates"],
  amc_admin: ["dashboard", "orders", "place-order", "vendors", "vendor-invites", "compliance", "reports", "settings"],
  amc_staff: ["dashboard", "orders", "place-order", "vendors", "vendor-invites", "reports"],
  client_user: ["dashboard", "place-order", "my-orders", "documents", "messages"]
};

const statusFilters: Array<"All" | OrderStatus> = [
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
  "Completed"
];

type SavedView = (typeof savedViews)[number];

const orderStatusOptions: OrderStatus[] = [
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

const demoMode = true;

function applyAccountingSplit(entry: AccountingEntry, split: number): AccountingEntry {
  const payout = Math.round(Math.max(0, entry.fee - entry.techFee) * (split / 100));
  return {
    ...entry,
    commissionSplit: split,
    appraiserSplit: payout,
    companyRevenue: Math.max(0, entry.fee - entry.techFee - payout)
  };
}

function filterOrdersForUser(orderList: Order[], user: PortalUser, organization: Organization) {
  if (canViewAllOrders(user)) return orderList;
  if (user.appraiserName) return orderList.filter((order) => order.appraiser === user.appraiserName || order.appraiser === "Unassigned");
  if (user.clientName) return orderList.filter((order) => order.client === user.clientName);
  if (organization.type === "amc") return orderList.filter((order) => order.amc === organization.name || order.client === organization.name);
  return orderList.filter((order) => order.client === organization.name || order.appraiser === user.name);
}

function roleLabel(role: UserRole) {
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

export function CasApp() {
  const [activeView, setActiveView] = useState<NavId>("dashboard");
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const [appraiserList, setAppraiserList] = useState<AppraiserProfile[]>(appraisers);
  const [clientList, setClientList] = useState<ClientProfile[]>(clientProfiles);
  const [companyUserList, setCompanyUserList] = useState<CompanyUser[]>(companyUsers);
  const [vendorList, setVendorList] = useState<VendorProfile[]>(vendors);
  const [vendorDocumentList, setVendorDocumentList] = useState<VendorDocument[]>(vendorDocuments);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(invoices);
  const [accountingList, setAccountingList] = useState<AccountingEntry[]>(accountingEntries);
  const [orderFormTemplate, setOrderFormTemplate] = useState<OrderFormTemplate>(defaultOrderFormTemplate);
  const [calendarPreferenceList, setCalendarPreferenceList] = useState<CalendarPreference[]>(calendarPreferences);
  const [activeUserId, setActiveUserId] = useState(portalUsers[0].id);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0].id);
  const [commandOpen, setCommandOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const activeUser = portalUsers.find((user) => user.id === activeUserId) ?? portalUsers[0];
  const activeOrganization = organizations.find((organization) => organization.id === activeUser.organizationId) ?? organizations[0];
  const activeNavItems = roleNavigation[activeUser.role].map((id) => ({ id, ...navCatalog[id] }));
  const visibleOrders = filterOrdersForUser(orderList, activeUser, activeOrganization);
  const selectedOrder = visibleOrders.find((order) => order.id === selectedOrderId) ?? visibleOrders[0] ?? orderList[0];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!roleNavigation[activeUser.role].includes(activeView)) {
      setActiveView("dashboard");
    }
  }, [activeUser.role, activeView]);

  const currentTitle = navCatalog[activeView]?.label ?? "Dashboard";

  function updateOrder(orderId: string, updater: (order: Order) => Order) {
    setOrderList((currentOrders) => currentOrders.map((order) => (order.id === orderId ? updater(order) : order)));
  }

  function handleAssignOrder(orderId: string, appraiserName: string, note: string) {
    updateOrder(orderId, (order) => {
      const noteBody = note.trim();
      const assignmentNote: Note | null = noteBody
        ? {
            id: `${order.id}-assignment-note-${Date.now()}`,
            author: "Nora Fields",
            body: noteBody,
            visibility: "internal",
            createdAt: "Just now"
          }
        : null;

      return {
        ...order,
        appraiser: appraiserName,
        status: order.status === "New" || order.status === "Unassigned" ? "Assigned" : order.status,
        nextAction: "Await appraiser acceptance",
        lastUpdate: `Assigned to ${appraiserName}`,
        notes: assignmentNote ? [assignmentNote, ...order.notes] : order.notes,
        assignmentHistory: [
          {
            id: `${order.id}-assigned-${Date.now()}`,
            appraiser: appraiserName,
            action: order.appraiser === "Unassigned" ? "Assigned" : "Reassigned",
            actor: "Nora Fields",
            note: noteBody || "Assigned from CAS workload panel.",
            at: "Just now"
          },
          ...order.assignmentHistory
        ],
        timeline: [
          {
            label: order.appraiser === "Unassigned" ? "Appraiser assigned" : "Appraiser reassigned",
            detail: `${appraiserName} selected from workload panel`,
            at: "Just now",
            actor: "Nora Fields"
          },
          ...order.timeline
        ],
        auditTrail: [
          {
            id: `${order.id}-audit-${Date.now()}`,
            action: `Assigned to ${appraiserName}`,
            actor: "Nora Fields",
            at: "Just now"
          },
          ...order.auditTrail
        ]
      };
    });
  }

  function handleStatusChange(orderId: string, status: OrderStatus) {
    updateOrder(orderId, (order) => ({
      ...order,
      status,
      lastUpdate: `Status changed to ${status}`,
      nextAction: status === "Completed" ? "No action" : order.nextAction,
      timeline: [
        {
          label: "Status updated",
          detail: `${order.status} moved to ${status}`,
          at: "Just now",
          actor: "Nora Fields"
        },
        ...order.timeline
      ],
      auditTrail: [
        {
          id: `${order.id}-status-${Date.now()}`,
          action: `Status changed from ${order.status} to ${status}`,
          actor: "Nora Fields",
          at: "Just now"
        },
        ...order.auditTrail
      ]
    }));
  }

  function handleAddNote(orderId: string) {
    updateOrder(orderId, (order) => ({
      ...order,
      lastUpdate: "Internal note added",
      notes: [
        {
          id: `${order.id}-note-${Date.now()}`,
          author: "Nora Fields",
          body: "Followed up on current next action from the orders worklist.",
          visibility: "internal",
          createdAt: "Just now"
        },
        ...order.notes
      ],
      auditTrail: [
        {
          id: `${order.id}-note-audit-${Date.now()}`,
          action: "Internal note added",
          actor: "Nora Fields",
          at: "Just now"
        },
        ...order.auditTrail
      ]
    }));
  }

  function handleCreateOrder(kind: "internal" | "client" | "amc", templateName = orderFormTemplate.name) {
    const nextNumber = `CAA-26-${1060 + orderList.length}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      fileNumber: nextNumber,
      productType: kind === "amc" ? "FHA 1004" : "1004 URAR",
      client: activeUser.clientName ?? activeOrganization.name,
      amc: activeOrganization.type === "amc" ? activeOrganization.name : "Direct Lender",
      borrower: kind === "client" ? "New Client Borrower" : "New Intake Borrower",
      address: "1220 Portal Created Drive",
      city: "Atlanta",
      state: "GA",
      zip: "30339",
      county: "Cobb",
      appraiser: "Unassigned",
      reviewer: "Maya Chen",
      orderedDate: "2026-07-06",
      dueDate: "2026-07-11",
      status: "New",
      priority: kind === "amc" ? "High" : "Standard",
      fee: kind === "amc" ? 625 : 575,
      techFee: 35,
      appraiserPayout: 0,
      documents: 2,
      lastUpdate: `Created by ${activeUser.name}`,
      nextAction: "Review intake and assign",
      loanType: "Conventional",
      occupancy: "Primary residence",
      propertyType: "Single family",
      contactName: activeUser.name,
      contactPhone: activeOrganization.phone,
      accessInfo: "Portal order placeholder. Confirm access before assignment.",
      assignmentPreference: "Best workload fit",
      lenderContact: activeUser.name,
      parcelNumber: "Pending",
      timeline: [
        {
          label: "Order placed",
          detail: `${activeOrganization.name} submitted the order through the portal`,
          at: "Just now",
          actor: activeUser.name
        }
      ],
      notes: [
        {
          id: `${Date.now()}-note`,
          author: activeUser.name,
          body: `Created from ${templateName} intake template.`,
          visibility: kind === "client" ? "client" : "internal",
          createdAt: "Just now"
        }
      ],
      clientComments: [],
      documentsList: [
        {
          id: `${nextNumber}-engagement`,
          name: "Engagement letter placeholder.pdf",
          type: "Engagement",
          status: "Needs review",
          uploadedBy: activeUser.name,
          uploadedAt: "Just now"
        }
      ],
      assignmentHistory: [],
      revisionLog: [],
      auditTrail: [
        {
          id: `${nextNumber}-audit`,
          action: "Portal order created",
          actor: activeUser.name,
          at: "Just now"
        }
      ],
      reviewItems: []
    };

    setOrderList((currentOrders) => [newOrder, ...currentOrders]);
    setSelectedOrderId(newOrder.id);
    setActiveView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders");
  }

  function handleInviteVendor() {
    setVendorList((currentVendors) => [
      {
        id: `ven-${Date.now()}`,
        company: "Invited Regional Appraisal Co.",
        contact: "Pending contact",
        distance: 14.6,
        coverage: ["Cobb", "Fulton"],
        coverageZips: ["30064", "30339"],
        radiusMiles: 35,
        officeAddress: "Invitation pending",
        roster: ["Pending roster"],
        specialties: ["Conventional", "FHA"],
        status: "Invited",
        turnTime: 6,
        capacity: 8,
        workload: 2,
        rating: 0,
        feeSheet: [{ product: "1004 URAR", fee: 575, turnDays: 6 }],
        documents: { w9: "Missing", eo: "Missing", license: "Missing" }
      },
      ...currentVendors
    ]);
    setActiveView("vendor-invites");
  }

  function handleVendorDocumentStatus(vendorId: string, documentType: VendorDocument["type"], status: VendorDocument["status"]) {
    setVendorDocumentList((currentDocuments) => {
      const existing = currentDocuments.find((document) => document.vendorId === vendorId && document.type === documentType);
      if (!existing) {
        return [
          { id: `${vendorId}-${documentType}`, vendorId, type: documentType, status, uploadedAt: "Just now" },
          ...currentDocuments
        ];
      }

      return currentDocuments.map((document) => (document.id === existing.id ? { ...document, status, uploadedAt: "Just now" } : document));
    });
  }

  function handleReviewAction(orderId: string, action: "return" | "approve" | "deliver") {
    const status: OrderStatus = action === "return" ? "Revisions Needed" : action === "approve" ? "Ready for Delivery" : "Delivered";
    updateOrder(orderId, (order) => ({
      ...order,
      status,
      lastUpdate: action === "return" ? "Returned to appraiser" : action === "approve" ? "Approved by reviewer" : "Delivered to client",
      nextAction: action === "return" ? "Appraiser response needed" : action === "approve" ? "Deliver final report" : "Invoice order",
      timeline: [
        {
          label: action === "return" ? "Returned to appraiser" : action === "approve" ? "Review approved" : "Report delivered",
          detail: `${activeUser.name} updated review workflow`,
          at: "Just now",
          actor: activeUser.name
        },
        ...order.timeline
      ],
      revisionLog: action === "return"
        ? [
            {
              id: `${order.id}-review-return-${Date.now()}`,
              requestedBy: activeUser.name,
              summary: "Reviewer returned report with template comments.",
              status: "Open",
              requestedAt: "Just now"
            },
            ...order.revisionLog
          ]
        : order.revisionLog
    }));
  }

  function handleUpdateDefaultSplit(appraiserName: string, split: number) {
    setAppraiserList((current) =>
      current.map((appraiser) =>
        appraiser.name === appraiserName ? { ...appraiser, defaultCommissionSplit: split } : appraiser
      )
    );
    setAccountingList((current) =>
      current.map((entry) => (entry.appraiser === appraiserName ? applyAccountingSplit(entry, split) : entry))
    );
  }

  function handleOverrideCommission(orderId: string, split: number) {
    setAccountingList((current) =>
      current.map((entry) => (entry.orderId === orderId ? applyAccountingSplit(entry, split) : entry))
    );
    updateOrder(orderId, (order) => {
      const payout = Math.round(Math.max(0, order.fee - order.techFee) * (split / 100));
      return {
        ...order,
        commissionSplitOverride: split,
        appraiserPayout: payout,
        lastUpdate: `Commission override set to ${split}%`
      };
    });
  }

  function handleMarkPayrollPaid(entryIds: string[]) {
    const ids = new Set(entryIds);
    setAccountingList((current) =>
      current.map((entry) =>
        ids.has(entry.id)
          ? { ...entry, status: "Paid", paidAt: "2026-07-08" }
          : entry
      )
    );
  }

  function handleExportPayrollCsv(entriesToExport: AccountingEntry[]) {
    const rows = [
      ["Order", "Completed", "Client", "Appraiser", "Product", "County", "Gross fee", "Tech fee", "Split", "Payout", "Status"],
      ...entriesToExport.map((entry) => [
        entry.orderId,
        entry.completedAt,
        entry.client,
        entry.appraiser,
        entry.productType,
        entry.county,
        String(entry.fee),
        String(entry.techFee),
        `${entry.commissionSplit}%`,
        String(entry.appraiserSplit),
        entry.status
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cas-payroll-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleAddClient() {
    const newClient: ClientProfile = {
      id: `client-${Date.now()}`,
      name: `New Client ${clientList.length + 1}`,
      organizationId: activeOrganization.id,
      status: "Active",
      defaultTurnDays: 6,
      contacts: [
        { id: `contact-${Date.now()}`, name: "New contact", title: "Order desk", email: "orders@example.com", phone: "(404) 555-0101" }
      ],
      notes: "New client added during this demo session.",
      defaultFees: [
        { productType: "1004 URAR", fee: 575 },
        { productType: "FHA 1004", fee: 650 }
      ]
    };
    setClientList((current) => [newClient, ...current]);
  }

  function handleUpdateClient(clientId: string, patch: Partial<ClientProfile>) {
    setClientList((current) => current.map((client) => (client.id === clientId ? { ...client, ...patch } : client)));
  }

  function handleInviteCompanyUser() {
    setCompanyUserList((current) => [
      {
        id: `company-user-${Date.now()}`,
        name: "Pending teammate",
        email: `invite${current.length + 1}@caavaluation.example`,
        role: "office_staff",
        status: "Pending invite",
        permissions: ["view_all_orders", "create_orders"],
        lastActive: "Invite sent just now"
      },
      ...current
    ]);
  }

  function handleChangeCompanyUserRole(userId: string, role: UserRole) {
    setCompanyUserList((current) => current.map((companyUser) => (companyUser.id === userId ? { ...companyUser, role } : companyUser)));
  }

  function handleToggleCompanyUserPermission(userId: string, permission: PermissionKey) {
    setCompanyUserList((current) =>
      current.map((companyUser) => {
        if (companyUser.id !== userId) return companyUser;
        const hasPermission = companyUser.permissions.includes(permission);
        return {
          ...companyUser,
          permissions: hasPermission
            ? companyUser.permissions.filter((item) => item !== permission)
            : [...companyUser.permissions, permission]
        };
      })
    );
  }

  function handleDeactivateCompanyUser(userId: string) {
    setCompanyUserList((current) =>
      current.map((companyUser) =>
        companyUser.id === userId
          ? { ...companyUser, status: companyUser.status === "Inactive" ? "Active" : "Inactive" }
          : companyUser
      )
    );
  }

  function handleToggleCalendarPreference(preferenceId: string, key: keyof Pick<CalendarPreference, "googleConnected" | "syncInspections" | "syncDueDates">) {
    setCalendarPreferenceList((current) =>
      current.map((preference) =>
        preference.id === preferenceId ? { ...preference, [key]: !preference[key] } : preference
      )
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-slate-950 lg:grid lg:grid-cols-[264px_1fr]">
      <Sidebar
        activeView={activeView}
        navItems={activeNavItems}
        user={activeUser}
        organization={activeOrganization}
        onNavigate={setActiveView}
      />
      <div className="min-w-0">
        <Topbar
          title={currentTitle}
          user={activeUser}
          organization={activeOrganization}
          query={globalQuery}
          setQuery={setGlobalQuery}
          onCommand={() => setCommandOpen(true)}
          onUserChange={setActiveUserId}
        />
        <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          {activeView === "dashboard" && (
            <DashboardView
              orderList={visibleOrders}
              user={activeUser}
              organization={activeOrganization}
              vendors={vendorList}
              accountingEntries={accountingList}
              onOpenOrders={() => setActiveView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders")}
              onPlaceOrder={() => setActiveView(["amc_admin", "amc_staff", "client_user", "solo_appraiser"].includes(activeUser.role) ? "place-order" : canCreateOrders(activeUser) ? "new-order" : "orders")}
              onInviteVendor={handleInviteVendor}
            />
          )}
          {(activeView === "orders" || activeView === "my-orders") && (
            <OrdersView
              orderList={visibleOrders}
              selectedOrder={selectedOrder}
              user={activeUser}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
              onAssignOrder={handleAssignOrder}
              onStatusChange={handleStatusChange}
              onAddNote={handleAddNote}
            />
          )}
          {(activeView === "new-order" || activeView === "place-order") && (
            <NewOrderView
              user={activeUser}
              organization={activeOrganization}
              template={orderFormTemplate}
              onTemplateChange={setOrderFormTemplate}
              onRestoreTemplate={() => setOrderFormTemplate(defaultOrderFormTemplate)}
              onCreateOrder={handleCreateOrder}
            />
          )}
          {activeView === "calendar" && (
            <CalendarView
              orderList={visibleOrders.length ? visibleOrders : orderList}
              appraisers={appraiserList}
              preferences={calendarPreferenceList}
              onTogglePreference={handleToggleCalendarPreference}
            />
          )}
          {(activeView === "review" || activeView === "review-queue") && <ReviewView orderList={visibleOrders.length ? visibleOrders : orderList} user={activeUser} onReviewAction={handleReviewAction} onSelectOrder={(order) => { setSelectedOrderId(order.id); setActiveView("orders"); }} />}
          {activeView === "completed-reviews" && <CompletedReviewsView orderList={orderList} />}
          {activeView === "templates" && <ReviewTemplatesView />}
          {activeView === "appraisers" && <AppraiserPortalView orderList={visibleOrders.length ? visibleOrders : orderList} />}
          {activeView === "clients" && (
            <ClientsView
              user={activeUser}
              clientList={clientList}
              orderList={orderList}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
            />
          )}
          {activeView === "vendors" && <VendorView vendors={vendorList} vendorDocuments={vendorDocumentList} user={activeUser} onInviteVendor={handleInviteVendor} />}
          {activeView === "vendor-invites" && <VendorInvitesView vendors={vendorList} onInviteVendor={handleInviteVendor} />}
          {activeView === "compliance" && <ComplianceView vendors={vendorList} vendorDocuments={vendorDocumentList} onDocumentStatusChange={handleVendorDocumentStatus} />}
          {(activeView === "accounting" || activeView === "pay") && (
            <AccountingView
              user={activeUser}
              entries={accountingList}
              invoices={invoiceList}
              appraisers={appraiserList}
              onMarkInvoiceSent={(invoiceId) => setInvoiceList((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: "Sent" } : invoice))}
              onUpdateDefaultSplit={handleUpdateDefaultSplit}
              onOverrideCommission={handleOverrideCommission}
              onMarkPaid={handleMarkPayrollPaid}
              onExportCsv={handleExportPayrollCsv}
            />
          )}
          {activeView === "analytics" && <AnalyticsView entries={accountingList} orderList={orderList} />}
          {activeView === "documents" && <DocumentsView orderList={visibleOrders} />}
          {activeView === "messages" && <MessagesView orderList={visibleOrders} user={activeUser} onAddNote={handleAddNote} />}
          {activeView === "reports" && <ReportsView orderList={visibleOrders} />}
          {activeView === "revisions" && <RevisionsView orderList={visibleOrders} onSelectOrder={(order) => { setSelectedOrderId(order.id); setActiveView("my-orders"); }} />}
          {activeView === "notifications" && <NotificationsView />}
          {activeView === "settings" && (
            <SettingsView
              user={activeUser}
              companyUsers={companyUserList}
              onInviteUser={handleInviteCompanyUser}
              onChangeRole={handleChangeCompanyUserRole}
              onTogglePermission={handleToggleCompanyUserPermission}
              onDeactivateUser={handleDeactivateCompanyUser}
            />
          )}
        </main>
      </div>
      {commandOpen && (
        <CommandPalette
          query={globalQuery}
          setQuery={setGlobalQuery}
          onClose={() => setCommandOpen(false)}
          onNavigate={(view) => {
            setActiveView(view);
            setCommandOpen(false);
          }}
          onSelectOrder={(order) => {
            setSelectedOrderId(order.id);
            setActiveView("orders");
            setCommandOpen(false);
          }}
          orderList={visibleOrders}
          navItems={activeNavItems}
        />
      )}
    </div>
  );
}

function Sidebar({
  activeView,
  navItems,
  user,
  organization,
  onNavigate
}: {
  activeView: NavId;
  navItems: Array<{ id: NavId; label: string; icon: LucideIcon }>;
  user: PortalUser;
  organization: Organization;
  onNavigate: (view: NavId) => void;
}) {
  return (
    <aside className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
          <Home className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">CAS</div>
          <div className="truncate text-xs text-muted">{organization.name}</div>
        </div>
      </div>
      <div className="border-b border-line px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">{roleLabel(user.role)}</div>
        <div className="mt-1 truncate text-sm font-medium text-slate-900">{user.name}</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition lg:min-w-0",
                activeView === item.id
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="hidden border-t border-line p-4 lg:block">
        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
            <Workflow className="h-4 w-4" /> Portal scope
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[organization.type.replace("_", " "), ...workflowSteps.slice(0, 5)].map((step) => (
              <span key={step} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600 ring-1 ring-line">
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  user,
  organization,
  onCommand,
  query,
  setQuery,
  onUserChange
}: {
  title: string;
  user: PortalUser;
  organization: Organization;
  onCommand: () => void;
  query: string;
  setQuery: (value: string) => void;
  onUserChange: (userId: string) => void;
}) {
  return (
    <header className="sticky top-[65px] z-10 border-b border-line bg-white/90 backdrop-blur lg:top-0">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="icon-button lg:hidden" aria-label="Open navigation">
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1>
          <p className="hidden text-xs text-muted sm:block">{organization.name} - {roleLabel(user.role)} portal</p>
        </div>
        <button onClick={onCommand} className="hidden h-10 min-w-[320px] items-center gap-2 rounded-md border border-line bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:border-brand-200 hover:bg-white md:flex">
          <Search className="h-4 w-4" />
          <span className="flex-1">Search orders, clients, appraisers</span>
          <Command className="h-4 w-4 text-slate-400" />
        </button>
        <div className="relative block md:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="control w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        </div>
        {demoMode && (
          <label className="hidden items-center gap-2 lg:flex">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Demo role</span>
            <select className="control w-56" value={user.id} onChange={(event) => onUserChange(event.target.value)} aria-label="Switch demo role">
              {portalUsers.map((portalUser) => (
                <option key={portalUser.id} value={portalUser.id}>{portalUser.title} - {portalUser.name}</option>
              ))}
            </select>
          </label>
        )}
        <button className="icon-button" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="hidden h-9 items-center gap-2 rounded-md border border-line bg-white px-2 sm:flex">
          <div className="h-6 w-6 rounded-full bg-brand-600" />
          <span className="text-sm font-medium text-slate-700">{user.name.split(" ")[0]}</span>
        </div>
      </div>
    </header>
  );
}

function DashboardView({
  orderList,
  user,
  organization,
  vendors,
  accountingEntries,
  onOpenOrders,
  onPlaceOrder,
  onInviteVendor
}: {
  orderList: Order[];
  user: PortalUser;
  organization: Organization;
  vendors: VendorProfile[];
  accountingEntries: AccountingEntry[];
  onOpenOrders: () => void;
  onPlaceOrder: () => void;
  onInviteVendor: () => void;
}) {
  const pastDue = orderList.filter((order) => daysUntil(order.dueDate) < 0 && order.status !== "Completed");
  const dueToday = orderList.filter((order) => daysUntil(order.dueDate) === 0);
  const revisionOrders = orderList.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser");
  const payoutTotal = accountingEntries
    .filter((entry) => !user.appraiserName || entry.appraiser === user.appraiserName)
    .reduce((total, entry) => total + entry.appraiserSplit, 0);

  if (user.role === "amc_admin" || user.role === "amc_staff") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={BriefcaseBusiness}
            title="AMC Operations"
            eyebrow={organization.name}
            body="Place orders, track due dates, manage vendor compliance, and keep completed reports visible without internal firm accounting."
            actions={[
              { label: "Place order", icon: Plus, onClick: onPlaceOrder, primary: true },
              { label: "Invite vendor", icon: UserCheck, onClick: onInviteVendor }
            ]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Open orders" value={String(orderList.filter((order) => order.status !== "Completed").length)} />
            <MetricTile label="Due today" value={String(dueToday.length)} />
            <MetricTile label="Revision requests" value={String(revisionOrders.length)} />
            <MetricTile label="Approved vendors" value={String(vendors.filter((vendor) => vendor.status === "Approved").length)} />
          </section>
          <OperationalList title="Orders by Status" icon={ListChecks} items={["New", "Assigned", "In Review", "Revisions Needed", "Completed"].map((status) => `${status}: ${orderList.filter((order) => order.status === status).length}`)} />
        </div>
        <VendorSearchCard vendors={vendors} onInviteVendor={onInviteVendor} />
      </section>
    );
  }

  if (user.role === "client_user") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={Building2}
            title="Client Order Portal"
            eyebrow={organization.name}
            body="Submit appraisal orders, upload documents, track status, send messages, and download delivered reports with limited client visibility."
            actions={[{ label: "Place order", icon: Plus, onClick: onPlaceOrder, primary: true }, { label: "Track orders", icon: ListChecks, onClick: onOpenOrders }]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(orderList.length)} />
            <MetricTile label="In progress" value={String(orderList.filter((order) => !["Delivered", "Completed"].includes(order.status)).length)} />
            <MetricTile label="Due soon" value={String(orderList.filter((order) => daysUntil(order.dueDate) <= 7).length)} />
            <MetricTile label="Ready reports" value={String(orderList.filter((order) => ["Delivered", "Completed"].includes(order.status)).length)} />
          </section>
          <ClientTimeline orderList={orderList} />
        </div>
        <OperationalList title="Client Actions" icon={MessageSquare} items={["Upload engagement documents", "Send revision request", "Message operations", "Download completed reports"]} />
      </section>
    );
  }

  if (user.role === "appraiser" || user.role === "solo_appraiser") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={UserCog}
            title={user.role === "solo_appraiser" ? "Solo Appraiser Workspace" : "Appraiser Workspace"}
            eyebrow={organization.name}
            body="See assigned orders, due dates, revisions, inspection work, document upload tasks, and personal pay without firm-wide accounting."
            actions={[{ label: "My orders", icon: ListChecks, onClick: onOpenOrders, primary: true }, { label: "Place order", icon: Plus, onClick: onPlaceOrder }]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Assigned" value={String(orderList.length)} />
            <MetricTile label="Due today" value={String(dueToday.length)} />
            <MetricTile label="Due week" value={String(orderList.filter((order) => daysUntil(order.dueDate) <= 7).length)} />
            <MetricTile label="Pay summary" value={formatCurrency(payoutTotal)} />
          </section>
          <AppraiserPortalView orderList={orderList} />
        </div>
        <OperationalList title="Profile and Docs" icon={FileUp} items={["License current", "E&O current", "W-9 on file", "Upload report/document placeholder"]} />
      </section>
    );
  }

  if (user.role === "reviewer") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={ClipboardCheck}
            title="Reviewer Queue"
            eyebrow={organization.name}
            body="Review submitted reports, complete checklists, return comments, approve reports, and mark orders ready for delivery."
            actions={[{ label: "Open queue", icon: ClipboardCheck, onClick: onOpenOrders, primary: true }]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(orderList.filter((order) => order.status === "Submitted").length)} />
            <MetricTile label="In review" value={String(orderList.filter((order) => order.status === "In Review").length)} />
            <MetricTile label="Revisions" value={String(revisionOrders.length)} />
            <MetricTile label="Ready" value={String(orderList.filter((order) => order.status === "Ready for Delivery").length)} />
          </section>
          <ReviewQueueSummary orderList={orderList} />
        </div>
        <OperationalList title="Review Templates" icon={FileText} items={reviewTemplates} />
      </section>
    );
  }

  return (
    <>
      <PortalHero
        icon={LayoutDashboard}
        title="Firm Operations"
        eyebrow={`${organization.name} - ${roleLabel(user.role)}`}
        body="Manage orders, assignment, review, appraisers, clients, accounting, analytics, and administrative workflows from the firm portal."
        actions={[
          { label: "Open orders", icon: ListChecks, onClick: onOpenOrders, primary: true },
          { label: "Create order", icon: Plus, onClick: onPlaceOrder }
        ]}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(canViewAccounting(user) ? dashboardKpis : dashboardKpis.filter((kpi) => !kpi.label.toLowerCase().includes("revenue"))).map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="panel p-5">
          <SectionHeader icon={Activity} title="Order Volume" action="Open orders" onAction={onOpenOrders} />
          <LineChart data={volumeChart} suffix=" orders" />
        </div>
        <div className="panel p-5">
          <SectionHeader icon={CircleDollarSign} title="Revenue" action="Accounting" />
          <LineChart data={revenueChart} prefix="$" suffix="k" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          <SectionHeader icon={Clock3} title="Next Actions" className="p-5 pb-2" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">File</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Due</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orderList.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{order.fileNumber}</td>
                    <td className="px-5 py-4"><StatusChip status={order.status} /></td>
                    <td className="px-5 py-4"><DueChip date={order.dueDate} /></td>
                    <td className="px-5 py-4 text-slate-600">{order.appraiser}</td>
                    <td className="px-5 py-4 text-slate-700">{order.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={Gauge} title="Appraiser Workload" />
          <div className="mt-4 space-y-4">
            {appraisers.map((appraiser) => (
              <div key={appraiser.id}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-800">{appraiser.name}</span>
                  <span className="text-slate-500">{appraiser.activeOrders}/{appraiser.capacity}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, (appraiser.activeOrders / appraiser.capacity) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {pastDue.length} orders need same-day escalation.
          </div>
        </div>
      </section>
    </>
  );
}

function PortalHero({ icon: Icon, title, eyebrow, body, actions }: { icon: LucideIcon; title: string; eyebrow: string; body: string; actions: Array<{ label: string; icon: LucideIcon; onClick: () => void; primary?: boolean }> }) {
  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700"><Icon className="h-4 w-4" />{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <button key={action.label} className={action.primary ? "primary-button" : "secondary-button"} onClick={action.onClick}>
                <ActionIcon className="h-4 w-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function orderMatchesView(order: Order, view: SavedView) {
  const days = daysUntil(order.dueDate);
  const active = !["Completed", "Cancelled"].includes(order.status);

  if (view === "All") return true;
  if (view === "New") return order.status === "New";
  if (view === "Unassigned") return order.status === "Unassigned";
  if (view === "Assigned") return ["Assigned", "Accepted", "Inspection Scheduled", "Inspected", "Report In Progress"].includes(order.status);
  if (view === "Due Today") return active && days === 0;
  if (view === "Due This Week") return active && days >= 0 && days <= 7;
  if (view === "Past Due") return active && days < 0;
  if (view === "In Review") return ["Submitted", "In Review", "Ready for Delivery"].includes(order.status);
  if (view === "Revisions") return ["Revisions Needed", "Revision Sent to Appraiser"].includes(order.status);
  return order.status === "Completed";
}

function priorityRank(priority: Order["priority"]) {
  const ranks: Record<Order["priority"], number> = {
    Rush: 0,
    High: 1,
    Watch: 2,
    Standard: 3
  };
  return ranks[priority];
}

function workloadPercent(appraiser: AppraiserProfile) {
  return Math.round((appraiser.activeOrders / appraiser.capacity) * 100);
}

function recommendedAppraiser(order: Order) {
  const covered = appraisers.filter((appraiser) => appraiser.counties.includes(order.county));
  const candidates = covered.length ? covered : appraisers;
  return [...candidates].sort((a, b) => workloadPercent(a) - workloadPercent(b))[0];
}

function OrdersView({
  orderList,
  selectedOrder,
  user,
  onSelectOrder,
  onAssignOrder,
  onStatusChange,
  onAddNote
}: {
  orderList: Order[];
  selectedOrder: Order;
  user: PortalUser;
  onSelectOrder: (order: Order) => void;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onAddNote: (orderId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [sortBy, setSortBy] = useState("Due date");
  const [view, setView] = useState<SavedView>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredOrders = useMemo(() => {
    const needle = search.toLowerCase();
    return orderList
      .filter((order) => orderMatchesView(order, view))
      .filter((order) => statusFilter === "All" || order.status === statusFilter)
      .filter((order) =>
        [order.fileNumber, order.client, order.borrower, order.address, order.appraiser, order.reviewer, order.county, order.productType]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
      .sort((a, b) => {
        if (sortBy === "Fee") return b.fee - a.fee;
        if (sortBy === "Priority") return priorityRank(a.priority) - priorityRank(b.priority);
        if (sortBy === "Last update") return a.lastUpdate.localeCompare(b.lastUpdate);
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [orderList, search, sortBy, statusFilter, view]);

  function applySavedView(nextView: SavedView) {
    setView(nextView);
    setStatusFilter("All");
  }

  const showAccounting = canViewAccounting(user);
  const showAssignment = canAssignOrders(user);
  const allowStatusUpdates = canAssignOrders(user) || user.role === "appraiser" || user.role === "solo_appraiser";

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_520px]">
      <section className="panel overflow-hidden">
        <div className="border-b border-line p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <ListChecks className="h-4 w-4 text-brand-600" />
                  Order Worklist
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredOrders.length} visible orders across {orderList.length} active demo records.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {showAssignment && <button className="secondary-button"><SlidersHorizontal className="h-4 w-4" /> Bulk update</button>}
                <button className="secondary-button"><Download className="h-4 w-4" /> Export</button>
                {canCreateOrders(user) && <button className="primary-button"><Plus className="h-4 w-4" /> New order</button>}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-5">
              <MetricTile label="Past due" value={String(orderList.filter((order) => orderMatchesView(order, "Past Due")).length)} />
              <MetricTile label="Due today" value={String(orderList.filter((order) => orderMatchesView(order, "Due Today")).length)} />
              <MetricTile label="Unassigned" value={String(orderList.filter((order) => order.status === "Unassigned" || order.status === "New").length)} />
              <MetricTile label="In review" value={String(orderList.filter((order) => orderMatchesView(order, "In Review")).length)} />
              <MetricTile label="Revisions" value={String(orderList.filter((order) => orderMatchesView(order, "Revisions")).length)} />
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {savedViews.map((savedView) => (
                <button
                  key={savedView}
                  onClick={() => applySavedView(savedView)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition",
                    view === savedView ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {savedView}
                </button>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_190px_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="control w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search file, borrower, client, address, appraiser" />
              </div>
              <select className="control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | OrderStatus)}>
                {statusFilters.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="control" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option>Due date</option>
                <option>Fee</option>
                <option>Priority</option>
                <option>Last update</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1540px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                <th className="px-4 py-3 font-semibold">File</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Borrower / Address</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                {showAssignment && <th className="px-4 py-3 font-semibold">Appraiser</th>}
                <th className="px-4 py-3 font-semibold">Reviewer</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                {showAccounting && <th className="px-4 py-3 font-semibold">Fee</th>}
                <th className="px-4 py-3 font-semibold">Last update</th>
                <th className="px-4 py-3 font-semibold">Next action</th>
                <th className="px-4 py-3 font-semibold">Quick actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => onSelectOrder(order)} className={cn("group hover:bg-slate-50", selectedOrder.id === order.id && "bg-brand-50/60")}>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line text-brand-600"
                      checked={selectedIds.includes(order.id)}
                      onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, order.id] : ids.filter((id) => id !== order.id))}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{order.fileNumber}</div>
                    <div className="mt-1 text-xs text-slate-500">{order.county} County - {order.documents} docs</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{order.client}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-800">{order.borrower}</div>
                    <div className="mt-1 max-w-[250px] truncate text-xs text-slate-500">{order.address}, {order.city}, {order.state}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{order.productType}</td>
                  {showAssignment && <td className="px-4 py-4">
                    <select
                      className="h-8 rounded-md border border-line bg-white px-2 text-xs text-slate-700"
                      value={order.appraiser}
                      onChange={(event) => onAssignOrder(order.id, event.target.value, "Assigned from inline order table.")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <option>{order.appraiser}</option>
                      {appraisers.map((appraiser) => <option key={appraiser.id}>{appraiser.name}</option>)}
                    </select>
                  </td>}
                  <td className="px-4 py-4 text-slate-700">{order.reviewer}</td>
                  <td className="px-4 py-4"><DueChip date={order.dueDate} /></td>
                  <td className="px-4 py-4"><StatusChip status={order.status} /></td>
                  <td className="px-4 py-4"><PriorityChip priority={order.priority} /></td>
                  {showAccounting && <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(order.fee)}</td>}
                  <td className="px-4 py-4 text-slate-600">{order.lastUpdate}</td>
                  <td className="px-4 py-4">
                    <div className="max-w-[220px] truncate text-slate-700">{order.nextAction}</div>
                  </td>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button className="icon-button" aria-label={`Open ${order.fileNumber}`} onClick={() => onSelectOrder(order)}><Eye className="h-4 w-4" /></button>
                      {showAssignment && <button className="icon-button" aria-label={`Assign ${order.fileNumber}`} onClick={() => onAssignOrder(order.id, recommendedAppraiser(order).name, "Assigned from quick action recommendation.")}><UserCheck className="h-4 w-4" /></button>}
                      {allowStatusUpdates && <select className="h-9 rounded-md border border-line bg-white px-2 text-xs text-slate-700" value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>
                        {orderStatusOptions.map((status) => <option key={status}>{status}</option>)}
                      </select>}
                      <button className="icon-button" aria-label={`Add note to ${order.fileNumber}`} onClick={() => onAddNote(order.id)}><MessageSquare className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-slate-500">
          <span>{filteredOrders.length} orders shown</span>
          <span>{selectedIds.length} selected</span>
        </div>
      </section>
      <OrderDetailPanel order={selectedOrder} user={user} onAssignOrder={onAssignOrder} onStatusChange={onStatusChange} onAddNote={onAddNote} />
    </div>
  );
}

function OrderDetailPanel({
  order,
  user,
  onAssignOrder,
  onStatusChange,
  onAddNote
}: {
  order: Order;
  user: PortalUser;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onAddNote: (orderId: string) => void;
}) {
  const reviewComplete = order.reviewItems.filter((item) => item.complete).length;
  const showAccounting = canViewAccounting(user);
  const showAssignment = canAssignOrders(user);
  return (
    <aside className="panel overflow-hidden 2xl:sticky 2xl:top-20 2xl:max-h-[calc(100vh-6rem)] 2xl:overflow-y-auto">
      <div className="border-b border-line bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-950">{order.fileNumber}</span>
              <StatusChip status={order.status} />
              <PriorityChip priority={order.priority} />
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{order.address}</h2>
            <p className="mt-1 text-sm text-slate-500">{order.borrower} - {order.client} - {order.productType}</p>
          </div>
          <button className="icon-button" aria-label="Close order detail"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <SummaryItem label="Due" value={formatDate(order.dueDate)} />
          <SummaryItem label="Fee" value={formatCurrency(order.fee)} />
          <SummaryItem label="Appraiser" value={order.appraiser} />
          <SummaryItem label="Reviewer" value={order.reviewer} />
        </div>
      </div>
      <div className="grid gap-5 p-5">
        <section>
          <h3 className="text-sm font-semibold text-slate-950">Quick Actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {showAssignment && <button className="secondary-button justify-center px-2" onClick={() => onAssignOrder(order.id, recommendedAppraiser(order).name, "Assigned from order detail recommendation.")}><UserCheck className="h-4 w-4" /> Assign</button>}
            <button className="secondary-button justify-center px-2" onClick={() => onAddNote(order.id)}><MessageSquare className="h-4 w-4" /> Add note</button>
            <select className="control" value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>
              {orderStatusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button className="secondary-button justify-center px-2"><UploadCloud className="h-4 w-4" /> Upload</button>
          </div>
        </section>

        {showAssignment && <AssignmentPanel order={order} onAssignOrder={onAssignOrder} />}

        <DetailSection icon={Home} title="Property, Borrower, Client">
          <div className="grid gap-2 text-sm">
            <InfoRow label="Subject" value={`${order.address}, ${order.city}, ${order.state} ${order.zip}`} />
            <InfoRow label="County / parcel" value={`${order.county} / ${order.parcelNumber}`} />
            <InfoRow label="Borrower" value={`${order.borrower} - ${order.contactPhone}`} />
            <InfoRow label="Access" value={order.accessInfo} />
            <InfoRow label="Client contact" value={`${order.client} - ${order.lenderContact}`} />
          </div>
        </DetailSection>

        <DetailSection icon={ClipboardCheck} title="Product and Assignment">
          <div className="grid gap-2 text-sm">
            <InfoRow label="Product" value={order.productType} />
            <InfoRow label="Loan / occupancy" value={`${order.loanType} - ${order.occupancy}`} />
            <InfoRow label="Property type" value={order.propertyType} />
            <InfoRow label="Preference" value={order.assignmentPreference} />
            <InfoRow label="Reviewer" value={order.reviewer} />
          </div>
        </DetailSection>

        {showAccounting && <DetailSection icon={ReceiptText} title="Fee and Accounting Snapshot">
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricTile label="Order fee" value={formatCurrency(order.fee)} />
            <MetricTile label="Tech fee" value={formatCurrency(order.techFee)} />
            <MetricTile label="Payout" value={formatCurrency(order.appraiserPayout)} />
          </div>
        </DetailSection>}

        <DetailSection icon={Clock3} title="Status Timeline">
          <div className="mt-3 space-y-3">
            {order.timeline.map((item) => (
              <div key={`${item.label}-${item.at}`} className="grid grid-cols-[16px_1fr] gap-3">
                <div className="mt-1 h-3 w-3 rounded-full border-2 border-brand-600 bg-white" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.detail}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{item.at} by {item.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={MessageSquare} title="Internal Notes">
          <div className="mt-3 space-y-2">
            {(order.notes.length ? order.notes : [{ id: "empty", author: "CAS", body: "No notes yet.", visibility: "internal", createdAt: "Now" }]).map((note) => (
              <div key={note.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-800">{note.author}</span><span className="text-xs text-slate-400">{note.visibility}</span></div>
                <p className="mt-1 text-slate-600">{note.body}</p>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={Send} title="Client-Facing Comments">
          <ListOrEmpty
            empty="No client-facing comments yet."
            items={order.clientComments.map((comment) => `${comment.createdAt} - ${comment.author}: ${comment.body}`)}
          />
        </DetailSection>

        <DetailSection icon={FilePlus2} title="Documents and Uploads">
          <div className="space-y-2">
            {order.documentsList.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{document.name}</div>
                  <div className="text-xs text-slate-500">{document.type} - {document.uploadedBy} - {document.uploadedAt}</div>
                </div>
                <DocumentStatusChip status={document.status} />
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={History} title="Assignment History">
          <ListOrEmpty
            empty="No assignment history yet."
            items={order.assignmentHistory.map((item) => `${item.at} - ${item.action} to ${item.appraiser} by ${item.actor}. ${item.note}`)}
          />
        </DetailSection>

        <DetailSection icon={FileCheck2} title="Review">
          <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-900">Checklist progress</span>
              <span className="text-slate-600">{reviewComplete}/{Math.max(order.reviewItems.length, 1)} complete</span>
            </div>
            <div className="mt-3 space-y-2">
              {(order.reviewItems.length ? order.reviewItems : [{ label: "Review checklist will populate when submitted", category: "Review", complete: false }]).map((item) => (
                <div key={`${item.category}-${item.label}`} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span>{item.category}: {item.label}</span>
                  <span className={cn("rounded-full px-2 py-0.5", item.complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{item.complete ? "Done" : "Open"}</span>
                </div>
              ))}
            </div>
          </div>
        </DetailSection>

        <DetailSection icon={AlertTriangle} title="Revision Log">
          <ListOrEmpty
            empty="No revisions requested."
            items={order.revisionLog.map((item) => `${item.requestedAt} - ${item.status}: ${item.summary}`)}
          />
        </DetailSection>

        <DetailSection icon={Archive} title="Audit Trail">
          <ListOrEmpty
            empty="No audit entries yet."
            items={order.auditTrail.map((item) => `${item.at} - ${item.actor}: ${item.action}`)}
          />
        </DetailSection>
      </div>
    </aside>
  );
}

function AssignmentPanel({ order, onAssignOrder }: { order: Order; onAssignOrder: (orderId: string, appraiserName: string, note: string) => void }) {
  const recommended = recommendedAppraiser(order);
  const [appraiserName, setAppraiserName] = useState(order.appraiser === "Unassigned" ? recommended.name : order.appraiser);
  const [assignmentNote, setAssignmentNote] = useState(`Coverage: ${order.county}. Preference: ${order.assignmentPreference}.`);
  const selectedAppraiser = appraisers.find((appraiser) => appraiser.name === appraiserName) ?? recommended;

  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-950">Assign / Reassign</h3>
      </div>
      <div className="mt-3 grid gap-3">
        <select className="control w-full" value={appraiserName} onChange={(event) => setAppraiserName(event.target.value)}>
          {appraisers.map((appraiser) => (
            <option key={appraiser.id}>{appraiser.name}</option>
          ))}
        </select>
        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-800">{selectedAppraiser.name}</span>
            <span className="text-slate-500">{selectedAppraiser.activeOrders}/{selectedAppraiser.capacity} active</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div className={cn("h-2 rounded-full", workloadPercent(selectedAppraiser) > 85 ? "bg-rose-500" : "bg-brand-600")} style={{ width: `${Math.min(100, workloadPercent(selectedAppraiser))}%` }} />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {selectedAppraiser.counties.join(", ")} - {selectedAppraiser.avgTurnDays}d avg turn - {selectedAppraiser.revisionRate}% revision rate
          </div>
        </div>
        <textarea className="control min-h-20 w-full py-3" value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} />
        <button className="primary-button justify-center" onClick={() => onAssignOrder(order.id, appraiserName, assignmentNote)}>
          <UserCheck className="h-4 w-4" />
          Assign and update status
        </button>
      </div>
    </section>
  );
}

function DetailSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-line px-3 py-2">
      <span className="shrink-0 font-medium text-slate-600">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}

function ListOrEmpty({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) {
    return <div className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-slate-500">{empty}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>
      ))}
    </div>
  );
}

function DocumentStatusChip({ status }: { status: Order["documentsList"][number]["status"] }) {
  const tone = {
    Ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Missing: "border-rose-200 bg-rose-50 text-rose-700",
    "Needs review": "border-amber-200 bg-amber-50 text-amber-800",
    Expired: "border-red-200 bg-red-50 text-red-700"
  }[status];

  return <span className={cn("chip shrink-0", tone)}>{status}</span>;
}

function NewOrderView({
  user,
  organization,
  template,
  onTemplateChange,
  onRestoreTemplate,
  onCreateOrder
}: {
  user: PortalUser;
  organization: Organization;
  template: OrderFormTemplate;
  onTemplateChange: (template: OrderFormTemplate) => void;
  onRestoreTemplate: () => void;
  onCreateOrder: (kind: "internal" | "client" | "amc", templateName?: string) => void;
}) {
  const orderKind = organization.type === "amc" ? "amc" : user.role === "client_user" ? "client" : "internal";
  const visibleSections = template.sections.filter((section) => !section.hidden);
  const canCustomize = canCustomizeOrderForms(user);

  function updateTemplate(sections: OrderFormTemplate["sections"]) {
    onTemplateChange({
      ...template,
      ownerType: organization.type === "solo_appraiser" ? "solo_appraiser" : "company",
      organizationId: organization.id,
      updatedAt: "Just now",
      sections
    });
  }

  function renameSection(sectionId: string, title: string) {
    updateTemplate(template.sections.map((section) => (section.id === sectionId ? { ...section, title } : section)));
  }

  function toggleSection(sectionId: string) {
    updateTemplate(template.sections.map((section) => (section.id === sectionId ? { ...section, hidden: !section.hidden } : section)));
  }

  function removeSection(sectionId: string) {
    updateTemplate(template.sections.filter((section) => section.id !== sectionId));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const index = template.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= template.sections.length) return;
    const sections = [...template.sections];
    const [section] = sections.splice(index, 1);
    sections.splice(nextIndex, 0, section);
    updateTemplate(sections);
  }

  function addSection() {
    updateTemplate([
      ...template.sections,
      {
        id: `section-${Date.now()}`,
        title: `Custom section ${template.sections.length + 1}`,
        hidden: false,
        fields: [
          { id: `field-${Date.now()}`, label: "Custom field", type: "text", required: false }
        ]
      }
    ]);
  }

  function addCustomField(sectionId: string) {
    updateTemplate(
      template.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [
                ...section.fields,
                { id: `field-${Date.now()}`, label: `Custom field ${section.fields.length + 1}`, type: "text", required: false }
              ]
            }
          : section
      )
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form className="panel p-5">
        <SectionHeader icon={Plus} title="New Order Intake" />
        <div className="mt-3 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Creating as {organization.name} ({roleLabel(user.role)}) with {template.name}.
        </div>
        <div className="mt-4 rounded-md border border-line bg-white p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-950">Active intake template</div>
              <div className="mt-1 text-xs text-slate-500">{visibleSections.length} visible sections - {template.ownerType.replace("_", " ")} setup - updated {template.updatedAt}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleSections.map((section) => (
                <span key={section.id} className="chip border-slate-200 bg-slate-50 text-slate-700">{section.title}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-5">
          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Building2 className="h-4 w-4 text-brand-600" /> Client and Product</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Client"><select className="control w-full">{clients.map((client) => <option key={client}>{client}</option>)}</select></Field>
              <Field label="Lender contact"><input className="control w-full" defaultValue="Direct Lender - Mallory Chen" /></Field>
              <Field label="Product type"><select className="control w-full">{productTypes.map((product) => <option key={product}>{product}</option>)}</select></Field>
              <Field label="Loan type">
                <select className="control w-full">
                  {["Conventional", "FHA", "VA", "USDA", "Jumbo", "HELOC", "Portfolio"].map((loanType) => <option key={loanType}>{loanType}</option>)}
                </select>
              </Field>
              <Field label="Due date"><input className="control w-full" type="date" defaultValue="2026-07-07" /></Field>
              <Field label="Priority">
                <select className="control w-full">
                  <option>Standard</option>
                  <option>Watch</option>
                  <option>High</option>
                  <option>Rush</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Home className="h-4 w-4 text-brand-600" /> Borrower and Property</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Borrower"><input className="control w-full" placeholder="Borrower name" /></Field>
              <Field label="Contact name"><input className="control w-full" placeholder="Listing agent, borrower, or tenant" /></Field>
              <Field label="Property address" span><input className="control w-full" placeholder="Street address" /></Field>
              <Field label="City"><input className="control w-full" placeholder="City" /></Field>
              <Field label="State / ZIP"><input className="control w-full" placeholder="GA 30064" /></Field>
              <Field label="County"><input className="control w-full" placeholder="County" /></Field>
              <Field label="Phone"><input className="control w-full" placeholder="(555) 010-0123" /></Field>
              <Field label="Contact / access info" span><textarea className="control min-h-24 w-full py-3" placeholder="Gate codes, lockbox, inspection windows, occupant instructions" /></Field>
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><ReceiptText className="h-4 w-4 text-brand-600" /> Fees and Assignment</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Fee"><input className="control w-full" defaultValue="650" inputMode="numeric" /></Field>
              <Field label="Tech fee"><input className="control w-full" defaultValue="35" inputMode="numeric" /></Field>
              <Field label="Assignment preference">
                <select className="control w-full">
                  <option>Best workload fit</option>
                  <option>Preferred appraiser</option>
                  <option>County specialist</option>
                  <option>Manual assignment</option>
                </select>
              </Field>
              <Field label="Preferred appraiser">
                <select className="control w-full">
                  <option>CAS recommendation</option>
                  {appraisers.map((appraiser) => <option key={appraiser.id}>{appraiser.name}</option>)}
                </select>
              </Field>
              <Field label="Internal notes" span><textarea className="control min-h-24 w-full py-3" placeholder="Client rules, fee exception, underwriting sensitivity, risk flags" /></Field>
            </div>
          </section>

          <section className="rounded-md border border-dashed border-brand-200 bg-brand-50/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UploadCloud className="h-4 w-4 text-brand-600" /> Document Upload Placeholder</div>
                <p className="mt-1 text-sm text-slate-500">Engagement letter, purchase contract, exhibits, lender instructions, prior appraisal, and supporting files.</p>
              </div>
              <button type="button" className="secondary-button"><UploadCloud className="h-4 w-4" /> Add documents</button>
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><SlidersHorizontal className="h-4 w-4 text-brand-600" /> Template Fields Used for Future Orders</div>
            <div className="mt-4 grid gap-4">
              {visibleSections.map((section) => (
                <div key={section.id} className="rounded-md border border-line bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <Field key={field.id} label={`${field.label}${field.required ? " *" : ""}`} span={field.type === "textarea" || field.type === "upload"}>
                        <TemplateFieldPreview field={field} />
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button type="button" className="primary-button" onClick={() => onCreateOrder(orderKind, template.name)}><CheckCircle2 className="h-4 w-4" /> Create order</button>
          <button type="button" className="secondary-button"><Sparkles className="h-4 w-4" /> Parse order PDF</button>
          <button type="button" className="secondary-button" onClick={() => onCreateOrder("internal", template.name)}><UserCheck className="h-4 w-4" /> Save and assign</button>
        </div>
      </form>
      <aside className="grid content-start gap-5">
        <div className="panel p-5">
          <SectionHeader icon={SlidersHorizontal} title="Customize Intake" />
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
            <div className="font-semibold text-slate-900">{canCustomize ? "Template editing enabled" : "View-only template"}</div>
            <div className="mt-1 text-slate-500">{canCustomize ? "Changes are saved in this session and used for the next new order." : "Company admins and solo appraisers can customize intake sections."}</div>
          </div>
          <div className="mt-4 space-y-3">
            {template.sections.map((section, index) => (
              <div key={section.id} className="rounded-md border border-line p-3">
                <input
                  className="control h-9 w-full"
                  value={section.title}
                  disabled={!canCustomize}
                  onChange={(event) => renameSection(section.id, event.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" disabled={!canCustomize || index === 0} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => moveSection(section.id, -1)}>Up</button>
                  <button type="button" disabled={!canCustomize || index === template.sections.length - 1} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => moveSection(section.id, 1)}>Down</button>
                  <button type="button" disabled={!canCustomize} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => toggleSection(section.id)}>{section.hidden ? "Show" : "Hide"}</button>
                  <button type="button" disabled={!canCustomize} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => addCustomField(section.id)}>Add field</button>
                  <button type="button" disabled={!canCustomize || template.sections.length <= 1} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => removeSection(section.id)}>Delete</button>
                </div>
                <div className="mt-2 text-xs text-slate-500">{section.fields.length} fields - {section.hidden ? "hidden" : "visible"}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!canCustomize} className="secondary-button disabled:opacity-50" onClick={addSection}><Plus className="h-4 w-4" /> Add section</button>
            <button type="button" disabled={!canCustomize} className="secondary-button disabled:opacity-50" onClick={onRestoreTemplate}><Sparkles className="h-4 w-4" /> Restore default</button>
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={Sparkles} title="Intake Intelligence" />
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Auto-fill", "Borrower, address, client, product, and fee fields"],
              ["Complexity", "Flag rural, luxury, acreage, FHA, VA, and repair risk"],
              ["Assignment", "Recommend appraiser by coverage, workload, and revision rate"],
              ["Documents", "Detect missing engagement letter, contract, W-9, or E&O"]
            ].map(([label, body]) => (
              <div key={label} className="rounded-md border border-line p-3">
                <div className="font-semibold text-slate-900">{label}</div>
                <div className="mt-1 text-slate-500">{body}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={UserCheck} title="Assignment Preview" />
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-900">Recommended</span>
              <span className="text-slate-500">{appraisers[0].activeOrders}/{appraisers[0].capacity} active</span>
            </div>
            <div className="mt-1 text-slate-600">{appraisers[0].name}</div>
            <div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${workloadPercent(appraisers[0])}%` }} /></div>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <InfoRow label="Starting status" value="New" />
            <InfoRow label="After assignment" value="Assigned" />
            <InfoRow label="Default reviewer" value={reviewers[0].name} />
          </div>
        </div>
      </aside>
    </section>
  );
}

function ReviewView({ orderList, user, onReviewAction, onSelectOrder }: { orderList: Order[]; user: PortalUser; onReviewAction: (orderId: string, action: "return" | "approve" | "deliver") => void; onSelectOrder: (order: Order) => void }) {
  const reviewOrders = orderList.filter((order) => ["Submitted", "In Review", "Revisions Needed", "Ready for Delivery"].includes(order.status));
  const openFindings = reviewOrders.flatMap((order) => order.reviewItems.filter((item) => !item.complete).map((item) => ({ order, item }))).slice(0, 6);
  const canReview = canReviewReports(user);
  const canDeliver = canDeliverReports(user);

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel overflow-hidden">
        <TableHeader title="Review Queue" icon={ClipboardCheck} />
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-4">
          <MetricTile label="Ready for review" value={String(reviewOrders.length)} />
          <MetricTile label="Needs revisions" value={String(orderList.filter((order) => order.status === "Revisions Needed").length)} />
          <MetricTile label="Open checklist items" value={String(openFindings.length)} />
          <MetricTile label="Reviewers" value={String(reviewers.length)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-y border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">File</th><th className="px-5 py-3">Borrower</th><th className="px-5 py-3">Appraiser</th><th className="px-5 py-3">Reviewer</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Checklist</th><th className="px-5 py-3">Priority</th><th className="px-5 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-line">
              {reviewOrders.map((order) => {
                const complete = order.reviewItems.filter((item) => item.complete).length;
                return (
                <tr key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onSelectOrder(order)}>
                  <td className="px-5 py-4 font-semibold text-slate-950">{order.fileNumber}</td>
                  <td className="px-5 py-4 text-slate-700">{order.borrower}</td>
                  <td className="px-5 py-4 text-slate-700">{order.appraiser}</td>
                  <td className="px-5 py-4 text-slate-700">{order.reviewer}</td>
                  <td className="px-5 py-4"><DueChip date={order.dueDate} /></td>
                  <td className="px-5 py-4"><StatusChip status={order.status} /></td>
                  <td className="px-5 py-4 text-slate-700">{complete}/{Math.max(order.reviewItems.length, 1)}</td>
                  <td className="px-5 py-4"><PriorityChip priority={order.priority} /></td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-1.5">
                      {canReview && <button className="secondary-button h-8 px-2 text-xs" onClick={() => onReviewAction(order.id, "return")}>Return</button>}
                      {canReview && <button className="secondary-button h-8 px-2 text-xs" onClick={() => onReviewAction(order.id, "approve")}>Approve</button>}
                      {canDeliver && <button className="primary-button h-8 px-2 text-xs" onClick={() => onReviewAction(order.id, "deliver")}>Deliver</button>}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={FileCheck2} title="Review Focus" />
        <div className="mt-4 space-y-2">
          {openFindings.length ? openFindings.map(({ order, item }) => (
            <button key={`${order.id}-${item.category}-${item.label}`} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => onSelectOrder(order)}>
              <div className="font-medium text-slate-900">{order.fileNumber}</div>
              <div className="mt-1 text-xs text-slate-500">{item.category}: {item.label}</div>
            </button>
          )) : <div className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-slate-500">No open review findings.</div>}
        </div>
        <div className="mt-5 border-t border-line pt-5">
          <SectionHeader icon={FileCheck2} title="Checklist Templates" />
        <div className="mt-4 grid gap-2 text-sm">
          {["General appraisal", "UAD", "FHA", "VA", "Conventional", "Required exhibits", "Client-specific rules"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-md border border-line px-3 py-2"><span>{item}</span><ChevronDown className="h-4 w-4 text-slate-400" /></div>
          ))}
        </div>
        </div>
      </aside>
    </section>
  );
}

function AppraiserPortalView({ orderList }: { orderList: Order[] }) {
  const assignedOrders = orderList.filter((order) => !["New", "Unassigned", "Completed", "Cancelled"].includes(order.status));
  const dueToday = assignedOrders.filter((order) => daysUntil(order.dueDate) === 0);
  const revisions = assignedOrders.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser");
  const payoutPending = assignedOrders.reduce((total, order) => total + order.appraiserPayout, 0);

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="panel overflow-hidden">
        <TableHeader title="Appraiser Workbench" icon={Users2} />
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-4">
          {[
            ["Assigned", String(assignedOrders.length)],
            ["Due today", String(dueToday.length)],
            ["Revisions", String(revisions.length)],
            ["Payout pending", formatCurrency(payoutPending)]
          ].map(([label, value]) => <MetricTile key={label} label={label} value={value} />)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">Appraiser</th><th className="px-5 py-3">Coverage</th><th className="px-5 py-3">Workload</th><th className="px-5 py-3">Turn time</th><th className="px-5 py-3">Revision rate</th><th className="px-5 py-3">License</th></tr></thead>
            <tbody className="divide-y divide-line">
              {appraisers.map((appraiser) => (
                <tr key={appraiser.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-950">{appraiser.name}</td>
                  <td className="px-5 py-4 text-slate-600">{appraiser.counties.join(", ")}</td>
                  <td className="px-5 py-4 text-slate-700">{appraiser.activeOrders}/{appraiser.capacity}</td>
                  <td className="px-5 py-4 text-slate-700">{appraiser.avgTurnDays}d</td>
                  <td className="px-5 py-4 text-slate-700">{appraiser.revisionRate}%</td>
                  <td className="px-5 py-4"><span className={cn("chip", appraiser.licenseStatus === "Current" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{appraiser.licenseStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={CalendarDays} title="Inspection Calendar" />
        <div className="mt-4 space-y-3">
          {orderList.filter((order) => order.inspectionDate).map((order) => (
            <div key={order.id} className="rounded-md border border-line p-3 text-sm">
              <div className="font-semibold text-slate-900">{formatDate(order.inspectionDate ?? order.dueDate)} - {order.fileNumber}</div>
              <div className="mt-1 text-slate-500">{order.address}, {order.city}</div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function OperationalList({ title, icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  const Icon = icon;
  return (
    <section className="panel p-5">
      <SectionHeader icon={Icon} title={title} />
      <div className="mt-4 grid gap-2">
        {items.map((item) => <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>)}
      </div>
    </section>
  );
}

function VendorSearchCard({ vendors, onInviteVendor }: { vendors: VendorProfile[]; onInviteVendor: () => void }) {
  const approved = vendors.filter((vendor) => vendor.status === "Approved");
  return (
    <aside className="panel p-5">
      <SectionHeader icon={ShieldCheck} title="Vendor Search" />
      <div className="mt-4 grid gap-3">
        <input className="control" defaultValue="1840 Magnolia Trace, Marietta GA" />
        <select className="control"><option>Cobb County</option><option>Fulton County</option><option>Cherokee County</option></select>
        <select className="control"><option>1004 URAR</option><option>FHA 1004</option><option>VA 1004</option><option>Review</option></select>
        <button className="primary-button justify-center"><Search className="h-4 w-4" /> Find approved vendors</button>
        <button className="secondary-button justify-center" onClick={onInviteVendor}><UserCheck className="h-4 w-4" /> Invite vendor</button>
      </div>
      <div className="mt-4 space-y-2">
        {approved.slice(0, 3).map((vendor) => (
          <div key={vendor.id} className="rounded-md border border-line px-3 py-2 text-sm">
            <div className="font-medium text-slate-900">{vendor.company}</div>
            <div className="mt-1 text-xs text-slate-500">{vendor.distance} mi - {vendor.turnTime}d turn - {vendor.capacity} capacity</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ClientTimeline({ orderList }: { orderList: Order[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Clock3} title="Status Timeline" />
      <div className="mt-4 grid gap-3">
        {orderList.slice(0, 4).map((order) => (
          <div key={order.id} className="rounded-md border border-line px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{order.fileNumber}</span><StatusChip status={order.status} /></div>
            <div className="mt-1 text-slate-500">{order.borrower} - due {formatDate(order.dueDate)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewQueueSummary({ orderList }: { orderList: Order[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={ClipboardCheck} title="Review Queue" />
      <div className="mt-4 grid gap-3">
        {reviewQueue.map((item) => {
          const order = orderList.find((candidate) => candidate.id === item.orderId);
          return (
            <div key={item.id} className="rounded-md border border-line px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{order?.fileNumber ?? item.orderId}</span>
                <span className="chip border-slate-200 bg-slate-50 text-slate-700">{item.status}</span>
              </div>
              <div className="mt-1 text-slate-500">{item.reviewer} - {item.checklistOpen} open checklist items</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VendorInvitesView({ vendors, onInviteVendor }: { vendors: VendorProfile[]; onInviteVendor: () => void }) {
  const invited = vendors.filter((vendor) => ["Invited", "Pending documents", "Under review"].includes(vendor.status));
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <SectionHeader icon={UserCheck} title="Vendor Invites" />
        <div className="mt-4 grid gap-3">
          {invited.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={Send} title="Invite Vendor" />
        <div className="mt-4 grid gap-3">
          <input className="control" defaultValue="New appraisal company" />
          <input className="control" defaultValue="vendor@example.com" />
          <button className="primary-button justify-center" onClick={onInviteVendor}><Send className="h-4 w-4" /> Send invite</button>
        </div>
      </aside>
    </section>
  );
}

function ComplianceView({ vendors, vendorDocuments, onDocumentStatusChange }: { vendors: VendorProfile[]; vendorDocuments: VendorDocument[]; onDocumentStatusChange: (vendorId: string, documentType: VendorDocument["type"], status: VendorDocument["status"]) => void }) {
  return (
    <section className="panel overflow-hidden">
      <TableHeader title="Vendor Compliance" icon={ShieldCheck} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">Vendor</th><th className="px-5 py-3">Document</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Uploaded</th><th className="px-5 py-3">Update</th></tr></thead>
          <tbody className="divide-y divide-line">
            {vendorDocuments.map((document) => {
              const vendor = vendors.find((candidate) => candidate.id === document.vendorId);
              return (
                <tr key={document.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">{vendor?.company ?? document.vendorId}</td>
                  <td className="px-5 py-4 text-slate-700">{document.type}</td>
                  <td className="px-5 py-4"><span className="chip border-slate-200 bg-slate-50 text-slate-700">{document.status}</span></td>
                  <td className="px-5 py-4 text-slate-600">{document.uploadedAt}</td>
                  <td className="px-5 py-4">
                    <select className="control h-9" value={document.status} onChange={(event) => onDocumentStatusChange(document.vendorId, document.type, event.target.value as VendorDocument["status"])}>
                      <option>Approved</option>
                      <option>Missing</option>
                      <option>Expired</option>
                      <option>Needs review</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompletedReviewsView({ orderList }: { orderList: Order[] }) {
  return <OperationalList icon={FileCheck2} title="Completed Reviews" items={orderList.filter((order) => ["Ready for Delivery", "Delivered", "Completed"].includes(order.status)).map((order) => `${order.fileNumber} - ${order.borrower} - ${order.status}`)} />;
}

function ReviewTemplatesView() {
  return <OperationalList icon={FileText} title="Revision and Comment Templates" items={reviewTemplates} />;
}

function VendorView({ vendors, vendorDocuments, user, onInviteVendor }: { vendors: VendorProfile[]; vendorDocuments: VendorDocument[]; user: PortalUser; onInviteVendor: () => void }) {
  const [county, setCounty] = useState("Cobb");
  const [product, setProduct] = useState("All products");
  const filteredVendors = vendors.filter((vendor) =>
    vendor.coverage.includes(county) &&
    (product === "All products" || vendor.specialties.some((specialty) => product.includes(specialty) || specialty.includes(product.replace(" 1004", ""))))
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="panel p-5">
        <SectionHeader icon={MapPin} title="Vendor Search" />
        <div className="mt-4 grid gap-3">
          <input className="control" defaultValue="Marietta, GA 30064" />
          <select className="control"><option>Within 25 miles</option><option>Within 50 miles</option><option>County coverage</option></select>
          <select className="control" value={county} onChange={(event) => setCounty(event.target.value)}><option>Cobb</option><option>Fulton</option><option>Cherokee</option><option>DeKalb</option><option>Gwinnett</option></select>
          <select className="control" value={product} onChange={(event) => setProduct(event.target.value)}><option>All products</option><option>FHA</option><option>VA</option><option>Luxury</option><option>Rural</option><option>Review</option></select>
          <button className="primary-button justify-center"><Search className="h-4 w-4" /> Search vendors</button>
          {canInviteVendors(user) && <button className="secondary-button justify-center" onClick={onInviteVendor}><UserCheck className="h-4 w-4" /> Invite vendor</button>}
        </div>
        <div className="mt-5 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">
          Vendors must be invited by an AMC or firm admin before they can submit compliance documents.
        </div>
      </aside>
      <div className="grid gap-4">
        {filteredVendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} vendorDocuments={vendorDocuments.filter((document) => document.vendorId === vendor.id)} />)}
      </div>
    </section>
  );
}

function AccountingView({
  user,
  entries,
  invoices,
  appraisers,
  onMarkInvoiceSent,
  onUpdateDefaultSplit,
  onOverrideCommission,
  onMarkPaid,
  onExportCsv
}: {
  user: PortalUser;
  entries: AccountingEntry[];
  invoices: Invoice[];
  appraisers: AppraiserProfile[];
  onMarkInvoiceSent: (invoiceId: string) => void;
  onUpdateDefaultSplit: (appraiserName: string, split: number) => void;
  onOverrideCommission: (orderId: string, split: number) => void;
  onMarkPaid: (entryIds: string[]) => void;
  onExportCsv: (entries: AccountingEntry[]) => void;
}) {
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-07-31");
  const [paidFilter, setPaidFilter] = useState<"All" | "Paid" | "Unpaid">("All");
  const [appraiserFilter, setAppraiserFilter] = useState("All appraisers");
  const [clientFilter, setClientFilter] = useState("All clients");
  const [productFilter, setProductFilter] = useState("All products");
  const [countyFilter, setCountyFilter] = useState("All counties");
  const [statusFilter, setStatusFilter] = useState<"All" | AccountingEntry["status"]>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const scopedEntries = user.appraiserName ? entries.filter((entry) => entry.appraiser === user.appraiserName) : entries;
  const appraiserOptions = Array.from(new Set(scopedEntries.map((entry) => entry.appraiser)));
  const clientOptions = Array.from(new Set(scopedEntries.map((entry) => entry.client)));
  const productOptions = Array.from(new Set(scopedEntries.map((entry) => entry.productType)));
  const countyOptions = Array.from(new Set(scopedEntries.map((entry) => entry.county)));

  const filteredEntries = scopedEntries.filter((entry) => {
    const completed = new Date(`${entry.completedAt}T12:00:00`);
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T23:59:59`);
    const paidState = entry.status === "Paid" ? "Paid" : "Unpaid";
    return (
      completed >= from &&
      completed <= to &&
      (paidFilter === "All" || paidFilter === paidState) &&
      (appraiserFilter === "All appraisers" || entry.appraiser === appraiserFilter) &&
      (clientFilter === "All clients" || entry.client === clientFilter) &&
      (productFilter === "All products" || entry.productType === productFilter) &&
      (countyFilter === "All counties" || entry.county === countyFilter) &&
      (statusFilter === "All" || entry.status === statusFilter)
    );
  });

  const selectedEntries = filteredEntries.filter((entry) => selectedIds.includes(entry.id));
  const grossFees = filteredEntries.reduce((total, entry) => total + entry.fee, 0);
  const techFees = filteredEntries.reduce((total, entry) => total + entry.techFee, 0);
  const payoutDue = filteredEntries.filter((entry) => entry.status !== "Paid").reduce((total, entry) => total + entry.appraiserSplit, 0);
  const paidTotal = filteredEntries.filter((entry) => entry.status === "Paid").reduce((total, entry) => total + entry.appraiserSplit, 0);
  const companyRevenue = filteredEntries.reduce((total, entry) => total + entry.companyRevenue, 0);
  const canManage = canManageAccounting(user);

  return (
    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <div className="panel p-5">
          <SectionHeader icon={CircleDollarSign} title={user.appraiserName ? "My Pay" : "Accounting and Payroll"} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricTile label="Gross fees" value={formatCurrency(grossFees)} />
            <MetricTile label="Tech fees" value={formatCurrency(techFees)} />
            {!user.appraiserName && <MetricTile label="Company revenue" value={formatCurrency(companyRevenue)} />}
            <MetricTile label="Unpaid payout" value={formatCurrency(payoutDue)} />
            <MetricTile label="Paid history" value={formatCurrency(paidTotal)} />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-4 xl:grid-cols-7">
            <Field label="Completed from"><input className="control w-full" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
            <Field label="Completed to"><input className="control w-full" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
            <Field label="Paid status">
              <select className="control w-full" value={paidFilter} onChange={(event) => setPaidFilter(event.target.value as "All" | "Paid" | "Unpaid")}>
                <option>All</option>
                <option>Paid</option>
                <option>Unpaid</option>
              </select>
            </Field>
            <Field label="Appraiser">
              <select className="control w-full" value={appraiserFilter} onChange={(event) => setAppraiserFilter(event.target.value)}>
                <option>All appraisers</option>
                {appraiserOptions.map((appraiser) => <option key={appraiser}>{appraiser}</option>)}
              </select>
            </Field>
            <Field label="Client">
              <select className="control w-full" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                <option>All clients</option>
                {clientOptions.map((client) => <option key={client}>{client}</option>)}
              </select>
            </Field>
            <Field label="Product">
              <select className="control w-full" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option>All products</option>
                {productOptions.map((product) => <option key={product}>{product}</option>)}
              </select>
            </Field>
            <Field label="County">
              <select className="control w-full" value={countyFilter} onChange={(event) => setCountyFilter(event.target.value)}>
                <option>All counties</option>
                {countyOptions.map((county) => <option key={county}>{county}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className="control h-9 w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | AccountingEntry["status"])}>
              <option>All</option>
              <option>Paid</option>
              <option>Unpaid</option>
              <option>Ready to invoice</option>
              <option>Payout pending</option>
            </select>
            <button className="secondary-button" onClick={() => onExportCsv(filteredEntries)}><Download className="h-4 w-4" /> Export CSV</button>
            <button
              className="primary-button disabled:opacity-50"
              disabled={!canManage || selectedEntries.length === 0}
              onClick={() => {
                onMarkPaid(selectedEntries.map((entry) => entry.id));
                setSelectedIds([]);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark paid
            </button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <TableHeader title="Completed Order Payroll" icon={WalletCards} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Appraiser</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">County</th>
                  <th className="px-4 py-3">Gross / tech</th>
                  <th className="px-4 py-3">Split</th>
                  <th className="px-4 py-3">Payout</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-line text-brand-600"
                        checked={selectedIds.includes(entry.id)}
                        onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, entry.id] : ids.filter((id) => id !== entry.id))}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.orderId}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(entry.completedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.client}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.appraiser}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.productType}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.county}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(entry.fee)} / {formatCurrency(entry.techFee)}</td>
                    <td className="px-4 py-3">
                      <input
                        className="h-8 w-20 rounded-md border border-line bg-white px-2 text-sm"
                        type="number"
                        min="0"
                        max="100"
                        value={entry.commissionSplit}
                        disabled={!canManage}
                        onChange={(event) => onOverrideCommission(entry.orderId, Number(event.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(entry.appraiserSplit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("chip", entry.status === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{entry.status}</span>
                      {entry.paidAt && <div className="mt-1 text-xs text-slate-500">Paid {formatDate(entry.paidAt)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3 text-sm text-slate-500">{filteredEntries.length} completed orders in payroll view</div>
        </div>
      </div>

      <aside className="grid content-start gap-5">
        <div className="panel p-5">
          <SectionHeader icon={UserCog} title="Commission Defaults" />
          <div className="mt-4 space-y-3">
            {appraisers.map((appraiser) => (
              <div key={appraiser.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{appraiser.name}</div>
                    <div className="text-xs text-slate-500">{appraiser.role} - {appraiser.counties.slice(0, 2).join(", ")}</div>
                  </div>
                  <input
                    className="h-9 w-20 rounded-md border border-line px-2 text-right text-sm"
                    type="number"
                    min="0"
                    max="100"
                    value={appraiser.defaultCommissionSplit ?? 60}
                    disabled={!canManage}
                    onChange={(event) => onUpdateDefaultSplit(appraiser.name, Number(event.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={ReceiptText} title={user.appraiserName ? "Pay History" : "Client Invoices"} />
          <div className="mt-4 space-y-3">
            {user.appraiserName ? filteredEntries.filter((entry) => entry.status === "Paid").map((entry) => (
              <div key={entry.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-800">{entry.orderId}</span><span>{formatCurrency(entry.appraiserSplit)}</span></div>
                <div className="mt-1 text-xs text-slate-500">Paid {entry.paidAt ? formatDate(entry.paidAt) : "date pending"}</div>
              </div>
            )) : invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">{invoice.client}</span>
                  <span className="text-slate-600">{formatCurrency(invoice.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{invoice.status} - due {formatDate(invoice.dueDate)}</span>
                  {invoice.status === "Draft" && <button className="secondary-button h-7 px-2 text-xs" onClick={() => onMarkInvoiceSent(invoice.id)}>Send</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

function CalendarView({
  orderList,
  appraisers,
  preferences,
  onTogglePreference
}: {
  orderList: Order[];
  appraisers: AppraiserProfile[];
  preferences: CalendarPreference[];
  onTogglePreference: (preferenceId: string, key: keyof Pick<CalendarPreference, "googleConnected" | "syncInspections" | "syncDueDates">) => void;
}) {
  const inspections = orderList.filter((order) => order.inspectionDate).sort((a, b) => new Date(a.inspectionDate ?? "").getTime() - new Date(b.inspectionDate ?? "").getTime());
  const dueDates = [...orderList].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 8);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel p-5">
            <SectionHeader icon={CalendarDays} title="Inspection Calendar" />
            <div className="mt-4 space-y-3">
              {inspections.slice(0, 7).map((order) => (
                <button key={order.id} className="flex w-full items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span><span className="font-semibold text-slate-900">{formatDate(order.inspectionDate ?? order.dueDate)}</span> - {order.borrower}</span>
                  <span className="text-slate-500">{order.appraiser}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <SectionHeader icon={Clock3} title="Due Date Calendar" />
            <div className="mt-4 space-y-3">
              {dueDates.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">{order.fileNumber}</div>
                    <div className="text-xs text-slate-500">{order.client} - {order.productType}</div>
                  </div>
                  <DueChip date={order.dueDate} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={Gauge} title="Appraiser Workload Calendar" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {appraisers.map((appraiser) => (
              <div key={appraiser.id} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{appraiser.name}</span>
                  <span className="text-slate-500">{appraiser.dueThisWeek} due this week</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className={cn("h-2 rounded-full", workloadPercent(appraiser) > 85 ? "bg-rose-500" : "bg-brand-600")} style={{ width: `${Math.min(100, workloadPercent(appraiser))}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">{appraiser.activeOrders}/{appraiser.capacity} active - {appraiser.avgTurnDays}d avg turn</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={Sparkles} title="Google Calendar Foundation" />
        <button className="secondary-button mt-4 w-full justify-center"><CalendarDays className="h-4 w-4" /> Connect Google Calendar</button>
        <div className="mt-4 space-y-3">
          {preferences.map((preference) => (
            <div key={preference.id} className="rounded-md border border-line p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{preference.appraiser}</span>
                <span className={cn("chip", preference.googleConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{preference.googleConnected ? "Connected" : "Not connected"}</span>
              </div>
              <div className="mt-3 grid gap-2">
                <label className="flex items-center justify-between gap-3"><span>Google connected</span><input type="checkbox" checked={preference.googleConnected} onChange={() => onTogglePreference(preference.id, "googleConnected")} /></label>
                <label className="flex items-center justify-between gap-3"><span>Sync inspections</span><input type="checkbox" checked={preference.syncInspections} onChange={() => onTogglePreference(preference.id, "syncInspections")} /></label>
                <label className="flex items-center justify-between gap-3"><span>Sync due dates</span><input type="checkbox" checked={preference.syncDueDates} onChange={() => onTogglePreference(preference.id, "syncDueDates")} /></label>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function ClientsView({
  user,
  clientList,
  orderList,
  onAddClient,
  onUpdateClient
}: {
  user: PortalUser;
  clientList: ClientProfile[];
  orderList: Order[];
  onAddClient: () => void;
  onUpdateClient: (clientId: string, patch: Partial<ClientProfile>) => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState(clientList[0]?.id ?? "");
  const selectedClient = clientList.find((client) => client.id === selectedClientId) ?? clientList[0];
  const canManage = canManageClients(user);
  const history = selectedClient ? orderList.filter((order) => order.client === selectedClient.name) : [];

  useEffect(() => {
    if (!clientList.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(clientList[0]?.id ?? "");
    }
  }, [clientList, selectedClientId]);

  if (!selectedClient) {
    return <SimpleFoundationView icon={Building2} title="Clients" items={["No clients yet."]} />;
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="panel overflow-hidden">
        <TableHeader title="Clients" icon={Building2} />
        <div className="p-4">
          <button className="primary-button w-full justify-center disabled:opacity-50" disabled={!canManage} onClick={onAddClient}><Plus className="h-4 w-4" /> Add client</button>
        </div>
        <div className="divide-y divide-line">
          {clientList.map((client) => (
            <button key={client.id} className={cn("block w-full px-4 py-3 text-left text-sm hover:bg-slate-50", selectedClient.id === client.id && "bg-brand-50")} onClick={() => setSelectedClientId(client.id)}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{client.name}</span>
                <span className={cn("chip", client.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{client.status}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{client.defaultTurnDays}d turn - {client.contacts.length} contacts</div>
            </button>
          ))}
        </div>
      </aside>
      <div className="grid gap-5">
        <div className="panel p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-950">{selectedClient.name}</h2>
                <span className={cn("chip", selectedClient.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{selectedClient.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{history.length} orders - {formatCurrency(history.reduce((total, order) => total + order.fee, 0))} lifetime demo volume</p>
            </div>
            <button
              className="secondary-button disabled:opacity-50"
              disabled={!canManage}
              onClick={() => onUpdateClient(selectedClient.id, { status: selectedClient.status === "Active" ? "Inactive" : "Active" })}
            >
              {selectedClient.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Default turn time">
              <input className="control w-full" type="number" value={selectedClient.defaultTurnDays} disabled={!canManage} onChange={(event) => onUpdateClient(selectedClient.id, { defaultTurnDays: Number(event.target.value) })} />
            </Field>
            {selectedClient.defaultFees.slice(0, 2).map((fee, index) => (
              <Field key={fee.productType} label={`${fee.productType} fee`}>
                <input
                  className="control w-full"
                  type="number"
                  value={fee.fee}
                  disabled={!canManage}
                  onChange={(event) => {
                    const defaultFees = selectedClient.defaultFees.map((item, itemIndex) => itemIndex === index ? { ...item, fee: Number(event.target.value) } : item);
                    onUpdateClient(selectedClient.id, { defaultFees });
                  }}
                />
              </Field>
            ))}
            <Field label="Client notes" span>
              <textarea className="control min-h-24 w-full py-3" value={selectedClient.notes} disabled={!canManage} onChange={(event) => onUpdateClient(selectedClient.id, { notes: event.target.value })} />
            </Field>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel p-5">
            <SectionHeader icon={Users2} title="Client Contacts" />
            <div className="mt-4 space-y-3">
              {selectedClient.contacts.map((contact) => (
                <div key={contact.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="font-semibold text-slate-900">{contact.name}</div>
                  <div className="text-slate-500">{contact.title}</div>
                  <div className="mt-2 text-xs text-slate-500">{contact.email} - {contact.phone}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <SectionHeader icon={ListChecks} title="Order History" />
            <div className="mt-4 space-y-3">
              {(history.length ? history : orderList.slice(0, 3)).map((order) => (
                <div key={order.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{order.fileNumber}</span><StatusChip status={order.status} /></div>
                  <div className="mt-1 text-slate-500">{order.productType} - {formatCurrency(order.fee)} - due {formatDate(order.dueDate)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsView({ entries, orderList }: { entries: AccountingEntry[]; orderList: Order[] }) {
  const byProduct = summarizeAccounting(entries, "productType");
  const byClient = summarizeAccounting(entries, "client");
  const byAppraiser = summarizeAccounting(entries, "appraiser");
  const byCounty = summarizeAccounting(entries, "county");
  const topProduct = byProduct[0]?.label ?? "No product";
  const lastMonth = entries.filter((entry) => entry.month === "2026-06").reduce((total, entry) => total + entry.fee, 0);
  const thisMonth = entries.filter((entry) => entry.month === "2026-07").reduce((total, entry) => total + entry.fee, 0);
  const thisYear = entries.reduce((total, entry) => total + entry.fee, 0);
  const lastYear = Math.round(thisYear * 0.84);
  const averageFee = byProduct.map((product) => {
    const matching = entries.filter((entry) => entry.productType === product.label);
    return `${product.label}: ${formatCurrency(Math.round(product.revenue / Math.max(1, matching.length)))}`;
  });

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Most sold report" value={topProduct} />
        <MetricTile label="This year" value={formatCurrency(thisYear)} />
        <MetricTile label="Last year" value={formatCurrency(lastYear)} />
        <MetricTile label="Month over month" value={`${lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0}%`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="panel p-5"><SectionHeader icon={BarChart3} title="Order Volume" /><LineChart data={volumeChart} suffix=" orders" /></div>
        <div className="panel p-5"><SectionHeader icon={CircleDollarSign} title="Revenue Trend" /><LineChart data={revenueChart} prefix="$" suffix="k" /></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-4">
        <AnalyticsList title="Revenue by Product" items={byProduct.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
        <AnalyticsList title="Revenue by Client" items={byClient.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
        <AnalyticsList title="Revenue by Appraiser" items={byAppraiser.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
        <AnalyticsList title="Revenue by County" items={byCounty.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <SimpleFoundationView icon={Gauge} title="Average Fee by Product" items={averageFee} compact />
        <SimpleFoundationView icon={Building2} title="Best Clients" items={byClient.slice(0, 3).map((item) => `${item.label}: ${item.count} orders, ${formatCurrency(item.revenue)}`)} compact />
        <SimpleFoundationView icon={AlertTriangle} title="Watch Clients" items={orderList.filter((order) => daysUntil(order.dueDate) < 0).map((order) => `${order.client}: ${order.fileNumber} past due`).slice(0, 4)} compact />
      </div>
    </section>
  );
}

function summarizeAccounting(entries: AccountingEntry[], key: "productType" | "client" | "appraiser" | "county") {
  const grouped = entries.reduce<Record<string, { label: string; revenue: number; count: number }>>((accumulator, entry) => {
    const label = entry[key];
    accumulator[label] = accumulator[label] ?? { label, revenue: 0, count: 0 };
    accumulator[label].revenue += entry.fee;
    accumulator[label].count += 1;
    return accumulator;
  }, {});

  return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
}

function AnalyticsList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>)}
      </div>
    </div>
  );
}

function DocumentsView({ orderList }: { orderList: Order[] }) {
  const docs = orderList.flatMap((order) => order.documentsList.map((document) => `${order.fileNumber} - ${document.name} - ${document.status}`));
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <SectionHeader icon={Archive} title="Documents" />
        <div className="mt-4 grid gap-3">
          {(docs.length ? docs : ["No scoped documents yet."]).map((item) => <div key={item} className="rounded-md border border-line px-4 py-3 text-sm text-slate-700">{item}</div>)}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={UploadCloud} title="Upload Placeholder" />
        <div className="mt-4 rounded-md border border-dashed border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          Upload report, engagement package, license, E&O, W-9, or client document placeholder.
        </div>
      </aside>
    </section>
  );
}

function MessagesView({ orderList, user, onAddNote }: { orderList: Order[]; user: PortalUser; onAddNote: (orderId: string) => void }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <SectionHeader icon={MessageSquare} title="Messages and Revision Requests" />
        <div className="mt-4 grid gap-3">
          {orderList.slice(0, 6).map((order) => (
            <div key={order.id} className="rounded-md border border-line px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{order.fileNumber} - {order.borrower}</span>
                <button className="secondary-button h-8 px-2 text-xs" onClick={() => onAddNote(order.id)}>Send message</button>
              </div>
              <div className="mt-2 text-slate-600">{order.clientComments[0]?.body ?? "No client-facing messages yet."}</div>
            </div>
          ))}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={Send} title="New Message" />
        <textarea className="control mt-4 min-h-32 w-full py-3" defaultValue={`Message from ${user.name}: Please confirm the latest order status.`} />
      </aside>
    </section>
  );
}

function ReportsView({ orderList }: { orderList: Order[] }) {
  const reportOrders = orderList.filter((order) => ["Ready for Delivery", "Delivered", "Completed"].includes(order.status));
  return (
    <section className="panel p-5">
      <SectionHeader icon={FileCheck2} title="Completed Reports" />
      <div className="mt-4 grid gap-3">
        {(reportOrders.length ? reportOrders : orderList.slice(0, 3)).map((order) => (
          <div key={order.id} className="flex flex-col gap-3 rounded-md border border-line px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium text-slate-900">{order.fileNumber} - {order.borrower}</div>
              <div className="mt-1 text-slate-500">{order.address}, {order.city} - {order.status}</div>
            </div>
            <button className="secondary-button"><Download className="h-4 w-4" /> Download report</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RevisionsView({ orderList, onSelectOrder }: { orderList: Order[]; onSelectOrder: (order: Order) => void }) {
  const revisionOrders = orderList.filter((order) => order.revisionLog.length || order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser");
  return (
    <section className="panel p-5">
      <SectionHeader icon={AlertTriangle} title="Revisions Needing Response" />
      <div className="mt-4 grid gap-3">
        {(revisionOrders.length ? revisionOrders : orderList.slice(0, 2)).map((order) => (
          <button key={order.id} className="rounded-md border border-line px-4 py-3 text-left text-sm hover:bg-slate-50" onClick={() => onSelectOrder(order)}>
            <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{order.fileNumber}</span><StatusChip status={order.status} /></div>
            <div className="mt-2 text-slate-600">{order.revisionLog[0]?.summary ?? order.nextAction}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function NotificationsView() {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Bell} title="Notifications" />
      <div className="mt-4 grid gap-3">
        {notifications.map((item) => (
          <div key={item.id} className="rounded-md border border-line p-3">
            <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{item.title}</span><span className="text-xs text-slate-400">{item.time}</span></div>
            <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsView({
  user,
  companyUsers,
  onInviteUser,
  onChangeRole,
  onTogglePermission,
  onDeactivateUser
}: {
  user: PortalUser;
  companyUsers: CompanyUser[];
  onInviteUser: () => void;
  onChangeRole: (userId: string, role: UserRole) => void;
  onTogglePermission: (userId: string, permission: PermissionKey) => void;
  onDeactivateUser: (userId: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState(companyUsers[0]?.id ?? "");
  const selectedUser = companyUsers.find((companyUser) => companyUser.id === selectedUserId) ?? companyUsers[0];
  const canInvite = canInviteUsers(user);
  const canManage = canManageCompanyUsers(user);

  useEffect(() => {
    if (!companyUsers.some((companyUser) => companyUser.id === selectedUserId)) {
      setSelectedUserId(companyUsers[0]?.id ?? "");
    }
  }, [companyUsers, selectedUserId]);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader icon={Settings} title="Company Users and Permissions" />
          <button className="primary-button disabled:opacity-50" disabled={!canInvite} onClick={onInviteUser}><UserCheck className="h-4 w-4" /> Invite user</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Permissions</th>
                <th className="px-5 py-3">Last active</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {companyUsers.map((companyUser) => (
                <tr key={companyUser.id} className={cn("hover:bg-slate-50", selectedUser?.id === companyUser.id && "bg-brand-50/60")} onClick={() => setSelectedUserId(companyUser.id)}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{companyUser.name}</div>
                    <div className="text-xs text-slate-500">{companyUser.email}</div>
                  </td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <select className="control h-9" value={companyUser.role} disabled={!canManage} onChange={(event) => onChangeRole(companyUser.id, event.target.value as UserRole)}>
                      {Object.keys(roleNavigation).map((role) => <option key={role} value={role}>{roleLabel(role as UserRole)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4"><span className={cn("chip", companyUser.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : companyUser.status === "Pending invite" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600")}>{companyUser.status}</span></td>
                  <td className="px-5 py-4 text-slate-600">{companyUser.permissions.length}</td>
                  <td className="px-5 py-4 text-slate-600">{companyUser.lastActive}</td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage} onClick={() => onDeactivateUser(companyUser.id)}>
                      {companyUser.status === "Inactive" ? "Reactivate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={ShieldCheck} title="Permission Toggles" />
        {selectedUser ? (
          <>
            <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-900">{selectedUser.name}</div>
              <div className="mt-1 text-slate-500">{roleLabel(selectedUser.role)} - {selectedUser.status}</div>
            </div>
            <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {permissionCatalog.map((permission) => (
                <label key={permission.key} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
                  <span>
                    <span className="block font-medium text-slate-800">{permission.label}</span>
                    <span className="text-xs text-slate-500">{permission.group}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-brand-600"
                    checked={selectedUser.permissions.includes(permission.key)}
                    disabled={!canManage}
                    onChange={() => onTogglePermission(selectedUser.id, permission.key)}
                  />
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-slate-500">Select a user to manage permissions.</div>
        )}
      </aside>
    </section>
  );
}

function CommandPalette({ query, setQuery, onClose, onNavigate, onSelectOrder, orderList, navItems }: { query: string; setQuery: (value: string) => void; onClose: () => void; onNavigate: (view: NavId) => void; onSelectOrder: (order: Order) => void; orderList: Order[]; navItems: Array<{ id: NavId; label: string; icon: LucideIcon }> }) {
  const needle = query.toLowerCase();
  const matchedOrders = orderList.filter((order) => [order.fileNumber, order.borrower, order.client, order.address, order.appraiser].join(" ").toLowerCase().includes(needle)).slice(0, 5);
  const matchedNav = navItems.filter((item) => item.label.toLowerCase().includes(needle)).slice(0, 5);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-lg border border-line bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input autoFocus className="h-11 flex-1 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CAS" />
          <button className="icon-button" onClick={onClose} aria-label="Close search"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[520px] overflow-y-auto p-2">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500">Views</div>
          {matchedNav.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => onNavigate(item.id)}><Icon className="h-4 w-4 text-slate-500" />{item.label}</button>;
          })}
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500">Orders</div>
          {matchedOrders.map((order) => <button key={order.id} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => onSelectOrder(order)}><span>{order.fileNumber} - {order.borrower}</span><span className="text-xs text-slate-500">{order.status}</span></button>)}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const tone = {
    neutral: "border-slate-200 bg-white text-slate-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-rose-200 bg-rose-50 text-rose-700"
  }[kpi.tone];
  return (
    <div className="panel p-4">
      <div className="text-sm text-slate-500">{kpi.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{kpi.value}</div>
      <div className={cn("mt-3 inline-flex rounded-full border px-2 py-1 text-xs font-medium", tone)}>{kpi.change}</div>
    </div>
  );
}

function LineChart({ data, prefix = "", suffix = "" }: { data: ChartPoint[]; prefix?: string; suffix?: string }) {
  const max = Math.max(...data.flatMap((point) => [point.current, point.previous ?? 0]));
  const currentPoints = data.map((point, index) => `${(index / (data.length - 1)) * 100},${100 - (point.current / max) * 86}`).join(" ");
  const previousPoints = data.map((point, index) => `${(index / (data.length - 1)) * 100},${100 - ((point.previous ?? 0) / max) * 86}`).join(" ");
  return (
    <div className="mt-5">
      <svg viewBox="0 0 100 110" className="h-56 w-full overflow-visible" preserveAspectRatio="none">
        {[20, 40, 60, 80, 100].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e5eaf1" strokeWidth="0.4" />)}
        <polyline points={previousPoints} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <polyline points={currentPoints} fill="none" stroke="#2276d2" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 grid grid-cols-6 text-xs text-slate-500">
        {data.map((point) => <div key={point.label}>{point.label}</div>)}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {data.slice(-3).map((point) => <MetricTile key={point.label} label={point.label} value={`${prefix}${point.current}${suffix}`} />)}
      </div>
    </div>
  );
}

function VendorCard({ vendor, vendorDocuments = [] }: { vendor: VendorProfile; vendorDocuments?: VendorDocument[] }) {
  const currentDocs = Object.values(vendor.documents).filter((status) => status === "Current").length;
  return (
    <article className="panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{vendor.company}</h3><span className="chip border-slate-200 bg-slate-50 text-slate-700">{vendor.status}</span></div>
          <p className="mt-1 text-sm text-slate-500">{vendor.contact} - {vendor.distance} miles - {vendor.coverage.join(", ")}</p>
          <p className="mt-1 text-xs text-slate-500">{vendor.officeAddress ?? "Office address pending"} - radius {vendor.radiusMiles ?? 25} miles - ZIPs {(vendor.coverageZips ?? ["30064", "30339"]).join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{vendor.specialties.map((tag) => <span key={tag} className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700 ring-1 ring-brand-100">{tag}</span>)}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <div>Roster: {(vendor.roster ?? [vendor.contact]).join(", ")}</div>
            <div>Rating: {vendor.rating ? `${vendor.rating.toFixed(1)} / 5` : "Pending performance"}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <MetricTile label="Turn" value={`${vendor.turnTime}d`} />
          <MetricTile label="Workload" value={`${vendor.workload ?? Math.max(1, vendor.capacity - 5)}/${vendor.capacity}`} />
          <MetricTile label="Docs" value={currentDocs + "/3"} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-line p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Compliance documents</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendorDocuments.length ? vendorDocuments.map((document) => <span key={document.id} className="chip border-slate-200 bg-slate-50 text-slate-700">{document.type}: {document.status}</span>) : <span className="text-sm text-slate-500">No document records yet.</span>}
          </div>
        </div>
        <div className="rounded-md border border-line p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Fee sheet</div>
          <div className="mt-2 grid gap-1 text-sm text-slate-600">
            {(vendor.feeSheet ?? [{ product: "1004 URAR", fee: 575, turnDays: vendor.turnTime }]).map((fee) => (
              <div key={fee.product} className="flex items-center justify-between gap-3"><span>{fee.product}</span><span>{formatCurrency(fee.fee)} / {fee.turnDays}d</span></div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function SimpleFoundationView({ icon: Icon, title, items, compact = false }: { icon: LucideIcon; title: string; items: string[]; compact?: boolean }) {
  return (
    <section className={cn("panel p-5", compact && "xl:col-span-2")}>
      <SectionHeader icon={Icon} title={title} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <div key={item} className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-700">{item}</div>)}
      </div>
    </section>
  );
}

function SectionHeader({ icon: Icon, title, action, onAction, className }: { icon: LucideIcon; title: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" /><h2 className="text-base font-semibold text-slate-950">{title}</h2></div>
      {action && <button onClick={onAction} className="secondary-button h-9 px-3">{action}</button>}
    </div>
  );
}

function TableHeader({ icon, title }: { icon: LucideIcon; title: string }) {
  const Icon = icon;
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
      <SectionHeader icon={Icon} title={title} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="control w-56 pl-9" placeholder="Search" /></div>
        <button className="secondary-button"><Filter className="h-4 w-4" /> Filter</button>
        <button className="secondary-button"><Download className="h-4 w-4" /> Export</button>
      </div>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <label className={cn("grid gap-1.5 text-sm font-medium text-slate-700", span && "md:col-span-2")}><span>{label}</span>{children}</label>;
}

function TemplateFieldPreview({ field }: { field: OrderFormTemplate["sections"][number]["fields"][number] }) {
  if (field.type === "textarea") {
    return <textarea className="control min-h-20 w-full py-3" placeholder={field.label} />;
  }

  if (field.type === "select") {
    return (
      <select className="control w-full">
        {(field.options ?? ["Option 1", "Option 2"]).map((option) => <option key={option}>{option}</option>)}
      </select>
    );
  }

  if (field.type === "date") {
    return <input className="control w-full" type="date" defaultValue="2026-07-08" />;
  }

  if (field.type === "currency") {
    return <input className="control w-full" inputMode="numeric" placeholder="$0" />;
  }

  if (field.type === "upload") {
    return (
      <button type="button" className="secondary-button justify-center">
        <UploadCloud className="h-4 w-4" />
        Add files
      </button>
    );
  }

  return <input className="control w-full" placeholder={field.label} />;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line px-3 py-2"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</div></div>;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line bg-white px-3 py-2"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold text-slate-900">{value}</div></div>;
}

function StatusChip({ status }: { status: OrderStatus }) {
  return <span className={cn("chip", statusTone(status))}>{status}</span>;
}

function PriorityChip({ priority }: { priority: Order["priority"] }) {
  return <span className={cn("chip border-transparent", priorityTone(priority))}>{priority}</span>;
}

function DueChip({ date }: { date: string }) {
  const days = daysUntil(date);
  const label = days < 0 ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`;
  return <span className={cn("chip", dueTone(date))}>{formatDate(date)} - {label}</span>;
}
