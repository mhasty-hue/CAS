import type { DocumentCategory, DocumentSource, DocumentVisibility, ManagedDocument, ManagedDocumentStatus } from "@/types/domain";
import type { DocumentAuditEventRow, DocumentRow, DocumentVersionRow, ReportDeliveryRow, ReportSubmissionRow, RequiredDocumentRuleRow } from "@/types/database";
import type { DeliveryRecord, DocumentAuditEvent, ReportSubmission, RequiredDocumentRule } from "@/types/domain";

function asCategory(value: string | null | undefined): DocumentCategory {
  const categories: DocumentCategory[] = [
    "Engagement letter",
    "Appraisal order",
    "Purchase contract",
    "Amendments",
    "Disclosures",
    "Property information",
    "Comparable data",
    "Photos",
    "Sketch",
    "Map",
    "Appraisal report PDF",
    "Appraisal XML",
    "UAD 3.6 data package",
    "UCDP submission",
    "UCDP findings",
    "ENV file",
    "Workfile",
    "Invoice",
    "W-9",
    "E&O insurance",
    "Appraiser license",
    "Company license",
    "Revision request",
    "Revision response",
    "Delivery receipt",
    "Other"
  ];
  return categories.includes(value as DocumentCategory) ? (value as DocumentCategory) : "Other";
}

function asVisibility(value: string | null | undefined): DocumentVisibility {
  const visibility: DocumentVisibility[] = [
    "Organization internal",
    "Assigned appraiser",
    "Reviewer",
    "AMC",
    "Lender/client",
    "Vendor",
    "Public requester",
    "Delivery recipient"
  ];
  return visibility.includes(value as DocumentVisibility) ? (value as DocumentVisibility) : "Organization internal";
}

function asSource(value: string | null | undefined): DocumentSource {
  const sources: DocumentSource[] = [
    "Internal staff upload",
    "Appraiser upload",
    "Reviewer upload",
    "Client/lender upload",
    "AMC upload",
    "Public order upload",
    "LOS import",
    "System generated",
    "Email ingestion placeholder"
  ];
  return sources.includes(value as DocumentSource) ? (value as DocumentSource) : "Internal staff upload";
}

function asStatus(value: string | null | undefined): ManagedDocumentStatus {
  const statuses: ManagedDocumentStatus[] = ["Missing", "Uploaded", "Needs classification", "Superseded", "Final", "Archived", "Failed upload"];
  return statuses.includes(value as ManagedDocumentStatus) ? (value as ManagedDocumentStatus) : "Uploaded";
}

function asVirusScanStatus(value: string | null | undefined): ManagedDocument["auditMetadata"]["virusScanStatus"] {
  if (value === "Passed" || value === "Failed" || value === "Not scanned" || value === "Queued") return value;
  if (value === "Clean") return "Passed";
  if (value === "Rejected") return "Failed";
  return "Queued";
}

function asDuplicateStatus(value: string | null | undefined): ManagedDocument["auditMetadata"]["duplicateDetection"] {
  return value === "Unique" || value === "Possible duplicate" || value === "Not checked" ? value : "Not checked";
}

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function auditString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function auditMetadata(row: DocumentRow) {
  const metadata = jsonRecord(row.audit_metadata);
  return {
    createdBy: auditString(metadata.createdBy, row.uploaded_by ?? "CAS"),
    lastAction: auditString(metadata.lastAction, row.status),
    lastActionAt: auditString(metadata.lastActionAt, row.updated_at ?? row.created_at),
    virusScanStatus: asVirusScanStatus(row.virus_scan_status),
    duplicateDetection: asDuplicateStatus(row.duplicate_detection)
  };
}

export function mapManagedDocument(row: DocumentRow, versions: DocumentVersionRow[] = []): ManagedDocument {
  const documentVersions = versions
    .filter((version) => version.document_id === row.id)
    .sort((a, b) => b.version_number - a.version_number)
    .map((version) => ({
      id: version.id,
      documentId: version.document_id,
      versionNumber: version.version_number,
      fileName: version.file_name,
      storagePath: version.storage_path,
      uploadedBy: version.uploaded_by_name ?? row.uploaded_by ?? "CAS",
      uploadedAt: version.uploaded_at,
      checksum: version.checksum ?? undefined,
      changeNote: version.change_note ?? undefined
    }));

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id ?? undefined,
    vendorId: row.vendor_profile_id ?? undefined,
    uploaderId: row.uploaded_by ?? "system",
    uploaderName: documentVersions[0]?.uploadedBy ?? row.uploaded_by ?? "CAS",
    category: asCategory(row.category ?? row.document_type),
    fileName: row.name,
    displayName: row.display_name ?? row.name,
    fileType: row.content_type ?? "application/octet-stream",
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    storagePath: row.storage_path,
    versionNumber: row.version_number,
    parentDocumentId: row.parent_document_id ?? undefined,
    visibility: asVisibility(row.visibility),
    source: asSource(row.source),
    uploadedAt: row.created_at,
    description: row.description ?? "",
    tags: row.tags ?? textArray(jsonRecord(row.metadata).tags),
    status: row.archived_at ? "Archived" : asStatus(row.status),
    checksum: row.checksum ?? undefined,
    auditMetadata: auditMetadata(row),
    versions: documentVersions
  };
}

export function mapReportSubmission(row: ReportSubmissionRow): ReportSubmission {
  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id,
    submittedBy: row.submitted_by_name ?? row.submitted_by ?? "CAS",
    submittedAt: row.submitted_at,
    reportPdfDocumentId: row.report_pdf_document_id ?? undefined,
    xmlDocumentId: row.xml_document_id ?? undefined,
    envDocumentId: row.env_document_id ?? undefined,
    invoiceDocumentId: row.invoice_document_id ?? undefined,
    supportingDocumentIds: row.supporting_document_ids,
    submissionNote: row.submission_note ?? "",
    certificationAccepted: row.certification_accepted,
    status: row.status === "Draft" || row.status === "Returned" || row.status === "Approved" ? row.status : "Submitted"
  };
}

export function mapDeliveryRecord(row: ReportDeliveryRow): DeliveryRecord {
  const metadata = jsonRecord(row.metadata);
  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email ?? "",
    fileIds: row.included_document_ids,
    deliveryNote: typeof metadata.deliveryNote === "string" ? metadata.deliveryNote : "Secure delivery created.",
    secureLink: row.secure_delivery_url ?? "",
    deliveredAt: row.delivered_at,
    status: row.status === "Ready" || row.status === "Viewed" || row.status === "Expired" || row.status === "Failed" ? row.status : "Delivered",
    deliveryReceiptDocumentId: undefined,
    losHookStatus: "Not configured",
    emailHookStatus: "Development log"
  };
}

export function mapDocumentAuditEvent(row: DocumentAuditEventRow): DocumentAuditEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id ?? undefined,
    documentId: row.document_id ?? undefined,
    messageId: row.message_id ?? undefined,
    revisionId: row.revision_id ?? undefined,
    event: row.event as DocumentAuditEvent["event"],
    actor: row.actor_name,
    at: row.created_at,
    detail: row.detail
  };
}

export function mapRequiredDocumentRule(row: RequiredDocumentRuleRow): RequiredDocumentRule {
  return {
    id: row.id,
    organizationId: row.organization_id ?? "default",
    productType: row.product_type ?? undefined,
    client: undefined,
    workflowStage: "Intake",
    category: asCategory(row.category),
    label: row.label,
    required: row.required
  };
}
