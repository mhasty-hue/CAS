import type { DocumentCategory, ManagedDocument, Organization, Order, PortalUser, VendorProfile } from "@/types/domain";

export const privateDocumentBucket = "cas-private-documents";
export const publicOrderUploadBucket = "cas-public-order-uploads";

export function buildOrderDocumentPath(organizationId: string, orderId: string, fileName: string) {
  return `organizations/${organizationId}/orders/${orderId}/documents/${fileName}`;
}

export function buildVendorCompliancePath(organizationId: string, vendorId: string, fileName: string) {
  return `organizations/${organizationId}/vendors/${vendorId}/compliance/${fileName}`;
}

export function buildInvoicePath(organizationId: string, fileName: string) {
  return `organizations/${organizationId}/invoices/${fileName}`;
}

export function buildUserProfilePath(organizationId: string, userId: string, fileName: string) {
  return `organizations/${organizationId}/users/${userId}/profile/${fileName}`;
}

export function validateUploadFile(fileName: string, sizeBytes: number) {
  const allowedExtensions = [".pdf", ".xml", ".env", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xlsx", ".zip"];
  const lower = fileName.toLowerCase();
  const extensionAllowed = allowedExtensions.some((extension) => lower.endsWith(extension));
  const maxBytes = 50 * 1024 * 1024;

  if (!extensionAllowed) return { ok: false, message: "File type is not allowed for appraisal document upload." };
  if (sizeBytes > maxBytes) return { ok: false, message: "File is larger than the 50 MB demo upload limit." };
  return { ok: true, message: "File is ready for secure upload." };
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
