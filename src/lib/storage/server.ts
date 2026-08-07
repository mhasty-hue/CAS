import { createSupabaseServerClient, type CasSupabaseClient } from "@/lib/supabase";
import type { DocumentCategory, DocumentVisibility } from "@/types/domain";
import type { DocumentRow, DocumentVersionRow, OrderRow, UserProfileRow } from "@/types/database";
import {
  buildProductionOrderDocumentPath,
  buildReportVersionPath,
  maxPrivateUploadBytes,
  maxReportUploadBytes,
  normalizedUploadContentType,
  privateDocumentBucket,
  sanitizeStorageFileName,
  validateUploadFile,
  isReportCategory
} from "./paths";
import { mapManagedDocument } from "./mappers";

export type ServerUploadResult = {
  document: ReturnType<typeof mapManagedDocument>;
  reportVersionId?: string;
  message: string;
};

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function accessTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function authenticatedStorageClient(request: Request) {
  const token = accessTokenFromRequest(request);
  if (!token) throw new Error("Sign in before using secure file storage.");
  const client = createSupabaseServerClient(token);
  if (!client) throw new Error("Supabase is not configured for secure file storage.");
  const {
    data: { user },
    error
  } = await client.auth.getUser();
  if (error || !user) throw new Error("Your session could not be verified. Sign in again.");
  return { client, userId: user.id, userEmail: user.email ?? "" };
}

async function readSingle<T>(label: string, query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (!result.data) throw new Error(`${label}: no matching record was found.`);
  return result.data;
}

async function readRows<T>(label: string, query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
}

async function checksumFor(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function documentSourceFor(category: DocumentCategory) {
  if (category === "Workfile" || isReportCategory(category)) return "Appraiser upload";
  if (category === "Revision request") return "Reviewer upload";
  return "Internal staff upload";
}

function defaultVisibilityFor(category: DocumentCategory, requested?: DocumentVisibility): DocumentVisibility {
  if (category === "Workfile") return "Assigned appraiser";
  if (category === "Revision request") return "Reviewer";
  if (category === "Appraisal report PDF" || category === "Appraisal XML" || category === "ENV file") return "Reviewer";
  if (requested === "Lender/client" || requested === "Delivery recipient") return requested;
  return requested ?? "Organization internal";
}

function profileForCategory(category: DocumentCategory) {
  return category === "UAD 3.6 data package" ? "uad-3-6-urar" : "legacy-conventional-single-family";
}

async function nextVersionNumber(client: CasSupabaseClient, documentId: string) {
  const rows = await readRows<DocumentVersionRow>(
    "Load document versions",
    client.from("document_versions").select("*").eq("document_id", documentId).order("version_number", { ascending: false }).limit(1)
  );
  return (rows[0]?.version_number ?? 0) + 1;
}

async function nextReportVersionNumber(client: CasSupabaseClient, orderId: string) {
  const rows = await readRows<{ version_number: number }>(
    "Load report versions",
    client.from("appraisal_report_versions").select("version_number").eq("order_id", orderId).order("version_number", { ascending: false }).limit(1)
  );
  return (rows[0]?.version_number ?? 0) + 1;
}

async function userDisplayName(client: CasSupabaseClient, userId: string, email: string) {
  const rows = await readRows<UserProfileRow>("Load uploader profile", client.from("user_profiles").select("*").eq("id", userId).limit(1));
  return rows[0]?.full_name ?? email ?? "CAS user";
}

export async function uploadPrivateOrderFile({
  client,
  userId,
  userEmail,
  file,
  orderId,
  category,
  requestedVisibility,
  existingDocumentId,
  createReportVersion
}: {
  client: CasSupabaseClient;
  userId: string;
  userEmail: string;
  file: File;
  orderId: string;
  category: DocumentCategory;
  requestedVisibility?: DocumentVisibility;
  existingDocumentId?: string;
  createReportVersion?: boolean;
}): Promise<ServerUploadResult> {
  const validation = validateUploadFile(file.name, file.size, file.type, isReportCategory(category) ? maxReportUploadBytes : maxPrivateUploadBytes);
  if (!validation.ok) throw new Error(validation.message);

  const order = await readSingle<OrderRow>("Load order for upload", client.from("orders").select("*").eq("id", orderId).maybeSingle());
  const uploaderName = await userDisplayName(client, userId, userEmail);
  const checksum = await checksumFor(file);
  const safeFileName = sanitizeStorageFileName(file.name);
  const contentType = normalizedUploadContentType(file.name, file.type);
  const now = new Date().toISOString();
  const duplicateRows = await readRows<DocumentRow>(
    "Check duplicate documents",
    client.from("documents").select("*").eq("organization_id", order.organization_id).eq("checksum", checksum).limit(2)
  );
  const duplicateDetection = duplicateRows.some((row) => row.id !== existingDocumentId) ? "Possible duplicate" : "Unique";
  const documentId = existingDocumentId ?? crypto.randomUUID();
  const versionNumber = existingDocumentId ? await nextVersionNumber(client, documentId) : 1;
  const pendingReportVersionId = createReportVersion || isReportCategory(category) ? crypto.randomUUID() : undefined;
  const storagePath = isReportCategory(category)
    ? buildReportVersionPath({ organizationId: order.organization_id, orderId, documentId: pendingReportVersionId ?? documentId, versionNumber, safeFileName })
    : buildProductionOrderDocumentPath({ organizationId: order.organization_id, orderId, documentId, versionNumber, safeFileName });
  const visibility = defaultVisibilityFor(category, requestedVisibility);
  const source = documentSourceFor(category);
  const metadata = {
    originalFileName: file.name,
    storedFileName: safeFileName,
    processingStatus: "Stored",
    malwareScanStatus: "Scan unavailable",
    storageProvider: "supabase",
    demoOnly: false
  };

  let documentRow: DocumentRow;
  if (existingDocumentId) {
    documentRow = await readSingle<DocumentRow>("Load existing document", client.from("documents").select("*").eq("id", existingDocumentId).maybeSingle());
    if (documentRow.order_id !== orderId || documentRow.organization_id !== order.organization_id) {
      throw new Error("The selected document does not belong to this order.");
    }
  } else {
    documentRow = await readSingle<DocumentRow>(
      "Create pending document metadata",
      client
        .from("documents")
        .insert({
          id: documentId,
          organization_id: order.organization_id,
          order_id: orderId,
          uploaded_by: userId,
          name: file.name,
          document_type: category,
          display_name: category,
          category,
          source,
          storage_bucket: privateDocumentBucket,
          storage_path: storagePath,
          visibility,
          status: "Needs classification",
          content_type: contentType,
          file_size_bytes: file.size,
          version_number: versionNumber,
          checksum,
          description: "Upload pending storage confirmation.",
          tags: ["production-upload", category],
          audit_metadata: {
            createdBy: uploaderName,
            lastAction: "Upload pending",
            lastActionAt: now,
            virusScanStatus: "Queued",
            duplicateDetection
          },
          virus_scan_status: "Queued",
          duplicate_detection: duplicateDetection,
          metadata
        })
        .select("*")
        .single()
    );
  }

  const upload = await client.storage.from(privateDocumentBucket).upload(storagePath, file, {
    contentType,
    upsert: false,
    cacheControl: "private, max-age=0, no-store"
  });

  if (upload.error) {
    await client.from("documents").update({ status: "Failed upload", description: upload.error.message }).eq("id", documentId);
    throw new Error(`Supabase Storage upload failed: ${upload.error.message}`);
  }

  const signed = await client.storage.from(privateDocumentBucket).createSignedUrl(storagePath, 30);
  if (signed.error || !signed.data?.signedUrl) {
    await client.from("documents").update({ status: "Failed upload", description: signed.error?.message ?? "Uploaded object could not be verified." }).eq("id", documentId);
    throw new Error(`Uploaded object could not be verified: ${signed.error?.message ?? "missing signed URL"}`);
  }

  const versionRow = await readSingle<DocumentVersionRow>(
    "Create document version",
    client
      .from("document_versions")
      .insert({
        organization_id: order.organization_id,
        document_id: documentId,
        version_number: versionNumber,
        file_name: file.name,
        storage_bucket: privateDocumentBucket,
        storage_path: storagePath,
        content_type: contentType,
        file_size_bytes: file.size,
        checksum,
        uploaded_by: userId,
        uploaded_by_name: uploaderName,
        change_note: existingDocumentId ? "New immutable version uploaded." : "Initial immutable upload.",
        metadata
      })
      .select("*")
      .single()
  );

  documentRow = await readSingle<DocumentRow>(
    "Finalize document metadata",
    client
      .from("documents")
      .update({
        name: file.name,
        storage_path: storagePath,
        content_type: contentType,
        file_size_bytes: file.size,
        version_number: versionNumber,
        checksum,
        status: isReportCategory(category) && versionNumber > 1 ? "Final" : "Uploaded",
        description: "Stored in private Supabase Storage.",
        audit_metadata: {
          createdBy: uploaderName,
          lastAction: existingDocumentId ? "Version replaced" : "Uploaded",
          lastActionAt: now,
          virusScanStatus: "Queued",
          duplicateDetection
        },
        virus_scan_status: "Queued",
        duplicate_detection: duplicateDetection,
        metadata
      })
      .eq("id", documentId)
      .select("*")
      .single()
  );

  let reportVersionId: string | undefined;
  if (createReportVersion || isReportCategory(category)) {
    const reportVersionNumber = await nextReportVersionNumber(client, orderId);
    reportVersionId = pendingReportVersionId ?? crypto.randomUUID();
    const sourceFiles = [
      {
        id: versionRow.id,
        documentId,
        documentVersionId: versionRow.id,
        fileName: file.name,
        mimeType: contentType,
        sizeBytes: file.size,
        storageBucket: privateDocumentBucket,
        storagePath,
        checksum,
        uploadedBy: uploaderName,
        uploadedAt: now
      }
    ];
    const reportInsert = await client.from("appraisal_report_versions").insert({
      id: reportVersionId,
      organization_id: order.organization_id,
      order_id: orderId,
      version_number: reportVersionNumber,
      profile_key: profileForCategory(category),
      overlay_keys: ["universal"],
      source_files: sourceFiles,
      original_storage_preserved: true,
      immutable: true,
      uploaded_by: userId,
      uploaded_by_name: uploaderName,
      status: "uploaded",
      extraction_summary: "Real file bytes stored in Supabase Storage. Extraction is ready to run."
    });
    if (reportInsert.error) throw new Error(`Report version metadata failed: ${reportInsert.error.message}`);
  }

  await client.from("document_audit_events").insert({
    organization_id: order.organization_id,
    order_id: orderId,
    document_id: documentId,
    event: existingDocumentId ? "Version replaced" : "Uploaded",
    actor_id: userId,
    actor_name: uploaderName,
    detail: `${category} stored in ${privateDocumentBucket}.`,
    metadata: { storagePath, checksum, versionNumber, reportVersionId }
  });

  return {
    document: mapManagedDocument(documentRow, [versionRow]),
    reportVersionId,
    message: `${file.name} was stored in private Supabase Storage.`
  };
}
