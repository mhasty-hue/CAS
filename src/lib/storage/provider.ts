import type { DocumentCategory, ManagedDocument, Organization, Order, PortalUser } from "@/types/domain";
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
