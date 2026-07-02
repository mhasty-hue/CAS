"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
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
  Users2,
  WalletCards,
  Workflow,
  X
} from "lucide-react";
import {
  appraisers,
  clients,
  dashboardKpis,
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
import type { AppraiserProfile, ChartPoint, Kpi, Note, Order, OrderStatus, VendorProfile } from "@/types/domain";
import { cn, daysUntil, dueTone, formatCurrency, formatDate, priorityTone, statusTone } from "@/lib/utils";

type NavId =
  | "dashboard"
  | "orders"
  | "new-order"
  | "calendar"
  | "review"
  | "appraisers"
  | "clients"
  | "vendors"
  | "accounting"
  | "analytics"
  | "documents"
  | "notifications"
  | "settings";

const navItems: Array<{ id: NavId; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ListChecks },
  { id: "new-order", label: "New Order", icon: Plus },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "review", label: "Review", icon: ClipboardCheck },
  { id: "appraisers", label: "Appraisers", icon: Users2 },
  { id: "clients", label: "Clients", icon: Building2 },
  { id: "vendors", label: "AMC/Vendors", icon: ShieldCheck },
  { id: "accounting", label: "Accounting", icon: WalletCards },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings }
];

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

export function CasApp() {
  const [activeView, setActiveView] = useState<NavId>("dashboard");
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0].id);
  const [commandOpen, setCommandOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const selectedOrder = orderList.find((order) => order.id === selectedOrderId) ?? orderList[0];

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

  const currentTitle = navItems.find((item) => item.id === activeView)?.label ?? "Dashboard";

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

  return (
    <div className="min-h-screen bg-canvas text-slate-950 lg:grid lg:grid-cols-[264px_1fr]">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="min-w-0">
        <Topbar title={currentTitle} onCommand={() => setCommandOpen(true)} query={globalQuery} setQuery={setGlobalQuery} />
        <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          {activeView === "dashboard" && <DashboardView orderList={orderList} onOpenOrders={() => setActiveView("orders")} />}
          {activeView === "orders" && (
            <OrdersView
              orderList={orderList}
              selectedOrder={selectedOrder}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
              onAssignOrder={handleAssignOrder}
              onStatusChange={handleStatusChange}
              onAddNote={handleAddNote}
            />
          )}
          {activeView === "new-order" && <NewOrderView />}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "review" && <ReviewView orderList={orderList} onSelectOrder={(order) => { setSelectedOrderId(order.id); setActiveView("orders"); }} />}
          {activeView === "appraisers" && <AppraiserPortalView orderList={orderList} />}
          {activeView === "clients" && <ClientsView />}
          {activeView === "vendors" && <VendorView />}
          {activeView === "accounting" && <AccountingView />}
          {activeView === "analytics" && <AnalyticsView />}
          {activeView === "documents" && <DocumentsView />}
          {activeView === "notifications" && <NotificationsView />}
          {activeView === "settings" && <SettingsView />}
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
          orderList={orderList}
        />
      )}
    </div>
  );
}

function Sidebar({ activeView, onNavigate }: { activeView: NavId; onNavigate: (view: NavId) => void }) {
  return (
    <aside className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
          <Home className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">CAS</div>
          <div className="truncate text-xs text-muted">CAA Operating Workspace</div>
        </div>
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
            <Workflow className="h-4 w-4" /> Workflow
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workflowSteps.slice(0, 6).map((step) => (
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

function Topbar({ title, onCommand, query, setQuery }: { title: string; onCommand: () => void; query: string; setQuery: (value: string) => void }) {
  return (
    <header className="sticky top-[65px] z-10 border-b border-line bg-white/90 backdrop-blur lg:top-0">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="icon-button lg:hidden" aria-label="Open navigation">
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1>
          <p className="hidden text-xs text-muted sm:block">Order operations, review, accounting, and vendor work in one workspace.</p>
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
        <button className="icon-button" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="hidden h-9 items-center gap-2 rounded-md border border-line bg-white px-2 sm:flex">
          <div className="h-6 w-6 rounded-full bg-brand-600" />
          <span className="text-sm font-medium text-slate-700">Nora</span>
        </div>
      </div>
    </header>
  );
}

function DashboardView({ orderList, onOpenOrders }: { orderList: Order[]; onOpenOrders: () => void }) {
  const pastDue = orderList.filter((order) => daysUntil(order.dueDate) < 0 && order.status !== "Completed");
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi) => (
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
  onSelectOrder,
  onAssignOrder,
  onStatusChange,
  onAddNote
}: {
  orderList: Order[];
  selectedOrder: Order;
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
                <button className="secondary-button"><SlidersHorizontal className="h-4 w-4" /> Bulk update</button>
                <button className="secondary-button"><Download className="h-4 w-4" /> Export</button>
                <button className="primary-button"><Plus className="h-4 w-4" /> New order</button>
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
                <th className="px-4 py-3 font-semibold">Appraiser</th>
                <th className="px-4 py-3 font-semibold">Reviewer</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
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
                  <td className="px-4 py-4">
                    <select
                      className="h-8 rounded-md border border-line bg-white px-2 text-xs text-slate-700"
                      value={order.appraiser}
                      onChange={(event) => onAssignOrder(order.id, event.target.value, "Assigned from inline order table.")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <option>{order.appraiser}</option>
                      {appraisers.map((appraiser) => <option key={appraiser.id}>{appraiser.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{order.reviewer}</td>
                  <td className="px-4 py-4"><DueChip date={order.dueDate} /></td>
                  <td className="px-4 py-4"><StatusChip status={order.status} /></td>
                  <td className="px-4 py-4"><PriorityChip priority={order.priority} /></td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(order.fee)}</td>
                  <td className="px-4 py-4 text-slate-600">{order.lastUpdate}</td>
                  <td className="px-4 py-4">
                    <div className="max-w-[220px] truncate text-slate-700">{order.nextAction}</div>
                  </td>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button className="icon-button" aria-label={`Open ${order.fileNumber}`} onClick={() => onSelectOrder(order)}><Eye className="h-4 w-4" /></button>
                      <button className="icon-button" aria-label={`Assign ${order.fileNumber}`} onClick={() => onAssignOrder(order.id, recommendedAppraiser(order).name, "Assigned from quick action recommendation.")}><UserCheck className="h-4 w-4" /></button>
                      <select className="h-9 rounded-md border border-line bg-white px-2 text-xs text-slate-700" value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>
                        {orderStatusOptions.map((status) => <option key={status}>{status}</option>)}
                      </select>
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
      <OrderDetailPanel order={selectedOrder} onAssignOrder={onAssignOrder} onStatusChange={onStatusChange} onAddNote={onAddNote} />
    </div>
  );
}

function OrderDetailPanel({
  order,
  onAssignOrder,
  onStatusChange,
  onAddNote
}: {
  order: Order;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onAddNote: (orderId: string) => void;
}) {
  const reviewComplete = order.reviewItems.filter((item) => item.complete).length;
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
            <button className="secondary-button justify-center px-2" onClick={() => onAssignOrder(order.id, recommendedAppraiser(order).name, "Assigned from order detail recommendation.")}><UserCheck className="h-4 w-4" /> Assign</button>
            <button className="secondary-button justify-center px-2" onClick={() => onAddNote(order.id)}><MessageSquare className="h-4 w-4" /> Add note</button>
            <select className="control" value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>
              {orderStatusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button className="secondary-button justify-center px-2"><UploadCloud className="h-4 w-4" /> Upload</button>
          </div>
        </section>

        <AssignmentPanel order={order} onAssignOrder={onAssignOrder} />

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

        <DetailSection icon={ReceiptText} title="Fee and Accounting Snapshot">
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricTile label="Order fee" value={formatCurrency(order.fee)} />
            <MetricTile label="Tech fee" value={formatCurrency(order.techFee)} />
            <MetricTile label="Payout" value={formatCurrency(order.appraiserPayout)} />
          </div>
        </DetailSection>

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

function NewOrderView() {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form className="panel p-5">
        <SectionHeader icon={Plus} title="New Order Intake" />
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
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button type="button" className="primary-button"><CheckCircle2 className="h-4 w-4" /> Create order</button>
          <button type="button" className="secondary-button"><Sparkles className="h-4 w-4" /> Parse order PDF</button>
          <button type="button" className="secondary-button"><UserCheck className="h-4 w-4" /> Save and assign</button>
        </div>
      </form>
      <aside className="grid content-start gap-5">
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

function ReviewView({ orderList, onSelectOrder }: { orderList: Order[]; onSelectOrder: (order: Order) => void }) {
  const reviewOrders = orderList.filter((order) => ["Submitted", "In Review", "Revisions Needed", "Ready for Delivery"].includes(order.status));
  const openFindings = reviewOrders.flatMap((order) => order.reviewItems.filter((item) => !item.complete).map((item) => ({ order, item }))).slice(0, 6);

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
            <thead className="border-y border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">File</th><th className="px-5 py-3">Borrower</th><th className="px-5 py-3">Appraiser</th><th className="px-5 py-3">Reviewer</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Checklist</th><th className="px-5 py-3">Priority</th></tr></thead>
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

function VendorView() {
  return (
    <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="panel p-5">
        <SectionHeader icon={MapPin} title="Vendor Search" />
        <div className="mt-4 grid gap-3">
          <input className="control" defaultValue="Marietta, GA 30064" />
          <select className="control"><option>Within 25 miles</option><option>Within 50 miles</option><option>County coverage</option></select>
          <select className="control"><option>All products</option><option>FHA</option><option>VA</option><option>Luxury</option><option>Rural</option></select>
          <button className="primary-button justify-center"><Search className="h-4 w-4" /> Search vendors</button>
        </div>
      </aside>
      <div className="grid gap-4">
        {vendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
      </div>
    </section>
  );
}

function AccountingView() {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="panel p-5">
        <SectionHeader icon={CircleDollarSign} title="Company Accounting" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Revenue month" value="$86.4k" />
          <MetricTile label="Outstanding invoices" value="$24.8k" />
          <MetricTile label="Payouts due" value="$17.9k" />
        </div>
        <div className="mt-5"><LineChart data={revenueChart} prefix="$" suffix="k" /></div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={WalletCards} title="Payout Queue" />
        <div className="mt-4 space-y-3">
          {appraisers.map((appraiser) => (
            <div key={appraiser.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{appraiser.name}</span>
              <span className="text-slate-600">{formatCurrency(appraiser.payoutDue)}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function CalendarView() {
  return <SimpleFoundationView icon={CalendarDays} title="Calendar" items={["Inspection calendar", "Due date calendar", "Appraiser workload calendar", "Review due calendar", "Completed order calendar"]} />;
}

function ClientsView() {
  return <SimpleFoundationView icon={Building2} title="Clients" items={clients.map((client) => `${client} - volume, revenue, contacts, invoice status, client rules`)} />;
}

function AnalyticsView() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="panel p-5"><SectionHeader icon={BarChart3} title="Order Analytics" /><LineChart data={volumeChart} suffix=" orders" /></div>
      <div className="panel p-5"><SectionHeader icon={CircleDollarSign} title="Revenue Analytics" /><LineChart data={revenueChart} prefix="$" suffix="k" /></div>
      <SimpleFoundationView icon={Gauge} title="Performance Signals" items={["Turn time by appraiser", "Revision rate by client", "Revenue by county", "Past due trend"]} compact />
    </section>
  );
}

function DocumentsView() {
  return <SimpleFoundationView icon={Archive} title="Documents" items={["Order packages", "Reports", "Engagement letters", "W-9", "E&O", "Appraiser licenses", "Upload history", "Expiration warnings"]} />;
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

function SettingsView() {
  const roles = ["Admin", "Office", "Appraiser", "Reviewer", "AMC Admin"];
  return (
    <section className="panel overflow-hidden">
      <TableHeader title="Roles and Permissions" icon={Settings} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">Permission</th>{roles.map((role) => <th key={role} className="px-5 py-3">{role}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {permissionCatalog.map((permission, index) => (
              <tr key={permission.key} className="hover:bg-slate-50">
                <td className="px-5 py-3"><div className="font-medium text-slate-900">{permission.label}</div><div className="text-xs text-slate-500">{permission.group}</div></td>
                {roles.map((role, roleIndex) => <td key={role} className="px-5 py-3"><input type="checkbox" defaultChecked={roleIndex === 0 || (role === "Reviewer" && permission.group === "Review") || (role === "AMC Admin" && permission.group === "AMC") || (role === "Office" && index < 6)} className="h-4 w-4 rounded border-line text-brand-600" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CommandPalette({ query, setQuery, onClose, onNavigate, onSelectOrder, orderList }: { query: string; setQuery: (value: string) => void; onClose: () => void; onNavigate: (view: NavId) => void; onSelectOrder: (order: Order) => void; orderList: Order[] }) {
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

function VendorCard({ vendor }: { vendor: VendorProfile }) {
  return (
    <article className="panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{vendor.company}</h3><span className="chip border-slate-200 bg-slate-50 text-slate-700">{vendor.status}</span></div>
          <p className="mt-1 text-sm text-slate-500">{vendor.contact} - {vendor.distance} miles - {vendor.coverage.join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{vendor.specialties.map((tag) => <span key={tag} className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700 ring-1 ring-brand-100">{tag}</span>)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <MetricTile label="Turn" value={`${vendor.turnTime}d`} />
          <MetricTile label="Capacity" value={`${vendor.capacity}`} />
          <MetricTile label="Docs" value={Object.values(vendor.documents).filter((status) => status === "Current").length + "/3"} />
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
