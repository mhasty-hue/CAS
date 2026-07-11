import { useEffect, useMemo, useState } from "react";
import { Archive, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download, ExternalLink, Eye, FileCheck2, History, Home, ListChecks, MessageSquare, Plus, ReceiptText, RotateCcw, Search, SlidersHorizontal, UploadCloud, UserCheck, X } from "lucide-react";
import { appraisers, savedViews } from "@/data/demo";
import type { AppraiserProfile, DeliveryRecord, DocumentCategory, InspectionInfo, ManagedDocument, MessageChannel, Order, OrderMessage, OrderStatus, PortalUser, RequiredDocumentRule, RevisionRequest, RevisionStatus } from "@/types/domain";
import { canAssignOrders, canCreateOrders, canEditInspections, canGenerateInvoices, canReopenOrders, canViewAccounting } from "@/lib/permissions";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { orderStatusOptions, statusFilters, type SavedView } from "./config";
import { DetailSection, DueChip, InfoRow, ListOrEmpty, MetricTile, PriorityChip, StatusChip, SummaryItem } from "./shared";
import { OrderDocumentWorkspace, RequiredDocumentSummary } from "./documents/workspace";
import { OrderConversationPanel } from "./messages/conversation";
import { RevisionSummary, RevisionWorkflowPanel } from "./revisions/workflow";

export function orderMatchesView(order: Order, view: SavedView) {
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



export function priorityRank(priority: Order["priority"]) {
  const ranks: Record<Order["priority"], number> = {
    Rush: 0,
    High: 1,
    Watch: 2,
    Standard: 3
  };
  return ranks[priority];
}



export function workloadPercent(appraiser: AppraiserProfile) {
  return Math.round((appraiser.activeOrders / appraiser.capacity) * 100);
}



export function recommendedAppraiser(order: Order) {
  const covered = appraisers.filter((appraiser) => appraiser.counties.includes(order.county));
  const candidates = covered.length ? covered : appraisers;
  return [...candidates].sort((a, b) => workloadPercent(a) - workloadPercent(b))[0];
}

type OrderWorkspace = "active" | "completed" | "cancelled" | "all" | "mine";
type InspectionAction = "schedule" | "reschedule" | "complete" | "cancel" | "note";
type DetailTab = "Overview" | "Timeline" | "Documents" | "Messages" | "Review/Revisions" | "Accounting";

const completedStatuses = new Set<OrderStatus>(["Delivered", "Completed"]);
const cancelledStatuses = new Set<OrderStatus>(["Cancelled"]);

function orderMatchesWorkspace(order: Order, workspace: OrderWorkspace) {
  if (workspace === "all" || workspace === "mine") return true;
  if (workspace === "completed") return completedStatuses.has(order.status);
  if (workspace === "cancelled") return cancelledStatuses.has(order.status);
  return !completedStatuses.has(order.status) && !cancelledStatuses.has(order.status);
}

function inspectionSortValue(order: Order) {
  const value = order.inspection?.scheduledDate ?? order.inspectionDate;
  return value ? new Date(`${value}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function reportStandardLabel(order: Order) {
  const standard = order.reportMetadata?.reportStandard;
  if (standard === "uad_3_6") return "UAD 3.6";
  if (standard === "legacy_uad_2_6") return "Legacy UAD";
  if (standard === "non_gse") return "Non-lending";
  return "Report standard pending";
}

function ReportStandardChip({ order }: { order: Order }) {
  const standard = order.reportMetadata?.reportStandard;
  const tone = standard === "uad_3_6"
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : standard === "legacy_uad_2_6"
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : standard === "non_gse"
        ? "border-teal-200 bg-teal-50 text-teal-700"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return <span className={cn("chip", tone)}>{reportStandardLabel(order)}</span>;
}



export function OrdersView({
  orderList,
  selectedOrder,
  workspace = "active",
  user,
  onSelectOrder,
  onSwitchWorkspace,
  onAssignOrder,
  onStatusChange,
  onReopenOrder,
  onUpdateInspection,
  onAddNote,
  onGenerateInvoice,
  managedDocuments,
  requiredDocumentRules,
  orderMessages,
  revisionRequests,
  deliveryRecords,
  onUploadDocument,
  onArchiveDocument,
  onRestoreDocument,
  onReplaceDocumentVersion,
  onSubmitReport,
  onDeliverReport,
  onSendMessage,
  onToggleMessagePinned,
  onToggleMessageRead,
  onUpdateRevisionStatus,
  onRespondToRevisionItem
}: {
  orderList: Order[];
  selectedOrder: Order;
  workspace?: OrderWorkspace;
  user: PortalUser;
  onSelectOrder: (order: Order) => void;
  onSwitchWorkspace?: (workspace: OrderWorkspace) => void;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onReopenOrder: (orderId: string, reason: string) => void;
  onUpdateInspection: (orderId: string, inspection: InspectionInfo, action: InspectionAction, note: string) => void;
  onAddNote: (orderId: string) => void;
  onGenerateInvoice: (orderId: string) => void;
  managedDocuments: ManagedDocument[];
  requiredDocumentRules: RequiredDocumentRule[];
  orderMessages: OrderMessage[];
  revisionRequests: RevisionRequest[];
  deliveryRecords: DeliveryRecord[];
  onUploadDocument: (orderId: string, category: DocumentCategory) => void;
  onArchiveDocument: (documentId: string) => void;
  onRestoreDocument: (documentId: string) => void;
  onReplaceDocumentVersion: (documentId: string) => void;
  onSubmitReport: (orderId: string) => void;
  onDeliverReport: (orderId: string) => void;
  onSendMessage: (orderId: string, channel: MessageChannel, body: string) => void;
  onToggleMessagePinned: (messageId: string) => void;
  onToggleMessageRead: (messageId: string) => void;
  onUpdateRevisionStatus: (revisionId: string, status: RevisionStatus) => void;
  onRespondToRevisionItem: (revisionId: string, itemId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [sortBy, setSortBy] = useState("Due date ascending");
  const [appraiserFilter, setAppraiserFilter] = useState("All appraisers");
  const [clientFilter, setClientFilter] = useState("All clients");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Order["priority"]>("All");
  const [view, setView] = useState<SavedView>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const workspaceOrders = useMemo(() => orderList.filter((order) => orderMatchesWorkspace(order, workspace)), [orderList, workspace]);
  const appraiserOptions = Array.from(new Set(workspaceOrders.map((order) => order.appraiser))).sort();
  const clientOptions = Array.from(new Set(workspaceOrders.map((order) => order.client))).sort();

  const filteredOrders = useMemo(() => {
    const needle = search.toLowerCase();
    return workspaceOrders
      .filter((order) => orderMatchesView(order, view))
      .filter((order) => statusFilter === "All" || order.status === statusFilter)
      .filter((order) => appraiserFilter === "All appraisers" || order.appraiser === appraiserFilter)
      .filter((order) => clientFilter === "All clients" || order.client === clientFilter)
      .filter((order) => priorityFilter === "All" || order.priority === priorityFilter)
      .filter((order) =>
        [order.fileNumber, order.client, order.borrower, order.address, order.appraiser, order.reviewer, order.county, order.productType]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
      .sort((a, b) => {
        if (sortBy === "Fee") return b.fee - a.fee;
        if (sortBy === "Priority") return priorityRank(a.priority) - priorityRank(b.priority);
        if (sortBy === "Last update") return b.lastUpdate.localeCompare(a.lastUpdate);
        if (sortBy === "Assigned appraiser") return a.appraiser.localeCompare(b.appraiser);
        if (sortBy === "Client") return a.client.localeCompare(b.client);
        if (sortBy === "Status") return a.status.localeCompare(b.status);
        if (sortBy === "Inspection date") return inspectionSortValue(a) - inspectionSortValue(b);
        if (sortBy === "Due date descending") return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [appraiserFilter, clientFilter, priorityFilter, search, sortBy, statusFilter, view, workspaceOrders]);

  const drawerOrder = drawerOrderId ? orderList.find((order) => order.id === drawerOrderId) ?? null : null;
  const drawerIndex = drawerOrder ? filteredOrders.findIndex((order) => order.id === drawerOrder.id) : -1;
  const workspaceCounts = {
    active: orderList.filter((order) => orderMatchesWorkspace(order, "active")).length,
    completed: orderList.filter((order) => orderMatchesWorkspace(order, "completed")).length,
    cancelled: orderList.filter((order) => orderMatchesWorkspace(order, "cancelled")).length,
    all: orderList.length
  };

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOrderId(null);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  function applySavedView(nextView: SavedView) {
    setView(nextView);
    setStatusFilter("All");
  }

  const showAccounting = canViewAccounting(user);
  const showAssignment = canAssignOrders(user);
  const allowStatusUpdates = canAssignOrders(user) || user.role === "appraiser" || user.role === "solo_appraiser";
  const allowReopen = canReopenOrders(user);

  function openOrder(order: Order) {
    onSelectOrder(order);
    setDrawerOrderId(order.id);
  }

  function moveDrawer(offset: -1 | 1) {
    if (drawerIndex < 0) return;
    const next = filteredOrders[drawerIndex + offset];
    if (!next) return;
    openOrder(next);
  }

  return (
    <div className="grid gap-5">
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
                  {filteredOrders.length} visible orders across {workspaceOrders.length} records in this queue.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {showAssignment && <button className="secondary-button"><SlidersHorizontal className="h-4 w-4" /> Bulk update</button>}
                <button className="secondary-button"><Download className="h-4 w-4" /> Export</button>
                {canCreateOrders(user) && <button className="primary-button"><Plus className="h-4 w-4" /> New order</button>}
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {([
                ["active", "Active", workspaceCounts.active],
                ["completed", "Completed", workspaceCounts.completed],
                ["cancelled", "Cancelled", workspaceCounts.cancelled],
                ["all", "All", workspaceCounts.all]
              ] as Array<[OrderWorkspace, string, number]>).map(([id, label, count]) => (
                <button
                  key={id}
                  onClick={() => onSwitchWorkspace?.(id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition",
                    workspace === id ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {label} <span className="ml-1 text-xs opacity-75">{count}</span>
                </button>
              ))}
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

            <div className="grid gap-2 md:grid-cols-[1fr_190px_180px_170px_150px_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="control w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search file, borrower, client, address, appraiser" />
              </div>
              <select className="control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | OrderStatus)}>
                {statusFilters.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="control" value={appraiserFilter} onChange={(event) => setAppraiserFilter(event.target.value)}>
                <option>All appraisers</option>
                {appraiserOptions.map((appraiser) => <option key={appraiser}>{appraiser}</option>)}
              </select>
              <select className="control" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                <option>All clients</option>
                {clientOptions.map((client) => <option key={client}>{client}</option>)}
              </select>
              <select className="control" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "All" | Order["priority"])}>
                <option>All</option>
                <option>Rush</option>
                <option>High</option>
                <option>Standard</option>
                <option>Watch</option>
              </select>
              <select className="control" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option>Due date ascending</option>
                <option>Due date descending</option>
                <option>Assigned appraiser</option>
                <option>Client</option>
                <option>Status</option>
                <option>Fee</option>
                <option>Priority</option>
                <option>Inspection date</option>
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
                <th className="px-4 py-3 font-semibold">Inspection</th>
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
                <tr key={order.id} onClick={() => openOrder(order)} className={cn("group hover:bg-slate-50", (drawerOrder?.id ?? selectedOrder.id) === order.id && "bg-brand-50/60")}>
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
                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-slate-800">{order.productType}</div>
                    <div className="mt-1"><ReportStandardChip order={order} /></div>
                  </td>
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
                  <td className="px-4 py-4 text-slate-600">{order.inspection?.scheduledDate ?? order.inspectionDate ? formatDate(order.inspection?.scheduledDate ?? order.inspectionDate ?? "") : "Not scheduled"}</td>
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
                      <button className="icon-button" aria-label={`Open ${order.fileNumber}`} onClick={() => openOrder(order)}><Eye className="h-4 w-4" /></button>
                      {showAssignment && <button className="icon-button" aria-label={`Assign ${order.fileNumber}`} onClick={() => onAssignOrder(order.id, recommendedAppraiser(order).name, "Assigned from quick action recommendation.")}><UserCheck className="h-4 w-4" /></button>}
                      {allowReopen && (completedStatuses.has(order.status) || cancelledStatuses.has(order.status)) && <button className="icon-button" aria-label={`Reopen ${order.fileNumber}`} onClick={() => onReopenOrder(order.id, "Reopened from historical order queue.")}><RotateCcw className="h-4 w-4" /></button>}
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
      {drawerOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm" onMouseDown={() => setDrawerOrderId(null)}>
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[760px] justify-end sm:p-3" onMouseDown={(event) => event.stopPropagation()}>
            <OrderDetailPanel
              order={drawerOrder}
              user={user}
              onClose={() => setDrawerOrderId(null)}
              onPrevious={drawerIndex > 0 ? () => moveDrawer(-1) : undefined}
              onNext={drawerIndex >= 0 && drawerIndex < filteredOrders.length - 1 ? () => moveDrawer(1) : undefined}
              onAssignOrder={onAssignOrder}
              onStatusChange={onStatusChange}
              onUpdateInspection={onUpdateInspection}
              onAddNote={onAddNote}
              onGenerateInvoice={onGenerateInvoice}
              managedDocuments={managedDocuments}
              requiredDocumentRules={requiredDocumentRules}
              orderMessages={orderMessages}
              revisionRequests={revisionRequests}
              deliveryRecords={deliveryRecords}
              onUploadDocument={onUploadDocument}
              onArchiveDocument={onArchiveDocument}
              onRestoreDocument={onRestoreDocument}
              onReplaceDocumentVersion={onReplaceDocumentVersion}
              onSubmitReport={onSubmitReport}
              onDeliverReport={onDeliverReport}
              onSendMessage={onSendMessage}
              onToggleMessagePinned={onToggleMessagePinned}
              onToggleMessageRead={onToggleMessageRead}
              onUpdateRevisionStatus={onUpdateRevisionStatus}
              onRespondToRevisionItem={onRespondToRevisionItem}
            />
          </div>
        </div>
      )}
    </div>
  );
}



export function OrderDetailPanel({
  order,
  user,
  onClose,
  onPrevious,
  onNext,
  onAssignOrder,
  onStatusChange,
  onUpdateInspection,
  onAddNote,
  onGenerateInvoice,
  managedDocuments,
  requiredDocumentRules,
  orderMessages,
  revisionRequests,
  deliveryRecords,
  onUploadDocument,
  onArchiveDocument,
  onRestoreDocument,
  onReplaceDocumentVersion,
  onSubmitReport,
  onDeliverReport,
  onSendMessage,
  onToggleMessagePinned,
  onToggleMessageRead,
  onUpdateRevisionStatus,
  onRespondToRevisionItem
}: {
  order: Order;
  user: PortalUser;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onUpdateInspection: (orderId: string, inspection: InspectionInfo, action: InspectionAction, note: string) => void;
  onAddNote: (orderId: string) => void;
  onGenerateInvoice: (orderId: string) => void;
  managedDocuments: ManagedDocument[];
  requiredDocumentRules: RequiredDocumentRule[];
  orderMessages: OrderMessage[];
  revisionRequests: RevisionRequest[];
  deliveryRecords: DeliveryRecord[];
  onUploadDocument: (orderId: string, category: DocumentCategory) => void;
  onArchiveDocument: (documentId: string) => void;
  onRestoreDocument: (documentId: string) => void;
  onReplaceDocumentVersion: (documentId: string) => void;
  onSubmitReport: (orderId: string) => void;
  onDeliverReport: (orderId: string) => void;
  onSendMessage: (orderId: string, channel: MessageChannel, body: string) => void;
  onToggleMessagePinned: (messageId: string) => void;
  onToggleMessageRead: (messageId: string) => void;
  onUpdateRevisionStatus: (revisionId: string, status: RevisionStatus) => void;
  onRespondToRevisionItem: (revisionId: string, itemId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const reviewComplete = order.reviewItems.filter((item) => item.complete).length;
  const showAccounting = canViewAccounting(user);
  const showAssignment = canAssignOrders(user);
  const showInvoiceAction = canGenerateInvoices(user);
  const tabs: DetailTab[] = ["Overview", "Timeline", "Documents", "Messages", "Review/Revisions", ...(showAccounting ? ["Accounting" as const] : [])];
  return (
    <aside className="panel h-full w-full overflow-hidden shadow-2xl sm:rounded-lg">
      <div className="border-b border-line bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-950">{order.fileNumber}</span>
              <StatusChip status={order.status} />
              <PriorityChip priority={order.priority} />
              <ReportStandardChip order={order} />
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{order.address}</h2>
            <p className="mt-1 text-sm text-slate-500">{order.borrower} - {order.client} - {order.productType}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="icon-button disabled:opacity-40" disabled={!onPrevious} aria-label="Previous order" onClick={onPrevious}><ChevronLeft className="h-4 w-4" /></button>
            <button className="icon-button disabled:opacity-40" disabled={!onNext} aria-label="Next order" onClick={onNext}><ChevronRight className="h-4 w-4" /></button>
            <button className="icon-button" aria-label="Open full order page"><ExternalLink className="h-4 w-4" /></button>
            <button className="icon-button" aria-label="Close order detail" onClick={onClose}><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <SummaryItem label="Due" value={formatDate(order.dueDate)} />
          <SummaryItem label="Fee" value={formatCurrency(order.fee)} />
          <SummaryItem label="Appraiser" value={order.appraiser} />
          <SummaryItem label="Reviewer" value={order.reviewer} />
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line bg-slate-50 px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
              activeTab === tab ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="grid max-h-[calc(100vh-12rem)] gap-5 overflow-y-auto p-5">
        {activeTab === "Overview" && (
          <>
        <section>
          <h3 className="text-sm font-semibold text-slate-950">Quick Actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {showAssignment && <button className="secondary-button justify-center px-2" onClick={() => onAssignOrder(order.id, recommendedAppraiser(order).name, "Assigned from order detail recommendation.")}><UserCheck className="h-4 w-4" /> Assign</button>}
            <button className="secondary-button justify-center px-2" onClick={() => onAddNote(order.id)}><MessageSquare className="h-4 w-4" /> Add note</button>
            <select className="control" value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>
              {orderStatusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
            {showInvoiceAction && <button className="secondary-button justify-center px-2" onClick={() => onGenerateInvoice(order.id)}><ReceiptText className="h-4 w-4" /> Invoice</button>}
            <button className="secondary-button justify-center px-2"><UploadCloud className="h-4 w-4" /> Upload</button>
          </div>
        </section>

        {showAssignment && <AssignmentPanel order={order} onAssignOrder={onAssignOrder} />}
        <RequiredDocumentSummary order={order} documents={managedDocuments} rules={requiredDocumentRules} />
        <RevisionSummary order={order} revisions={revisionRequests} />
        <ReportMetadataSection order={order} />
        <InspectionPanel order={order} user={user} onUpdateInspection={onUpdateInspection} />

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
          </>
        )}

        {activeTab === "Accounting" && showAccounting && <DetailSection icon={ReceiptText} title="Fee and Accounting Snapshot">
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricTile label="Order fee" value={formatCurrency(order.fee)} />
            <MetricTile label="Tech fee" value={formatCurrency(order.techFee)} />
            <MetricTile label="Payout" value={formatCurrency(order.appraiserPayout)} />
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <InfoRow label="Other noncommissionable" value={formatCurrency(order.otherNonCommissionableFees ?? order.payrollSnapshot?.otherNonCommissionableFees ?? 0)} />
            <InfoRow label="Commissionable base" value={formatCurrency(order.payrollSnapshot?.commissionableBase ?? Math.max(0, order.fee - order.techFee - (order.otherNonCommissionableFees ?? 0)))} />
            <InfoRow label="Calculation source" value={order.payrollSnapshot?.calculationSource ?? "Accounting workspace calculation pending"} />
            <InfoRow label="Approved" value={order.payrollSnapshot?.approvedBy ? `${order.payrollSnapshot.approvedBy} on ${formatDate(order.payrollSnapshot.approvedDate ?? order.paidAt ?? order.dueDate)}` : "Not approved"} />
          </div>
        </DetailSection>}

        {activeTab === "Timeline" && (
          <>
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
        <DetailSection icon={History} title="Assignment History">
          <ListOrEmpty
            empty="No assignment history yet."
            items={order.assignmentHistory.map((item) => `${item.at} - ${item.action} to ${item.appraiser} by ${item.actor}. ${item.note}`)}
          />
        </DetailSection>
        <DetailSection icon={Archive} title="Audit Trail">
          <ListOrEmpty
            empty="No audit entries yet."
            items={order.auditTrail.map((item) => `${item.at} - ${item.actor}: ${item.action}`)}
          />
        </DetailSection>
          </>
        )}

        {activeTab === "Messages" && <DetailSection icon={MessageSquare} title="Order Communication">
          <OrderConversationPanel
            order={order}
            user={user}
            messages={orderMessages}
            onSendMessage={onSendMessage}
            onTogglePinned={onToggleMessagePinned}
            onToggleRead={onToggleMessageRead}
          />
        </DetailSection>
        }

        {activeTab === "Documents" && <DetailSection icon={UploadCloud} title="Documents and Uploads">
          <OrderDocumentWorkspace
            order={order}
            user={user}
            documents={managedDocuments}
            requiredRules={requiredDocumentRules}
            deliveryRecords={deliveryRecords}
            onUploadDocument={onUploadDocument}
            onArchiveDocument={onArchiveDocument}
            onRestoreDocument={onRestoreDocument}
            onReplaceDocumentVersion={onReplaceDocumentVersion}
            onSubmitReport={onSubmitReport}
            onDeliverReport={onDeliverReport}
          />
        </DetailSection>
        }

        {activeTab === "Review/Revisions" && (
          <>
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

        <DetailSection icon={FileCheck2} title="Structured Revision Workflow">
          <RevisionWorkflowPanel
            order={order}
            revisions={revisionRequests}
            documents={managedDocuments}
            onUpdateRevisionStatus={onUpdateRevisionStatus}
            onRespondToRevisionItem={onRespondToRevisionItem}
          />
        </DetailSection>
          </>
        )}
      </div>
    </aside>
  );
}



export function ReportMetadataSection({ order }: { order: Order }) {
  const metadata = order.reportMetadata;
  const readiness = metadata?.reportStandard === "uad_3_6"
    ? [
        "UAD 3.6 product selected",
        metadata.reportSchemaVersion ? `Schema ${metadata.reportSchemaVersion} configured` : "Schema version missing",
        metadata.submissionFormat.includes("UAD 3.6 data package") ? "Data package expected at submission" : "Data package format missing",
        metadata.mismoVersion ? `MISMO ${metadata.mismoVersion} ready` : "MISMO version pending",
        metadata.ucdpSubmissionStatus ? `UCDP status: ${metadata.ucdpSubmissionStatus}` : "UCDP status pending"
      ]
    : [
        `${reportStandardLabel(order)} workflow`,
        metadata?.submissionFormat?.join(", ") ?? "Submission format pending",
        metadata?.ucdpSubmissionStatus ? `UCDP status: ${metadata.ucdpSubmissionStatus}` : "UCDP not required or not configured"
      ];

  return (
    <DetailSection icon={FileCheck2} title="Report Standard and UAD Readiness">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReportStandardChip order={order} />
          <span className="text-sm text-slate-500">{metadata?.reportType ?? "Report type pending"}</span>
        </div>
        <div className="grid gap-2 text-sm">
          <InfoRow label="Schema / XML" value={`${metadata?.reportSchemaVersion ?? "Pending"} / ${metadata?.xmlVersion ?? "No XML version"}`} />
          <InfoRow label="Assignment / scope" value={`${metadata?.assignmentType ?? "Pending"} / ${metadata?.inspectionScope ?? "Pending"}`} />
          <InfoRow label="Property type" value={metadata?.propertyType ?? order.propertyType} />
          <InfoRow label="Submission format" value={metadata?.submissionFormat.join(", ") ?? "Pending"} />
          <InfoRow label="UCDP findings" value={metadata?.ucdpFindings?.join(" ") ?? "No findings recorded"} />
        </div>
        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Readiness checklist</div>
          <div className="mt-2 grid gap-2 text-sm">
            {readiness.map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
                <span className="text-slate-700">{item}</span>
                <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">Tracked</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DetailSection>
  );
}



export function InspectionPanel({
  order,
  user,
  onUpdateInspection
}: {
  order: Order;
  user: PortalUser;
  onUpdateInspection: (orderId: string, inspection: InspectionInfo, action: InspectionAction, note: string) => void;
}) {
  const defaultInspection = useMemo<InspectionInfo>(() => ({
    scheduledDate: order.inspectionDate ?? order.dueDate,
    scheduledStartTime: "10:00",
    scheduledEndTime: "11:00",
    timeZone: "America/New_York",
    inspectionType: order.reportMetadata?.inspectionScope ?? "Interior and exterior",
    accessContact: order.contactName,
    accessNotes: order.accessInfo,
    calendarSyncStatus: "Not synced",
    internalNote: ""
  }), [order.accessInfo, order.contactName, order.dueDate, order.inspectionDate, order.reportMetadata?.inspectionScope]);
  const [draft, setDraft] = useState<InspectionInfo>(order.inspection ?? defaultInspection);
  const [note, setNote] = useState(order.inspection?.internalNote ?? "");
  const canManage = canEditInspections(user) || (!!user.appraiserName && user.appraiserName === order.appraiser);

  useEffect(() => {
    setDraft(order.inspection ?? defaultInspection);
    setNote(order.inspection?.internalNote ?? "");
  }, [defaultInspection, order.inspection]);

  function commit(action: InspectionAction, patch: Partial<InspectionInfo> = {}) {
    const nextInspection = { ...draft, ...patch, internalNote: note };
    onUpdateInspection(order.id, nextInspection, action, note);
  }

  return (
    <DetailSection icon={CalendarClock} title="Inspection Schedule">
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Date
            <input className="control" type="date" value={draft.scheduledDate ?? ""} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, scheduledDate: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Start
            <input className="control" type="time" value={draft.scheduledStartTime ?? ""} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, scheduledStartTime: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            End
            <input className="control" type="time" value={draft.scheduledEndTime ?? ""} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, scheduledEndTime: event.target.value }))} />
          </label>
        </div>
        <div className="grid gap-2 text-sm">
          <InfoRow label="Type" value={draft.inspectionType} />
          <InfoRow label="Access contact" value={draft.accessContact} />
          <InfoRow label="Calendar sync" value={draft.calendarSyncStatus} />
          <InfoRow label="Completed" value={draft.completedAt ? formatDate(draft.completedAt.slice(0, 10)) : "Not completed"} />
        </div>
        <textarea className="control min-h-20 w-full py-3" value={note} disabled={!canManage} onChange={(event) => setNote(event.target.value)} placeholder="Access, reschedule, cancellation, or completion note" />
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button disabled:opacity-50" disabled={!canManage} onClick={() => commit(order.inspection?.scheduledDate ? "reschedule" : "schedule", { calendarSyncStatus: "Queued" })}>Schedule</button>
          <button className="secondary-button disabled:opacity-50" disabled={!canManage} onClick={() => commit("complete", { completedAt: new Date().toISOString(), calendarSyncStatus: "Synced" })}>Complete inspection</button>
          <button className="secondary-button disabled:opacity-50" disabled={!canManage} onClick={() => commit("cancel", { cancellationReason: note || "Cancelled from order detail", calendarSyncStatus: "Queued" })}>Cancel</button>
          <button className="secondary-button disabled:opacity-50" disabled={!canManage} onClick={() => commit("note")}>Save note</button>
        </div>
      </div>
    </DetailSection>
  );
}



export function AssignmentPanel({ order, onAssignOrder }: { order: Order; onAssignOrder: (orderId: string, appraiserName: string, note: string) => void }) {
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
