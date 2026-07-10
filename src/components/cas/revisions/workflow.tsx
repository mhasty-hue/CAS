import { AlertTriangle, CheckCircle2, Clock3, FileText, MessageSquare, RefreshCcw } from "lucide-react";
import type { ManagedDocument, Order, RevisionRequest, RevisionStatus } from "@/types/domain";
import { cn } from "@/lib/utils";
import { SectionHeader } from "../shared";

const statusTone: Record<RevisionStatus, string> = {
  New: "border-blue-200 bg-blue-50 text-blue-700",
  Assigned: "border-indigo-200 bg-indigo-50 text-indigo-700",
  "In Progress": "border-amber-200 bg-amber-50 text-amber-800",
  "Response Submitted": "border-purple-200 bg-purple-50 text-purple-700",
  "Reviewer Follow-Up": "border-orange-200 bg-orange-50 text-orange-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Closed: "border-slate-200 bg-slate-50 text-slate-600",
  "Rejected/Clarification Needed": "border-rose-200 bg-rose-50 text-rose-700"
};

export function RevisionWorkflowPanel({
  order,
  revisions,
  documents,
  onUpdateRevisionStatus,
  onRespondToRevisionItem
}: {
  order: Order;
  revisions: RevisionRequest[];
  documents: ManagedDocument[];
  onUpdateRevisionStatus: (revisionId: string, status: RevisionStatus) => void;
  onRespondToRevisionItem: (revisionId: string, itemId: string) => void;
}) {
  const scopedRevisions = revisions.filter((revision) => revision.orderId === order.id);

  if (!scopedRevisions.length) {
    return <div className="rounded-md border border-dashed border-line p-3 text-sm text-slate-500">No structured revision requests for this order.</div>;
  }

  return (
    <div className="grid gap-4">
      {scopedRevisions.map((revision) => {
        const completed = revision.items.filter((item) => item.completed).length;
        const relatedDocuments = documents.filter((document) => revision.items.some((item) => item.relatedDocumentId === document.id));
        return (
          <section key={revision.id} className="rounded-md border border-line p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{revision.category}</span>
                  <span className={cn("chip", statusTone[revision.status])}>{revision.status}</span>
                  <span className="chip border-amber-200 bg-amber-50 text-amber-800">{revision.priority}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{revision.source} request from {revision.requestor} - due {revision.dueDate}</div>
              </div>
              <select className="control h-9" value={revision.status} onChange={(event) => onUpdateRevisionStatus(revision.id, event.target.value as RevisionStatus)}>
                {Object.keys(statusTone).map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Client-visible wording</div>
                <p className="mt-1 text-slate-700">{revision.clientVisibleWording}</p>
              </div>
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Internal reviewer wording</div>
                <p className="mt-1 text-slate-700">{revision.internalReviewerWording}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {revision.items.map((item) => (
                <div key={item.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium text-slate-900">{item.label}</div>
                    <div className="flex flex-wrap gap-2">
                      <span className={cn("chip", item.completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{item.completed ? "Complete" : "Open"}</span>
                      <span className={cn("chip", item.reviewerApproved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{item.reviewerApproved ? "Reviewer approved" : "Needs approval"}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{item.relatedPageSection}</div>
                  <div className="mt-2 rounded-md bg-slate-50 p-2 text-slate-600">{item.response || "No appraiser response yet."}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="secondary-button h-8 px-2 text-xs" onClick={() => onRespondToRevisionItem(revision.id, item.id)}><RefreshCcw className="h-4 w-4" /> Add response</button>
                    <button className="secondary-button h-8 px-2 text-xs"><MessageSquare className="h-4 w-4" /> Thread</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
              <span><CheckCircle2 className="mr-1 inline h-3 w-3" />{completed}/{revision.items.length} items complete</span>
              <span><FileText className="mr-1 inline h-3 w-3" />{relatedDocuments.length} related documents</span>
              <span><Clock3 className="mr-1 inline h-3 w-3" />Full audit history retained</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function RevisionSummary({ order, revisions }: { order: Order; revisions: RevisionRequest[] }) {
  const open = revisions.filter((revision) => revision.orderId === order.id && !["Closed", "Approved"].includes(revision.status));

  return (
    <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
      <SectionHeader icon={AlertTriangle} title="Structured Revisions" />
      <div className="mt-2 text-xs text-slate-500">
        {open.length ? `${open.length} open structured revision request${open.length === 1 ? "" : "s"}.` : "No open structured revision requests."}
      </div>
    </div>
  );
}
