import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardCheck, FileCheck2, FileText, MessageSquare, Send, X } from "lucide-react";
import { reviewers } from "@/data/demo";
import { reviewTemplates } from "@/data/platform";
import type { Order, PortalUser } from "@/types/domain";
import { canDeliverReports, canReviewReports } from "@/lib/permissions";
import { OperationalList } from "./dashboard";
import { DueChip, InfoRow, ListOrEmpty, MetricTile, PriorityChip, SectionHeader, StatusChip, TableHeader } from "./shared";
import { cn } from "@/lib/utils";

export function ReviewView({
  orderList,
  user,
  onReviewAction,
  onCompleteReviewItem,
  onReviewerComment
}: {
  orderList: Order[];
  user: PortalUser;
  onReviewAction: (orderId: string, action: "return" | "approve" | "deliver") => void;
  onCompleteReviewItem: (orderId: string, label: string) => void;
  onReviewerComment: (orderId: string) => void;
}) {
  const reviewOrders = orderList.filter((order) => ["Submitted", "In Review", "Revisions Needed", "Ready for Delivery"].includes(order.status));
  const openFindings = reviewOrders.flatMap((order) => order.reviewItems.filter((item) => !item.complete).map((item) => ({ order, item }))).slice(0, 6);
  const canReview = canReviewReports(user);
  const canDeliver = canDeliverReports(user);
  const [selectedOrderId, setSelectedOrderId] = useState(reviewOrders[0]?.id ?? "");
  const selectedOrder = reviewOrders.find((order) => order.id === selectedOrderId) ?? null;

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedOrderId("");
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  if (!canReview && !canDeliver) {
    return (
      <section className="panel p-5">
        <SectionHeader icon={ClipboardCheck} title="Review Queue" />
        <div className="mt-4 rounded-md border border-dashed border-line px-4 py-6 text-sm text-slate-500">
          Your current role can view operational status but cannot perform review actions.
        </div>
      </section>
    );
  }

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
                <tr key={order.id} className={cn("cursor-pointer hover:bg-slate-50", selectedOrderId === order.id && "bg-brand-50/60")} onClick={() => setSelectedOrderId(order.id)}>
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
            <button key={`${order.id}-${item.category}-${item.label}`} className="w-full rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setSelectedOrderId(order.id)}>
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
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm" onMouseDown={() => setSelectedOrderId("")}>
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[680px] justify-end sm:p-3" onMouseDown={(event) => event.stopPropagation()}>
            <aside className="panel h-full w-full overflow-hidden shadow-2xl sm:rounded-lg">
              <div className="border-b border-line p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-950">{selectedOrder.fileNumber}</span>
                      <StatusChip status={selectedOrder.status} />
                      <PriorityChip priority={selectedOrder.priority} />
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">Review assignment</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedOrder.borrower} - {selectedOrder.productType} - {selectedOrder.appraiser}</p>
                  </div>
                  <button className="icon-button" aria-label="Close review drawer" onClick={() => setSelectedOrderId("")}><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid max-h-[calc(100vh-6rem)] gap-5 overflow-y-auto p-5">
                <div className="grid gap-2 text-sm">
                  <InfoRow label="Report standard" value={selectedOrder.reportMetadata?.reportSchemaVersion ?? "Legacy/report standard pending"} />
                  <InfoRow label="Submission format" value={selectedOrder.reportMetadata?.submissionFormat.join(", ") ?? "PDF/XML pending"} />
                  <InfoRow label="Due date" value={selectedOrder.dueDate} />
                  <InfoRow label="UCDP status" value={selectedOrder.reportMetadata?.ucdpSubmissionStatus ?? "Not configured"} />
                </div>
                <section>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-brand-600" />
                    <h3 className="text-sm font-semibold text-slate-950">Checklist</h3>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {(selectedOrder.reviewItems.length ? selectedOrder.reviewItems : [{ label: "Open review shell", category: "Review", complete: false }]).map((item) => (
                      <div key={`${item.category}-${item.label}`} className="rounded-md border border-line px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{item.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.category}</div>
                          </div>
                          <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={item.complete || !canReview} onClick={() => onCompleteReviewItem(selectedOrder.id, item.label)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {item.complete ? "Done" : "Complete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-600" />
                    <h3 className="text-sm font-semibold text-slate-950">Documents and Versions</h3>
                  </div>
                  <div className="mt-3">
                    <ListOrEmpty
                      empty="No review documents attached yet."
                      items={selectedOrder.documentsList.map((document) => `${document.name} - ${document.status} - ${document.uploadedAt}`)}
                    />
                  </div>
                </section>
                <section>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-brand-600" />
                    <h3 className="text-sm font-semibold text-slate-950">Reviewer Comments and Revision Controls</h3>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="secondary-button disabled:opacity-50" disabled={!canReview} onClick={() => onReviewerComment(selectedOrder.id)}><MessageSquare className="h-4 w-4" /> Add reviewer comment</button>
                    <button className="secondary-button disabled:opacity-50" disabled={!canReview} onClick={() => onReviewAction(selectedOrder.id, "return")}><AlertTriangle className="h-4 w-4" /> Create revision request</button>
                    <button className="secondary-button disabled:opacity-50" disabled={!canReview} onClick={() => onReviewAction(selectedOrder.id, "approve")}><CheckCircle2 className="h-4 w-4" /> Approve</button>
                    <button className="primary-button disabled:opacity-50" disabled={!canDeliver} onClick={() => onReviewAction(selectedOrder.id, "deliver")}><Send className="h-4 w-4" /> Ready for delivery</button>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}



export function CompletedReviewsView({ orderList }: { orderList: Order[] }) {
  return <OperationalList icon={FileCheck2} title="Completed Reviews" items={orderList.filter((order) => ["Ready for Delivery", "Delivered", "Completed"].includes(order.status)).map((order) => `${order.fileNumber} - ${order.borrower} - ${order.status}`)} />;
}



export function ReviewTemplatesView() {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <OperationalList icon={FileText} title="Revision and Comment Templates" items={reviewTemplates} />
      <aside className="panel p-5">
        <SectionHeader icon={ClipboardCheck} title="UAD Settings Readiness" />
        <div className="mt-4 grid gap-2 text-sm">
          {["Legacy conventional", "FHA", "VA", "UAD 3.6 URAR", "Non-lending/private"].map((template) => (
            <div key={template} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
              <span>{template}</span>
              <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">Template ready</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}



export function RevisionsView({ orderList, onSelectOrder }: { orderList: Order[]; onSelectOrder: (order: Order) => void }) {
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
