import type { DocumentCategory, ManagedDocument, Organization, Order, PortalUser, VendorProfile } from "@/types/domain";

export const privateDocumentBucket = "cas-private-documents";
export const publicOrderUploadBucket = "public-order-uploads";
export const maxPrivateUploadBytes = 50 * 1024 * 1024;
export const maxReportUploadBytes = 100 * 1024 * 1024;
export const maxPublicIntakeUploadBytes = 25 * 1024 * 1024;

export const allowedUploadExtensions = [
  ".pdf",
  ".xml",
  ".env",
  ".jpg",
  ".jpeg",
  ".png",
  ".docx",
  ".xlsx",
  ".xls",
  ".csv",
  ".zip"
];

export const allowedUploadMimeTypes = [
  "application/pdf",
  "application/xml",
  "text/xml",
  "text/plain",
  "image/jpeg",
  "image/png",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

const blockedExtensions = [".exe", ".bat", ".cmd", ".com", ".js", ".mjs", ".ps1", ".sh", ".vbs", ".scr", ".msi", ".html", ".htm", ".svg"];

export type StoragePathInput = {
  organizationId: string;
  orderId: string;
  documentId: string;
  versionNumber: number;
  safeFileName: string;
};

export function buildOrderDocumentPath(organizationId: string, orderId: string, fileName: string) {
  return `organizations/${organizationId}/orders/${orderId}/documents/${fileName}`;
}

export function buildProductionOrderDocumentPath({
  organizationId,
  orderId,
  documentId,
  versionNumber,
  safeFileName
}: StoragePathInput) {
  return `organizations/${organizationId}/orders/${orderId}/documents/${documentId}/versions/${versionNumber}/${safeFileName}`;
}

export function buildReportVersionPath({
  organizationId,
  orderId,
  documentId,
  versionNumber,
  safeFileName
}: StoragePathInput) {
  return `organizations/${organizationId}/orders/${orderId}/reports/${documentId}/v${versionNumber}/${safeFileName}`;
}

export function buildVendorCompliancePath(organizationId: string, vendorId: string, fileName: string) {
  return `organizations/${organizationId}/vendors/${vendorId}/compliance/${fileName}`;
}

export function buildProductionVendorCompliancePath(organizationId: string, vendorId: string, documentId: string, versionNumber: number, safeFileName: string) {
  return `organizations/${organizationId}/vendors/${vendorId}/compliance/${documentId}/versions/${versionNumber}/${safeFileName}`;
}

export function buildPublicIntakeUploadPath(intakeSessionId: string, uploadId: string, safeFileName: string) {
  return `intake/${intakeSessionId}/${uploadId}/${safeFileName}`;
}

export function buildInvoicePath(organizationId: string, fileName: string) {
  return `organizations/${organizationId}/invoices/${fileName}`;
}

export function buildUserProfilePath(organizationId: string, userId: string, fileName: string) {
  return `organizations/${organizationId}/users/${userId}/profile/${fileName}`;
}

export function getFileExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  const index = lower.lastIndexOf(".");
  return index >= 0 ? lower.slice(index) : "";
}

export function normalizedUploadContentType(fileName: string, contentType = "") {
  const lowerContentType = contentType.toLowerCase();
  if (allowedUploadMimeTypes.includes(lowerContentType)) return lowerContentType;

  const extension = getFileExtension(fileName);
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".xml") return "application/xml";
  if (extension === ".env") return "text/plain";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".csv") return "text/csv";
  if (extension === ".xls") return "application/vnd.ms-excel";
  if (extension === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".zip") return "application/zip";
  return "application/octet-stream";
}

export function sanitizeStorageFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? "upload";
  const withoutControlChars = baseName.replace(/[\u0000-\u001f\u007f]+/g, "");
  const normalized = withoutControlChars.normalize("NFKD").replace(/[^\w.\- ]+/g, "");
  const compact = normalized.trim().replace(/\s+/g, "-").replace(/-+/g, "-");
  const safeName = compact.replace(/\.\.+/g, ".").replace(/^\.*/, "").slice(0, 120);
  return safeName || "cas-upload";
}

export function validateUploadFile(fileName: string, sizeBytes: number, contentType = "", maxBytes = maxPrivateUploadBytes) {
  const extension = getFileExtension(fileName);
  const lowerContentType = contentType.toLowerCase();
  const normalizedContentType = normalizedUploadContentType(fileName, contentType);
  const extensionAllowed = allowedUploadExtensions.includes(extension);
  const mimeAllowed = !lowerContentType || allowedUploadMimeTypes.includes(lowerContentType) || (lowerContentType === "application/octet-stream" && allowedUploadMimeTypes.includes(normalizedContentType));
  const blocked = blockedExtensions.includes(extension);

  if (!sizeBytes) return { ok: false, message: "File is empty. Choose the original document and try again." };
  if (blocked) return { ok: false, message: "This file type is blocked for security reasons." };
  if (!extensionAllowed) return { ok: false, message: "File type is not allowed for appraisal document upload." };
  if (!mimeAllowed) return { ok: false, message: "The file content type does not match an allowed CAS upload type." };
  if (sizeBytes > maxBytes) return { ok: false, message: `File is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB upload limit.` };
  return { ok: true, message: "File is ready for secure upload." };
}

export function isReportCategory(category: DocumentCategory) {
  return ["Appraisal report PDF", "Appraisal XML", "UAD 3.6 data package", "ENV file"].includes(category);
}

export function categoryForFileName(fileName: string): DocumentCategory {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xml")) return "Appraisal XML";
  if (lower.endsWith(".env")) return "ENV file";
  if (lower.endsWith(".zip")) return "UAD 3.6 data package";
  return "Appraisal report PDF";
}

export function createSignedUrlPlaceholder(document: ManagedDocument) {
  return `/api/storage/signed-url?document=${encodeURIComponent(document.id)}`;
}

export function simulateOrderDocumentUpload({
  organization,
  order,
  user,
  category,
  fileName
}: {
  organization: Organization;
  order: Order;
  user: PortalUser;
  category: DocumentCategory;
  fileName: string;
}): ManagedDocument {
  const now = new Date().toISOString();
  const storagePath = buildOrderDocumentPath(organization.id, order.id, fileName);
  const documentId = `doc-${Date.now()}`;

  return {
    id: documentId,
    organizationId: organization.id,
    orderId: order.id,
    uploaderId: user.id,
    uploaderName: user.name,
    category,
    fileName,
    displayName: category,
    fileType: fileName.endsWith(".xml") ? "application/xml" : "application/pdf",
    fileSizeBytes: 480000,
    storagePath,
    versionNumber: 1,
    visibility: user.clientName ? "Lender/client" : "Organization internal",
    source: user.appraiserName ? "Appraiser upload" : user.clientName ? "Client/lender upload" : "Internal staff upload",
    uploadedAt: now,
    description: "Simulated upload metadata. Supabase Storage is not required in demo mode.",
    tags: ["demo-upload", order.fileNumber],
    status: "Uploaded",
    checksum: `sha256-demo-${Date.now()}`,
    auditMetadata: {
      createdBy: user.name,
      lastAction: "Uploaded",
      lastActionAt: "Just now",
      virusScanStatus: "Queued",
      duplicateDetection: "Not checked"
    },
    versions: [
      {
        id: `docv-${Date.now()}`,
        documentId,
        versionNumber: 1,
        fileName,
        storagePath,
        uploadedBy: user.name,
        uploadedAt: "Just now",
        changeNote: "Initial simulated upload."
      }
    ]
  };
}

export function storageScopeLabel(document: ManagedDocument, vendors: VendorProfile[] = []) {
  if (document.vendorId) {
    const vendor = vendors.find((item) => item.id === document.vendorId);
    return `${vendor?.company ?? "Vendor"} compliance`;
  }
  return document.orderId ? "Order document" : "Organization document";
}
