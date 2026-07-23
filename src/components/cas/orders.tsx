import { useEffect, useMemo, useState } from "react";
import { Archive, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download, ExternalLink, Eye, FileCheck2, History, Home, ListChecks, MessageSquare, Plus, ReceiptText, RotateCcw, Search, SlidersHorizontal, UploadCloud, UserCheck, X } from "lucide-react";
import { appraisers } from "@/data/demo";
import type { AppraiserProfile, BidRequest, ConnectedOrderSummary, DeliveryRecord, DocumentCategory, InspectionInfo, ManagedDocument, MessageChannel, Order, OrderMessage, OrderStatus, Organization, PortalUser, RequiredDocumentRule, RevisionRequest, RevisionStatus } from "@/types/domain";
import { canAssignOrders, canCreateOrders, canEditInspections, canGenerateInvoices, canReopenOrders, canViewAccounting } from "@/lib/permissions";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { countQueueItems, getAllowedStatusTransitions, getDefaultOrderQueue, getIncomingAssignmentsForUser, getOpenBidRequestsForUser, getOrderQueueTabs, queueDefinitions, queueMatchesOrder, requiresStatusReason, statusDefinitions, type BidQueueContext, type ConnectedQueueContext, type OrderQueueId } from "@/lib/orders/workflow";
import { statusFilters } from "./config";
import { DetailSection, DueChip, InfoRow, ListOrEmpty, MetricTile, PriorityChip, StatusChip, SummaryItem } from "./shared";
import { OrderDocumentWorkspace, RequiredDocumentSummary } from "./documents/workspace";
import { OrderConversationPanel } from "./messages/conversation";
import { RevisionSummary, RevisionWorkflowPanel } from "./revisions/workflow";

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

function WorkflowStatusChip({ order, user }: { order: Order; user: PortalUser }) {
  if (user.role === "client_user") {
    return <span className="chip border-brand-100 bg-brand-50 text-brand-700">{statusDefinitions[order.status].clientLabel}</span>;
  }
  return <StatusChip status={order.status} />;
}

function StatusTransitionSelect({ order, user, onChange }: { order: Order; user: PortalUser; onChange: (order: Order, status: OrderStatus) => void }) {
  const options = getAllowedStatusTransitions(order, user);
  const enabled = options.some((option) => option.status !== order.status && !option.disabled);

  if (!enabled) {
    return (
      <span className="rounded-md border border-line bg-slate-50 px-2 py-1.5 text-xs text-slate-500" title={options.find((option) => option.disabled)?.reason}>
        Status locked
      </span>
    );
  }

  return (
    <select
      className="h-9 rounded-md border border-line bg-white px-2 text-xs text-slate-700"
      value={order.status}
      onChange={(event) => onChange(order, event.target.value as OrderStatus)}
      aria-label={`Update ${order.fileNumber} status`}
    >
      {options.map((option) => (
        <option key={option.status} value={option.status} disabled={option.disabled} title={option.reason}>
          {option.label}{option.requiresReason && option.status !== order.status ? " *" : ""}
        </option>
      ))}
    </select>
  );
}

function SharedAssignmentQueue({ assignments }: { assignments: ConnectedOrderSummary[] }) {
  return (
    <section className="border-b border-line bg-slate-50/70 px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {assignments.map((assignment) => (
          <article key={assignment.orderId} className="rounded-md border border-line bg-white p-4 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold text-slate-950">{assignment.fileNumber} - {assignment.borrowerName}</div>
                <div className="mt-1 text-slate-600">{assignment.propertyAddress}, {assignment.city} - {assignment.productType}</div>
                <div className="mt-2 text-xs text-slate-500">{assignment.nextAction}</div>
              </div>
              <span className="chip border-amber-200 bg-amber-50 text-amber-800">{assignment.simplifiedStatus}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="primary-button h-8 px-2 text-xs">Accept assignment</button>
              <button className="secondary-button h-8 px-2 text-xs">Decline</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BidRequestQueue({ requests }: { requests: BidRequest[] }) {
  return (
    <section className="border-b border-line bg-slate-50/70 px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {requests.map((request) => (
          <article key={request.id} className="rounded-md border border-line bg-white p-4 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold text-slate-950">{request.subjectAddress}</div>
                <div className="mt-1 text-slate-600">{request.county}, {request.state} - {request.productType}</div>
                <div className="mt-2 text-xs text-slate-500">Respond by {formatDate(request.bidDeadlineAt)}</div>
              </div>
              <span className="chip border-brand-200 bg-brand-50 text-brand-700">Open request</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="primary-button h-8 px-2 text-xs">Review request</button>
              <button className="secondary-button h-8 px-2 text-xs">No bid</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type InspectionAction = "schedule" | "reschedule" | "complete" | "cancel" | "note";
type DetailTab = "Overview" | "Timeline" | "Documents" | "Messages" | "Review/Revisions" | "Accounting";

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
  initialQueue,
  user,
  organization,
  onSelectOrder,
  onOpenNewOrder,
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
  onRespondToRevisionItem,
  bids,
  connected
}: {
  orderList: Order[];
  selectedOrder: Order;
  initialQueue?: OrderQueueId;
  user: PortalUser;
  organization: Organization;
  onSelectOrder: (order: Order) => void;
  onOpenNewOrder?: () => void;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus, reason?: string) => void;
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
  bids?: BidQueueContext;
  connected?: ConnectedQueueContext;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [sortBy, setSortBy] = useState("Due date ascending");
  const [appraiserFilter, setAppraiserFilter] = useState("All appraisers");
  const [clientFilter, setClientFilter] = useState("All clients");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Order["priority"]>("All");
  const [activeQueue, setActiveQueue] = useState<OrderQueueId>(initialQueue ?? getDefaultOrderQueue(user, organization));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const queueTabs = useMemo(() => getOrderQueueTabs(user, organization), [organization, user]);
  const queueOrders = useMemo(() => orderList.filter((order) => queueMatchesOrder(order, activeQueue)), [activeQueue, orderList]);
  const appraiserOptions = Array.from(new Set(queueOrders.map((order) => order.appraiser))).sort();
  const clientOptions = Array.from(new Set(queueOrders.map((order) => order.client))).sort();
  const openBidRequests = bids ? getOpenBidRequestsForUser(bids, user, organization) : [];
  const incomingAssignments = connected ? getIncomingAssignmentsForUser(connected, user, organization) : [];

  const filteredOrders = useMemo(() => {
    const needle = search.toLowerCase();
    return queueOrders
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
  }, [appraiserFilter, clientFilter, priorityFilter, queueOrders, search, sortBy, statusFilter]);

  const drawerOrder = drawerOrderId ? orderList.find((order) => order.id === drawerOrderId) ?? null : null;
  const drawerIndex = drawerOrder ? filteredOrders.findIndex((order) => order.id === drawerOrder.id) : -1;

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOrderId(null);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    const nextQueue = initialQueue ?? getDefaultOrderQueue(user, organization);
    setActiveQueue(queueTabs.includes(nextQueue) ? nextQueue : queueTabs[0] ?? "active");
  }, [initialQueue, organization, queueTabs, user]);

  const showAccounting = canViewAccounting(user) && user.role !== "client_user" && (!user.appraiserName || selectedOrder.appraiser === user.appraiserName);
  const showAssignment = canAssignOrders(user);
  const allowReopen = canReopenOrders(user);
  const currentQueue = queueDefinitions[activeQueue];

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

  function requestAssignment(order: Order, appraiserName: string, fallbackNote: string) {
    if (appraiserName === order.appraiser) return;
    const needsReason = order.appraiser !== "Unassigned";
    const reason = needsReason ? window.prompt("Reason for reassignment") : fallbackNote;
    if (needsReason && !reason?.trim()) return;
    onAssignOrder(order.id, appraiserName, reason?.trim() || fallbackNote);
  }

  function requestReopen(order: Order) {
    const reason = window.prompt("Reason for reopening this order");
    if (!reason?.trim()) return;
    onReopenOrder(order.id, reason.trim());
  }

  function requestStatusChange(order: Order, status: OrderStatus) {
    if (status === order.status) return;
    const option = getAllowedStatusTransitions(order, user).find((item) => item.status === status);
    if (!option || option.disabled) {
      window.alert(option?.reason ?? "That status change is not available for your role.");
      return;
    }
    let reason: string | undefined;
    if (option.requiresReason || requiresStatusReason(order.status, status)) {
      reason = window.prompt(`Reason for changing this order to ${status}`)?.trim();
      if (!reason) return;
    }
    onStatusChange(order.id, status, reason);
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
                  Orders Workspace
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredOrders.length} orders in {currentQueue.label.toLowerCase()}. {currentQueue.nextAction ?? "Use the tabs below to move through the work."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {showAssignment && <button className="secondary-button"><SlidersHorizontal className="h-4 w-4" /> Bulk update</button>}
                <button className="secondary-button"><Download className="h-4 w-4" /> Export</button>
                {canCreateOrders(user) && <button className="primary-button" onClick={onOpenNewOrder}><Plus className="h-4 w-4" /> New order</button>}
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {queueTabs.map((queueId) => {
                const definition = queueDefinitions[queueId];
                const count = countQueueItems({ orders: orderList, queueId, user, organization, bids, connected });
                return (
                <button
                  key={queueId}
                  onClick={() => {
                    setActiveQueue(queueId);
                    setStatusFilter("All");
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition",
                    activeQueue === queueId ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {definition.label} <span className="ml-1 text-xs opacity-75">{count}</span>
                </button>
                );
              })}
            </div>

            <div className="grid gap-2 md:grid-cols-5">
              <MetricTile label="Needs assignment" value={String(orderList.filter((order) => queueMatchesOrder(order, "needs-assignment")).length)} />
              <MetricTile label="Due soon" value={String(orderList.filter((order) => queueMatchesOrder(order, "due-soon")).length)} />
              <MetricTile label="In review" value={String(orderList.filter((order) => queueMatchesOrder(order, "in-review")).length)} />
              <MetricTile label="Ready delivery" value={String(orderList.filter((order) => queueMatchesOrder(order, "ready-for-delivery")).length)} />
              <MetricTile label="Revisions" value={String(orderList.filter((order) => queueMatchesOrder(order, "revisions")).length)} />
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
        {activeQueue === "incoming-assignments" && incomingAssignments.length > 0 && (
          <SharedAssignmentQueue assignments={incomingAssignments} />
        )}
        {activeQueue === "bid-requests" && openBidRequests.length > 0 && (
          <BidRequestQueue requests={openBidRequests} />
        )}
        {filteredOrders.length === 0 && (activeQueue === "bid-requests" || activeQueue === "incoming-assignments") ? (
          <div className="border-b border-line px-4 py-5 text-sm text-slate-500">
            {activeQueue === "bid-requests" && openBidRequests.length > 0 ? "Bid requests are shown above." : activeQueue === "incoming-assignments" && incomingAssignments.length > 0 ? "Incoming assignments are shown above." : currentQueue.empty}
          </div>
        ) : null}
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
              {filteredOrders.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={15}>
                    {currentQueue.empty}
                  </td>
                </tr>
              )}
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
                      onChange={(event) => requestAssignment(order, event.target.value, "Assigned from inline order table.")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <option>{order.appraiser}</option>
                      {appraisers.map((appraiser) => <option key={appraiser.id}>{appraiser.name}</option>)}
                    </select>
                  </td>}
                  <td className="px-4 py-4 text-slate-700">{order.reviewer}</td>
                  <td className="px-4 py-4 text-slate-600">{order.inspection?.scheduledDate ?? order.inspectionDate ? formatDate(order.inspection?.scheduledDate ?? order.inspectionDate ?? "") : "Not scheduled"}</td>
                  <td className="px-4 py-4"><DueChip date={order.dueDate} /></td>
                  <td className="px-4 py-4"><WorkflowStatusChip order={order} user={user} /></td>
                  <td className="px-4 py-4"><PriorityChip priority={order.priority} /></td>
                  {showAccounting && <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(order.fee)}</td>}
                  <td className="px-4 py-4 text-slate-600">{order.lastUpdate}</td>
                  <td className="px-4 py-4">
                    <div className="max-w-[220px] truncate text-slate-700">{order.nextAction}</div>
                  </td>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button className="icon-button" aria-label={`Open ${order.fileNumber}`} onClick={() => openOrder(order)}><Eye className="h-4 w-4" /></button>
                      {showAssignment && <button className="icon-button" aria-label={`Assign ${order.fileNumber}`} onClick={() => requestAssignment(order, recommendedAppraiser(order).name, "Assigned from quick action recommendation.")}><UserCheck className="h-4 w-4" /></button>}
                      {allowReopen && (statusDefinitions[order.status].lifecycle === "terminal" || statusDefinitions[order.status].lifecycle === "cancelled" || statusDefinitions[order.status].lifecycle === "delivered") && <button className="icon-button" aria-label={`Reopen ${order.fileNumber}`} onClick={() => requestReopen(order)}><RotateCcw className="h-4 w-4" /></button>}
                      <StatusTransitionSelect order={order} user={user} onChange={requestStatusChange} />
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
              onStatusChange={requestStatusChange}
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
  onStatusChange: (order: Order, status: OrderStatus) => void;
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
  const showAccounting = canViewAccounting(user) && user.role !== "client_user" && (!user.appraiserName || order.appraiser === user.appraiserName);
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
              <WorkflowStatusChip order={order} user={user} />
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
            <StatusTransitionSelect order={order} user={user} onChange={onStatusChange} />
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
        <button
          className="primary-button justify-center"
          onClick={() => {
            if (order.appraiser !== "Unassigned" && !assignmentNote.trim()) {
              window.alert("Add a reassignment reason before changing the appraiser.");
              return;
            }
            onAssignOrder(order.id, appraiserName, assignmentNote.trim() || "Assigned from assignment panel.");
          }}
        >
          <UserCheck className="h-4 w-4" />
          Assign and update status
        </button>
      </div>
    </section>
  );
}
