import { createSupabaseServerClient } from "@/lib/supabase";
import {
  buildPublicIntakeUploadPath,
  getFileExtension,
  maxPublicIntakeUploadBytes,
  normalizedUploadContentType,
  publicOrderUploadBucket,
  sanitizeStorageFileName,
  validateUploadFile
} from "@/lib/storage/paths";
import { jsonError } from "@/lib/storage/server";

export const runtime = "nodejs";

type PublicIntakePayload = {
  organizationSlug: string;
  requesterName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: string;
  purpose: string;
  intendedUse: string;
  ownerBorrowerName: string;
  accessContact: string;
  preferredContactMethod: string;
  requestedTiming: string;
  comments: string;
  consentAccepted: boolean;
};

async function checksumFor(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stringField(form: FormData, key: keyof PublicIntakePayload) {
  return String(form.get(key) ?? "").trim();
}

const publicIntakeExtensions = [".pdf", ".csv", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"];

export async function POST(request: Request) {
  try {
    const client = createSupabaseServerClient();
    if (!client) return jsonError("Supabase is not configured for public intake uploads.", 503);

    const form = await request.formData();
    const organizationSlug = stringField(form, "organizationSlug");
    const files = form.getAll("files").filter((file): file is File => file instanceof File);
    const consentAccepted = form.get("consentAccepted") === "true";

    if (!organizationSlug) return jsonError("The intake link is missing an organization.");
    if (!consentAccepted) return jsonError("Consent is required before uploading intake documents.");

    const settingsResult = await client
      .from("public_order_settings")
      .select("*")
      .eq("public_slug", organizationSlug)
      .eq("enabled", true)
      .maybeSingle();
    if (settingsResult.error || !settingsResult.data) {
      throw new Error(settingsResult.error?.message ?? "This public order intake link is not active.");
    }

    const requestId = crypto.randomUUID();
    const requestInsert = await client.from("public_order_requests").insert({
      id: requestId,
      organization_id: String(settingsResult.data.organization_id),
      requester_name: stringField(form, "requesterName") || "Public requester",
      email: stringField(form, "email"),
      phone: stringField(form, "phone"),
      property_address: stringField(form, "propertyAddress"),
      property_type: stringField(form, "propertyType"),
      purpose: stringField(form, "purpose") || "Other",
      intended_use: stringField(form, "intendedUse"),
      owner_borrower_name: stringField(form, "ownerBorrowerName"),
      access_contact: stringField(form, "accessContact"),
      preferred_contact_method: stringField(form, "preferredContactMethod"),
      requested_timing: stringField(form, "requestedTiming"),
      comments: stringField(form, "comments"),
      consent_accepted: true,
      document_count: files.length,
      status: "pending_review",
      metadata: { storageMode: "supabase", uploadBucket: publicOrderUploadBucket }
    });
    if (requestInsert.error) throw new Error(`Public intake request failed: ${requestInsert.error.message}`);

    const uploaded: Array<{ id: string; fileName: string; storagePath: string; checksum: string }> = [];
    for (const file of files) {
      const validation = validateUploadFile(file.name, file.size, file.type, maxPublicIntakeUploadBytes);
      if (!validation.ok) throw new Error(`${file.name}: ${validation.message}`);
      if (!publicIntakeExtensions.includes(getFileExtension(file.name))) {
        throw new Error(`${file.name}: Public intake accepts PDF, CSV, spreadsheet, JPG, and PNG files.`);
      }
      const uploadId = crypto.randomUUID();
      const safeFileName = sanitizeStorageFileName(file.name);
      const storagePath = buildPublicIntakeUploadPath(requestId, uploadId, safeFileName);
      const checksum = await checksumFor(file);
      const contentType = normalizedUploadContentType(file.name, file.type);
      const documentInsert = await client.from("public_order_request_documents").insert({
        id: uploadId,
        organization_id: String(settingsResult.data.organization_id),
        public_order_request_id: requestId,
        file_name: file.name,
        storage_bucket: publicOrderUploadBucket,
        storage_path: storagePath,
        content_type: contentType,
        file_size_bytes: file.size,
        metadata: { checksum, storedFileName: safeFileName, malwareScanStatus: "Pending" }
      });
      if (documentInsert.error) throw new Error(`Intake document metadata failed: ${documentInsert.error.message}`);

      const upload = await client.storage.from(publicOrderUploadBucket).upload(storagePath, file, {
        contentType,
        upsert: false,
        cacheControl: "private, max-age=0, no-store"
      });
      if (upload.error) throw new Error(`Intake upload failed: ${upload.error.message}`);
      uploaded.push({ id: uploadId, fileName: file.name, storagePath, checksum });
    }

    return Response.json({
      requestId,
      uploadedCount: uploaded.length,
      message: "Public intake request and files were stored for staff review."
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "CAS could not store the public intake upload.", 400);
  }
}
