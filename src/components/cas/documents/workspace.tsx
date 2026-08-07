import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Download, Eye, FileArchive, FileCheck2, FileSearch, History, RotateCcw, ShieldCheck, Tags, UploadCloud } from "lucide-react";
import type { DeliveryRecord, DocumentCategory, DocumentVisibility, ManagedDocument, Order, PortalUser, RequiredDocumentRule } from "@/types/domain";
import { canArchiveDocuments, canDeleteDocuments, canDownloadXML, canManageDocumentVisibility, canUploadOrderDocuments, canViewClientDocuments, canViewInternalDocuments, canViewWorkfileDocuments } from "@/lib/permissions";
import { requiredDocumentChecklist, searchableDocumentText } from "@/lib/documents/rules";
import { validateUploadFile } from "@/lib/storage/paths";
import { cn, formatDate } from "@/lib/utils";
import { DocumentStatusChip, MetricTile, SectionHeader } from "../shared";

const categoryOptions: DocumentCategory[] = [
  "Engagement letter",
  "Appraisal order",
  "Purchase contract",
  "Property information",
  "Photos",
  "Appraisal report PDF",
  "Appraisal XML",
  "ENV file",
  "Workfile",
  "Invoice",
  "Revision request",
  "Revision response",
  "Delivery receipt",
  "Other"
];

function bytesLabel(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function managedStatusTone(status: ManagedDocument["status"]) {
  return {
    Missing: "border-rose-200 bg-rose-50 text-rose-700",
    Uploaded: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Needs classification": "border-amber-200 bg-amber-50 text-amber-800",
    Superseded: "border-slate-200 bg-slate-50 text-slate-600",
    Final: "border-blue-200 bg-blue-50 text-blue-700",
    Archived: "border-slate-300 bg-slate-100 text-slate-600",
    "Failed upload": "border-red-200 bg-red-50 text-red-700"
  }[status];
}

export function ManagedDocumentChip({ status }: { status: ManagedDocument["status"] }) {
  return <span className={cn("chip", managedStatusTone(status))}>{status}</span>;
}

export function OrderDocumentWorkspace({
  order,
  user,
  documents,
  requiredRules,
  deliveryRecords,
  realUploadsEnabled,
  onUploadDocument,
  onArchiveDocument,
  onRestoreDocument,
  onReplaceDocumentVersion,
  onOpenSignedUrl,
  onSubmitReport,
  onDeliverReport
}: {
  order: Order;
  user: PortalUser;
  documents: ManagedDocument[];
  requiredRules: RequiredDocumentRule[];
  deliveryRecords: DeliveryRecord[];
  realUploadsEnabled?: boolean;
  onUploadDocument: (orderId: string, category: DocumentCategory, files?: File[], visibility?: DocumentVisibility) => void;
  onArchiveDocument: (documentId: string) => void;
  onRestoreDocument: (documentId: string) => void;
  onReplaceDocumentVersion: (documentId: string, files?: File[]) => void;
  onOpenSignedUrl?: (documentId: string, versionId?: string) => void;
  onSubmitReport: (orderId: string) => void;
  onDeliverReport: (orderId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [visibilityFilter, setVisibilityFilter] = useState("All visibility");
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("Appraisal report PDF");
  const [selectedVisibility, setSelectedVisibility] = useState<DocumentVisibility>("Organization internal");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const canUpload = canUploadOrderDocuments(user);
  const canArchive = canArchiveDocuments(user);
  const canDelete = canDeleteDocuments(user);
  const canManageVisibility = canManageDocumentVisibility(user);
  const checklist = requiredDocumentChecklist(order, documents, requiredRules);
  const visibleDocuments = useMemo(() => {
    const needle = search.toLowerCase();
    return documents
      .filter((document) => document.orderId === order.id)
      .filter((document) => canViewInternalDocuments(user) || document.visibility !== "Organization internal")
      .filter((document) => canViewClientDocuments(user) || document.visibility !== "Lender/client")
      .filter((document) => canViewWorkfileDocuments(user) || document.category !== "Workfile")
      .filter((document) => canDownloadXML(user) || document.category !== "Appraisal XML")
      .filter((document) => categoryFilter === "All categories" || document.category === categoryFilter)
      .filter((document) => visibilityFilter === "All visibility" || document.visibility === visibilityFilter)
      .filter((document) => searchableDocumentText(document).includes(needle))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [categoryFilter, documents, order.id, search, user, visibilityFilter]);
  const validations = selectedFiles.length
    ? selectedFiles.map((file) => validateUploadFile(file.name, file.size, file.type))
    : [validateUploadFile(selectedCategory === "Appraisal XML" ? "demo-upload.xml" : "demo-upload.pdf", 480000)];
  const validation = validations.find((item) => !item.ok) ?? validations[0];
  const currentDelivery = deliveryRecords.find((delivery) => delivery.orderId === order.id);
  const uploadDisabled = !canUpload || !validation.ok || Boolean(realUploadsEnabled && !selectedFiles.length);

  function addFiles(files: FileList | File[]) {
    setSelectedFiles(Array.from(files));
  }

  return (
    <div className="grid gap-4">
      <div
        className="rounded-md border border-dashed border-brand-200 bg-brand-50 p-4"
        onDragOver={(event) => {
          if (!realUploadsEnabled) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!realUploadsEnabled) return;
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <UploadCloud className="h-4 w-4" />
              Secure upload workspace
            </div>
            <p className="mt-1 text-sm text-brand-800">
              {realUploadsEnabled
                ? "Drop files here or browse. CAS stores bytes in private Supabase Storage and keeps metadata, versions, and downloads permission controlled."
                : "Files stay private by default. Demo mode creates fictional upload metadata without using production storage."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="control h-9" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as DocumentCategory)}>
              {categoryOptions.map((category) => <option key={category}>{category}</option>)}
            </select>
            {realUploadsEnabled && (
              <select className="control h-9" value={selectedVisibility} onChange={(event) => setSelectedVisibility(event.target.value as DocumentVisibility)}>
                <option>Organization internal</option>
                <option>Assigned appraiser</option>
                <option>Reviewer</option>
                <option>Lender/client</option>
              </select>
            )}
            {realUploadsEnabled && (
              <label className="secondary-button h-9 cursor-pointer">
                <UploadCloud className="h-4 w-4" />
                Browse
                <input className="hidden" type="file" multiple onChange={(event) => addFiles(event.target.files ?? [])} />
              </label>
            )}
            <button
              className="primary-button disabled:opacity-50"
              disabled={uploadDisabled}
              onClick={() => {
                onUploadDocument(order.id, selectedCategory, selectedFiles, selectedVisibility);
                if (realUploadsEnabled) setSelectedFiles([]);
              }}
            >
              <UploadCloud className="h-4 w-4" />
              {realUploadsEnabled ? "Upload" : "Simulate upload"}
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-brand-700">
          <div>{validation.message}</div>
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedFiles.map((file) => (
                <span key={`${file.name}-${file.size}`} className="rounded-full border border-brand-200 bg-white px-2 py-1">
                  {file.name} - {bytesLabel(file.size)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <MetricTile label="Uploaded" value={String(visibleDocuments.filter((document) => document.status !== "Missing").length)} />
        <MetricTile label="Missing required" value={String(checklist.filter((item) => item.status === "Missing").length)} />
        <MetricTile label="Final files" value={String(visibleDocuments.filter((document) => document.status === "Final").length)} />
        <MetricTile label="Archived" value={String(visibleDocuments.filter((document) => document.status === "Archived").length)} />
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_190px_190px]">
        <div className="relative">
          <FileSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="control w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search file name, category, tag, description" />
        </div>
        <select className="control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option>All categories</option>
          {categoryOptions.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select className="control" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)}>
          <option>All visibility</option>
          <option>Organization internal</option>
          <option>Assigned appraiser</option>
          <option>Reviewer</option>
          <option>Lender/client</option>
          <option>Delivery recipient</option>
        </select>
      </div>

      <section className="rounded-md border border-line p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <FileCheck2 className="h-4 w-4 text-brand-600" />
          Required document checklist
        </div>
        <div className="mt-3 grid gap-2">
          {checklist.length ? checklist.map((item) => (
            <div key={item.rule.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
              <span>{item.rule.label}</span>
              <span className={cn("chip", item.status === "Uploaded" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>{item.status}</span>
            </div>
          )) : <div className="rounded-md border border-dashed border-line p-3 text-sm text-slate-500">No matching required-document rules for this order.</div>}
        </div>
      </section>

      <div className="grid gap-3">
        {visibleDocuments.map((document) => (
          <div key={document.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{document.displayName}</span>
                  <ManagedDocumentChip status={document.status} />
                  <span className="chip border-slate-200 bg-slate-50 text-slate-600">v{document.versionNumber}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{document.category} - {document.fileName} - {bytesLabel(document.fileSizeBytes)}</div>
                <div className="mt-2 text-slate-600">{document.description}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {document.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"><Tags className="mr-1 inline h-3 w-3" />{tag}</span>)}
                </div>
                <div className="mt-2 text-xs text-slate-500">{document.visibility} - {document.source} - uploaded {formatDate(document.uploadedAt)} by {document.uploaderName}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="secondary-button h-8 px-2 text-xs" onClick={() => onOpenSignedUrl?.(document.id)}><Eye className="h-4 w-4" /> Preview</button>
                <button className="secondary-button h-8 px-2 text-xs" onClick={() => onOpenSignedUrl?.(document.id)}><Download className="h-4 w-4" /> Signed URL</button>
                {realUploadsEnabled ? (
                  <label className="secondary-button h-8 cursor-pointer px-2 text-xs">
                    <History className="h-4 w-4" />
                    New version
                    <input className="hidden" type="file" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onReplaceDocumentVersion(document.id, [file]);
                      event.currentTarget.value = "";
                    }} />
                  </label>
                ) : (
                  <button className="secondary-button h-8 px-2 text-xs" onClick={() => onReplaceDocumentVersion(document.id)}><History className="h-4 w-4" /> New version</button>
                )}
                {document.status === "Archived" ? (
                  <button className="secondary-button h-8 px-2 text-xs" onClick={() => onRestoreDocument(document.id)}><RotateCcw className="h-4 w-4" /> Restore</button>
                ) : (
                  <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canArchive} onClick={() => onArchiveDocument(document.id)}><Archive className="h-4 w-4" /> Archive</button>
                )}
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
              <span>Path: {document.storagePath}</span>
              <span>Scan: {document.auditMetadata.virusScanStatus}</span>
              <span>Duplicate: {document.auditMetadata.duplicateDetection}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">Secure download link will be generated when the file is opened.</div>
            {document.versions.length > 0 && (
              <details className="mt-3 rounded-md border border-line bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">Version history</summary>
                <div className="mt-2 space-y-2">
                  {document.versions.map((version) => <div key={version.id} className="text-xs text-slate-600">v{version.versionNumber} - {version.fileName} - {version.uploadedAt} - {version.changeNote ?? "No note"}</div>)}
                </div>
              </details>
            )}
            {!canManageVisibility && document.visibility === "Organization internal" && <div className="mt-2 text-xs text-amber-700">Visibility changes require document-management permission.</div>}
            {canDelete && <div className="mt-2 text-xs text-slate-400">Delete is permission-gated and intentionally not destructive in demo mode.</div>}
          </div>
        ))}
      </div>

      <section className="rounded-md border border-line p-3">
        <SectionHeader icon={FileArchive} title="Submission and Delivery" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line p-3 text-sm">
            <div className="font-semibold text-slate-900">Final report submission</div>
            <p className="mt-1 text-slate-600">Requires report PDF and XML. ENV and invoice are optional by client/product rules.</p>
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" defaultChecked /> Appraiser certifies required files are included.</label>
            <button className="primary-button mt-3 w-full justify-center" onClick={() => onSubmitReport(order.id)}><CheckCircle2 className="h-4 w-4" /> Submit to review</button>
          </div>
          <div className="rounded-md border border-line p-3 text-sm">
            <div className="font-semibold text-slate-900">Secure delivery</div>
            <p className="mt-1 text-slate-600">Only delivery-safe report files are included. Internal notes, workfiles, and payout documents are excluded.</p>
            <div className="mt-2 text-xs text-slate-500">Current: {currentDelivery?.status ?? "No delivery record"}</div>
            <button className="secondary-button mt-3 w-full justify-center" onClick={() => onDeliverReport(order.id)}><ShieldCheck className="h-4 w-4" /> Deliver report</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RequiredDocumentSummary({ order, documents, rules }: { order: Order; documents: ManagedDocument[]; rules: RequiredDocumentRule[] }) {
  const checklist = requiredDocumentChecklist(order, documents, rules);
  const missing = checklist.filter((item) => item.status === "Missing");

  return (
    <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-900">Required documents</span>
        <DocumentStatusChip status={missing.length ? "Missing" : "Ready"} />
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {missing.length ? missing.map((item) => item.rule.category).join(", ") : "All matching requirements are satisfied."}
      </div>
    </div>
  );
}
