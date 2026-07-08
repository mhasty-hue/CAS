import { AlertTriangle, ChevronDown, ClipboardCheck, FileCheck2, FileText } from "lucide-react";
import { reviewers } from "@/data/demo";
import { reviewTemplates } from "@/data/platform";
import type { Order, PortalUser } from "@/types/domain";
import { canDeliverReports, canReviewReports } from "@/lib/permissions";
import { OperationalList } from "./dashboard";
import { DueChip, MetricTile, PriorityChip, SectionHeader, StatusChip, TableHeader } from "./shared";

export function ReviewView({ orderList, user, onReviewAction, onSelectOrder }: { orderList: Order[]; user: PortalUser; onReviewAction: (orderId: string, action: "return" | "approve" | "deliver") => void; onSelectOrder: (order: Order) => void }) {
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



export function CompletedReviewsView({ orderList }: { orderList: Order[] }) {
  return <OperationalList icon={FileCheck2} title="Completed Reviews" items={orderList.filter((order) => ["Ready for Delivery", "Delivered", "Completed"].includes(order.status)).map((order) => `${order.fileNumber} - ${order.borrower} - ${order.status}`)} />;
}



export function ReviewTemplatesView() {
  return <OperationalList icon={FileText} title="Revision and Comment Templates" items={reviewTemplates} />;
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
