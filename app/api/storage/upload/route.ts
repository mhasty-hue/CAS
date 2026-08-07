import type { DocumentCategory, DocumentVisibility } from "@/types/domain";
import { authenticatedStorageClient, jsonError, uploadPrivateOrderFile } from "@/lib/storage/server";

export const runtime = "nodejs";

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

const visibilityValues: DocumentVisibility[] = [
  "Organization internal",
  "Assigned appraiser",
  "Reviewer",
  "AMC",
  "Lender/client",
  "Vendor",
  "Public requester",
  "Delivery recipient"
];

function categoryFrom(value: FormDataEntryValue | null): DocumentCategory {
  return categories.includes(value as DocumentCategory) ? (value as DocumentCategory) : "Other";
}

function visibilityFrom(value: FormDataEntryValue | null): DocumentVisibility | undefined {
  return visibilityValues.includes(value as DocumentVisibility) ? (value as DocumentVisibility) : undefined;
}

export async function POST(request: Request) {
  try {
    const { client, userId, userEmail } = await authenticatedStorageClient(request);
    const form = await request.formData();
    const file = form.get("file");
    const orderId = String(form.get("orderId") ?? "");

    if (!(file instanceof File)) return jsonError("Choose a file to upload.");
    if (!orderId) return jsonError("Choose an order before uploading a file.");

    const result = await uploadPrivateOrderFile({
      client,
      userId,
      userEmail,
      file,
      orderId,
      category: categoryFrom(form.get("category")),
      requestedVisibility: visibilityFrom(form.get("visibility")),
      existingDocumentId: typeof form.get("documentId") === "string" ? String(form.get("documentId")) : undefined,
      createReportVersion: form.get("createReportVersion") === "true"
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "CAS could not upload that file.", 400);
  }
}
