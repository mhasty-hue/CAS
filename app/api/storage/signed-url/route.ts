import type { DocumentRow, DocumentVersionRow } from "@/types/database";
import { authenticatedStorageClient, jsonError } from "@/lib/storage/server";

export const runtime = "nodejs";

async function single<T>(label: string, query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (!result.data) throw new Error(`${label}: no matching record was found.`);
  return result.data;
}

export async function GET(request: Request) {
  try {
    const { client, userId, userEmail } = await authenticatedStorageClient(request);
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId") ?? url.searchParams.get("document");
    const versionId = url.searchParams.get("versionId");

    if (!documentId) return jsonError("CAS needs a document ID before creating a signed download.");

    const document = await single<DocumentRow>("Load document", client.from("documents").select("*").eq("id", documentId).maybeSingle());
    const version = versionId
      ? await single<DocumentVersionRow>("Load document version", client.from("document_versions").select("*").eq("id", versionId).eq("document_id", document.id).maybeSingle())
      : null;
    const bucket = version?.storage_bucket ?? document.storage_bucket;
    const path = version?.storage_path ?? document.storage_path;
    const fileName = version?.file_name ?? document.name;

    if (!bucket || !path) throw new Error("This document does not have a stored production object yet.");

    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 120, { download: fileName });
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "Supabase did not return a signed URL.");

    await client.from("documents").update({ signed_url_last_requested_at: new Date().toISOString() }).eq("id", document.id);
    await client.from("document_audit_events").insert({
      organization_id: document.organization_id,
      order_id: document.order_id,
      document_id: document.id,
      event: "Downloaded",
      actor_id: userId,
      actor_name: userEmail || userId,
      detail: `Short-lived signed URL created for ${fileName}.`,
      metadata: { versionId: version?.id, expiresIn: 120 }
    });

    return Response.json({ signedUrl: data.signedUrl, expiresIn: 120, fileName });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "CAS could not create a signed download.", 403);
  }
}
