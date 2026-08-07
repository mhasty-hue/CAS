import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { DeliveryRecord, DocumentCategory, DocumentVisibility, ManagedDocument, Organization, Order, PortalUser, ReportSubmission } from "@/types/domain";
import { createSignedUrlPlaceholder, simulateOrderDocumentUpload, validateUploadFile } from "./paths";

export type StorageUploadInput = {
  organization: Organization;
  order: Order;
  user: PortalUser;
  category: DocumentCategory;
  fileName: string;
  sizeBytes: number;
};

export type StorageUploadProgress = {
  state: "queued" | "uploading" | "scanning" | "complete" | "failed";
  percent: number;
  message: string;
};

export type StorageUploadResult = {
  document?: ManagedDocument;
  progress: StorageUploadProgress[];
  error?: string;
};

export type DocumentStorageProvider = {
  uploadOrderDocument(input: StorageUploadInput): Promise<StorageUploadResult>;
  createSignedUrl(document: ManagedDocument): Promise<string>;
  archiveObject(document: ManagedDocument): Promise<void>;
};

export type ProductionUploadInput = {
  orderId: string;
  category: DocumentCategory;
  file: File;
  visibility?: DocumentVisibility;
  documentId?: string;
  createReportVersion?: boolean;
};

export type ProductionUploadResult = {
  document: ManagedDocument;
  signedUrl?: string;
  reportVersionId?: string;
  message: string;
};

async function currentAccessToken() {
  const client = createSupabaseBrowserClient();
  if (!client) throw new Error("Supabase is not configured. Real uploads require Supabase mode.");
  const {
    data: { session },
    error
  } = await client.auth.getSession();
  if (error) throw new Error(error.message);
  if (!session?.access_token) throw new Error("Sign in again before uploading a file.");
  return session.access_token;
}

async function parseStorageResponse<T>(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "CAS could not complete the storage request.");
  }
  return payload as T;
}

export async function uploadOrderDocumentToSupabase(input: ProductionUploadInput): Promise<ProductionUploadResult> {
  const token = await currentAccessToken();
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("orderId", input.orderId);
  formData.append("category", input.category);
  if (input.visibility) formData.append("visibility", input.visibility);
  if (input.documentId) formData.append("documentId", input.documentId);
  if (input.createReportVersion) formData.append("createReportVersion", "true");

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  return parseStorageResponse<ProductionUploadResult>(response);
}

export async function requestDocumentSignedUrl(documentId: string, versionId?: string) {
  const token = await currentAccessToken();
  const params = new URLSearchParams({ documentId });
  if (versionId) params.set("versionId", versionId);
  const response = await fetch(`/api/storage/signed-url?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const payload = await parseStorageResponse<{ signedUrl: string; expiresIn: number; fileName: string }>(response);
  return payload.signedUrl;
}

export async function deliverOrderReportFromSupabase(orderId: string) {
  const token = await currentAccessToken();
  const response = await fetch("/api/storage/deliver", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ orderId })
  });

  return parseStorageResponse<{ delivery: DeliveryRecord; documents: ManagedDocument[]; message: string }>(response);
}

export async function submitReportPackageToSupabase(orderId: string) {
  const token = await currentAccessToken();
  const response = await fetch("/api/storage/submit-report", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ orderId })
  });

  return parseStorageResponse<{ submission: ReportSubmission; message: string }>(response);
}

export const demoDocumentStorageProvider: DocumentStorageProvider = {
  async uploadOrderDocument(input) {
    const validation = validateUploadFile(input.fileName, input.sizeBytes);
    if (!validation.ok) {
      return {
        error: validation.message,
        progress: [{ state: "failed", percent: 0, message: validation.message }]
      };
    }

    return {
      document: simulateOrderDocumentUpload(input),
      progress: [
        { state: "queued", percent: 5, message: "Upload queued for private storage." },
        { state: "uploading", percent: 65, message: "File metadata written to the order document record." },
        { state: "scanning", percent: 85, message: "Virus scan hook queued." },
        { state: "complete", percent: 100, message: "Document available through signed URL placeholder." }
      ]
    };
  },
  async createSignedUrl(document) {
    return createSignedUrlPlaceholder(document);
  },
  async archiveObject() {
    return Promise.resolve();
  }
};
