import type { ManagedDocument } from "@/types/domain";
import { createSignedUrlPlaceholder } from "@/lib/storage/paths";

export type DocumentPreview = {
  documentId: string;
  mode: "pdf" | "image" | "xml" | "download-only";
  previewUrl: string;
  label: string;
};

export type DocumentPreviewProvider = {
  getPreview(document: ManagedDocument): Promise<DocumentPreview>;
};

export const demoDocumentPreviewProvider: DocumentPreviewProvider = {
  async getPreview(document) {
    const lowerName = document.fileName.toLowerCase();
    const mode = lowerName.endsWith(".pdf")
      ? "pdf"
      : lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".png")
        ? "image"
        : lowerName.endsWith(".xml") || lowerName.endsWith(".env")
          ? "xml"
          : "download-only";

    return {
      documentId: document.id,
      mode,
      previewUrl: createSignedUrlPlaceholder(document),
      label: `${document.displayName} preview`
    };
  }
};
