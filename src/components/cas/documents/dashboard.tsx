import { AlertTriangle, Archive, CheckCircle2, Clock3, FileSearch, ShieldCheck, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DeliveryRecord, DocumentAuditEvent, ManagedDocument, Order, PortalUser, ReportSubmission, RequiredDocumentRule, VendorDocument } from "@/types/domain";
import { requiredDocumentChecklist } from "@/lib/documents/rules";
import { canViewVendorComplianceDocuments } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { MetricTile, SectionHeader } from "../shared";
import { ManagedDocumentChip } from "./workspace";

export function DocumentsDashboard({
  user,
  orderList,
  documents,
  requiredRules,
  vendorDocuments,
  reportSubmissions,
  deliveryRecords,
  auditEvents
}: {
  user: PortalUser;
  orderList: Order[];
  documents: ManagedDocument[];
  requiredRules: RequiredDocumentRule[];
  vendorDocuments: VendorDocument[];
  reportSubmissions: ReportSubmission[];
  deliveryRecords: DeliveryRecord[];
  auditEvents: DocumentAuditEvent[];
}) {
  const scopedOrderIds = new Set(orderList.map((order) => order.id));
  const orderDocuments = documents.filter((document) => !document.orderId || scopedOrderIds.has(document.orderId));
  const recent = [...orderDocuments].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 6);
  const missingOrderRequirements = orderList.flatMap((order) =>
    requiredDocumentChecklist(order, documents, requiredRules)
      .filter((item) => item.status === "Missing")
      .map((item) => `${order.fileNumber} (${order.appraiser}): ${item.rule.category}`)
  );
  const reportsAwaitingReview = orderDocuments.filter((document) => document.category === "Appraisal report PDF" && document.visibility === "Reviewer");
  const finalReportsAwaitingDelivery = orderDocuments.filter((document) => document.category === "Appraisal report PDF" && document.status === "Final");
  const submittedReports = reportSubmissions.filter((submission) => scopedOrderIds.has(submission.orderId));
  const deliveredReports = deliveryRecords.filter((delivery) => scopedOrderIds.has(delivery.orderId));
  const recentAudit = auditEvents.filter((event) => !event.orderId || scopedOrderIds.has(event.orderId)).slice(0, 6);
  const failedUploads = orderDocuments.filter((document) => document.status === "Failed upload");
  const needsClassification = orderDocuments.filter((document) => document.status === "Needs classification");
  const appraiserDocsNeeded = user.appraiserName ? missingOrderRequirements.filter((item) => item.includes(user.appraiserName ?? "")) : missingOrderRequirements;
  const vendorCompliance = canViewVendorComplianceDocuments(user) ? vendorDocuments.filter((document) => document.status !== "Approved") : [];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-5">
        <div className="panel p-5">
          <SectionHeader icon={Archive} title="Documents Command Center" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Recently uploaded" value={String(recent.length)} />
            <MetricTile label="Missing required" value={String(missingOrderRequirements.length)} />
            <MetricTile label="Reports submitted" value={String(submittedReports.length)} />
            <MetricTile label="Deliveries logged" value={String(deliveredReports.length)} />
          </div>
        </div>

        <div className="panel p-5">
          <SectionHeader icon={UploadCloud} title="Recently Uploaded" />
          <div className="mt-4 grid gap-3">
            {recent.map((document) => (
              <div key={document.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{document.displayName}</div>
                    <div className="mt-1 text-xs text-slate-500">{document.category} - {formatDate(document.uploadedAt)} - {document.uploaderName}</div>
                  </div>
                  <ManagedDocumentChip status={document.status} />
                </div>
                <div className="mt-2 text-xs text-slate-500">{document.visibility} - {document.storagePath}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-5">
        <DashboardList icon={AlertTriangle} title="Missing Requirements" items={user.appraiserName ? appraiserDocsNeeded : missingOrderRequirements} empty="No missing required documents in this view." />
        <DashboardList icon={Clock3} title="Reports Awaiting Review" items={reportsAwaitingReview.map((document) => document.displayName)} empty="No reports waiting on review." />
        <DashboardList icon={CheckCircle2} title="Final Reports Awaiting Delivery" items={finalReportsAwaitingDelivery.map((document) => document.displayName)} empty="No final delivery queue." />
        <DashboardList icon={Archive} title="Recent Document Audit" items={recentAudit.map((event) => `${event.event}: ${event.detail}`)} empty="No document audit events yet." />
        <DashboardList icon={FileSearch} title="Needs Classification" items={needsClassification.map((document) => document.displayName)} empty="No documents need classification." />
        <DashboardList icon={ShieldCheck} title="Vendor Compliance" items={vendorCompliance.map((document) => `${document.vendorId}: ${document.type} ${document.status}`)} empty="No visible vendor compliance exceptions." />
        <DashboardList icon={AlertTriangle} title="Failed Uploads" items={failedUploads.map((document) => document.displayName)} empty="No failed uploads." />
      </aside>
    </section>
  );
}

function DashboardList({ icon: Icon, title, items, empty }: { icon: LucideIcon; title: string; items: string[]; empty: string }) {
  return (
    <div className="panel p-5">
      <SectionHeader icon={Icon} title={title} />
      <div className="mt-4 grid gap-2">
        {(items.length ? items : [empty]).slice(0, 6).map((item) => (
          <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>
        ))}
      </div>
    </div>
  );
}
