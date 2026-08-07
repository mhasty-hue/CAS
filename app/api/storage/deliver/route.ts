import type { CasSupabaseClient } from "@/lib/supabase";
import type { DocumentRow, DocumentVersionRow, ReportDeliveryRow, UserProfileRow } from "@/types/database";
import { mapDeliveryRecord, mapManagedDocument } from "@/lib/storage/mappers";
import { authenticatedStorageClient, jsonError } from "@/lib/storage/server";

export const runtime = "nodejs";

async function rows<T>(label: string, query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
}

async function single<T>(label: string, query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (!result.data) throw new Error(`${label}: no matching record was found.`);
  return result.data;
}

async function actorName(client: CasSupabaseClient, userId: string, fallback: string) {
  const matches = await rows<UserProfileRow>("Load delivery actor", client.from("user_profiles").select("*").eq("id", userId).limit(1));
  return matches[0]?.full_name ?? fallback;
}

export async function POST(request: Request) {
  try {
    const { client, userId, userEmail } = await authenticatedStorageClient(request);
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) return jsonError("Choose an order before releasing a report.");

    const order = await single<{ id: string; organization_id: string; file_number: string; client_id: string | null; lender_contact: string | null }>(
      "Load order for delivery",
      client.from("orders").select("id, organization_id, file_number, client_id, lender_contact").eq("id", orderId).maybeSingle()
    );
    const candidates = await rows<DocumentRow>(
      "Load delivery documents",
      client
        .from("documents")
        .select("*")
        .eq("organization_id", order.organization_id)
        .eq("order_id", orderId)
        .in("category", ["Appraisal report PDF", "Appraisal XML", "ENV file", "Delivery receipt"])
    );
    const included = candidates.filter((document) => !document.archived_at && !document.deleted_at && document.status !== "Failed upload");
    if (!included.length) throw new Error("No stored report files are ready for delivery.");

    const actor = await actorName(client, userId, userEmail || userId);
    const recipientName = order.lender_contact || "Delivery recipient";
    const delivery = await single<ReportDeliveryRow>(
      "Create delivery record",
      client
        .from("report_deliveries")
        .insert({
          organization_id: order.organization_id,
          order_id: orderId,
          delivered_by: userId,
          delivered_by_name: actor,
          recipient_name: recipientName,
          recipient_email: order.lender_contact,
          delivery_method: "Secure signed URL",
          included_document_ids: included.map((document) => document.id),
          secure_delivery_url: `/api/storage/signed-url?documentId=${encodeURIComponent(included[0].id)}`,
          status: "Delivered",
          metadata: {
            deliveryNote: `Released exact stored report file(s) for ${order.file_number}.`,
            storageMode: "private-signed-url",
            copiedObjects: false
          }
        })
        .select("*")
        .single()
    );

    await client.from("documents").update({ visibility: "Delivery recipient", status: "Final" }).in("id", included.map((document) => document.id));
    await client.from("document_audit_events").insert({
      organization_id: order.organization_id,
      order_id: orderId,
      document_id: included[0].id,
      event: "Delivered",
      actor_id: userId,
      actor_name: actor,
      detail: `${included.length} stored report file(s) released through secure signed URL delivery.`,
      metadata: { deliveryId: delivery.id, includedDocumentIds: included.map((document) => document.id) }
    });

    const deliveredIds = included.map((document) => document.id);
    const refreshed = await rows<DocumentRow>("Reload delivered documents", client.from("documents").select("*").in("id", deliveredIds));
    const versions = await rows<DocumentVersionRow>("Reload delivered document versions", client.from("document_versions").select("*").in("document_id", deliveredIds));

    return Response.json({
      delivery: mapDeliveryRecord(delivery),
      documents: refreshed.map((document) => mapManagedDocument(document, versions)),
      message: "Final report delivery now uses private storage and short-lived signed downloads."
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "CAS could not release that report.", 400);
  }
}
