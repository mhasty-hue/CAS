import { useMemo, useState } from "react";
import { Archive, ClipboardCheck, Clock3, Download, Eye, FileCheck2, History, Home, ListChecks, MessageSquare, Plus, ReceiptText, Search, SlidersHorizontal, UploadCloud, UserCheck, X } from "lucide-react";
import { appraisers, savedViews } from "@/data/demo";
import type { AppraiserProfile, DeliveryRecord, DocumentCategory, ManagedDocument, MessageChannel, Order, OrderMessage, OrderStatus, PortalUser, RequiredDocumentRule, RevisionRequest, RevisionStatus } from "@/types/domain";
import { canAssignOrders, canCreateOrders, canGenerateInvoices, canViewAccounting } from "@/lib/permissions";
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



export function OrdersView({
  orderList,
  selectedOrder,
  user,
  onSelectOrder,
  onAssignOrder,
  onStatusChange,
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
  user: PortalUser;
  onSelectOrder: (order: Order) => void;
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
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
  const appraiserOptions = Array.from(new Set(orderList.map((order) => order.appraiser))).sort();
  const clientOptions = Array.from(new Set(orderList.map((order) => order.client))).sort();

  const filteredOrders = useMemo(() => {
    const needle = search.toLowerCase();
    return orderList
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
        if (sortBy === "Due date descending") return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [appraiserFilter, clientFilter, orderList, priorityFilter, search, sortBy, statusFilter, view]);

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
      <OrderDetailPanel
        order={selectedOrder}
        user={user}
        onAssignOrder={onAssignOrder}
        onStatusChange={onStatusChange}
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
  );
}



export function OrderDetailPanel({
  order,
  user,
  onAssignOrder,
  onStatusChange,
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
  onAssignOrder: (orderId: string, appraiserName: string, note: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
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
  const reviewComplete = order.reviewItems.filter((item) => item.complete).length;
  const showAccounting = canViewAccounting(user);
  const showAssignment = canAssignOrders(user);
  const showInvoiceAction = canGenerateInvoices(user);
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
            {showInvoiceAction && <button className="secondary-button justify-center px-2" onClick={() => onGenerateInvoice(order.id)}><ReceiptText className="h-4 w-4" /> Invoice</button>}
            <button className="secondary-button justify-center px-2"><UploadCloud className="h-4 w-4" /> Upload</button>
          </div>
        </section>

        {showAssignment && <AssignmentPanel order={order} onAssignOrder={onAssignOrder} />}
        <RequiredDocumentSummary order={order} documents={managedDocuments} rules={requiredDocumentRules} />
        <RevisionSummary order={order} revisions={revisionRequests} />

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

        <DetailSection icon={MessageSquare} title="Order Communication">
          <OrderConversationPanel
            order={order}
            user={user}
            messages={orderMessages}
            onSendMessage={onSendMessage}
            onTogglePinned={onToggleMessagePinned}
            onToggleRead={onToggleMessageRead}
          />
        </DetailSection>

        <DetailSection icon={UploadCloud} title="Documents and Uploads">
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

        <DetailSection icon={FileCheck2} title="Structured Revision Workflow">
          <RevisionWorkflowPanel
            order={order}
            revisions={revisionRequests}
            documents={managedDocuments}
            onUpdateRevisionStatus={onUpdateRevisionStatus}
            onRespondToRevisionItem={onRespondToRevisionItem}
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
