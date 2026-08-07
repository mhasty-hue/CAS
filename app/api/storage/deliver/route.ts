import type { CasSupabaseClient } from "@/lib/supabase";
import type { ClientRow, DocumentRow, DocumentVersionRow, OrganizationNotificationSettingsRow, ReportDeliveryRow, UserProfileRow } from "@/types/database";
import { mapDeliveryRecord, mapManagedDocument } from "@/lib/storage/mappers";
import { authenticatedStorageClient, jsonError } from "@/lib/storage/server";
import { getNotificationDefinition } from "@/lib/notifications/catalog";

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

function usableEmail(value: string | null | undefined) {
  return value && value.includes("@") ? value : null;
}

export async function POST(request: Request) {
  try {
    const { client, userId, userEmail } = await authenticatedStorageClient(request);
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) return jsonError("Choose an order before releasing a report.");

    const order = await single<{ id: string; organization_id: string; file_number: string; client_id: string | null; lender_contact: string | null; subject_address: string; borrower_name: string; product_type: string }>(
      "Load order for delivery",
      client.from("orders").select("id, organization_id, file_number, client_id, lender_contact, subject_address, borrower_name, product_type").eq("id", orderId).maybeSingle()
    );
    const [clientRows, notificationSettingsRows] = await Promise.all([
      order.client_id ? rows<ClientRow>("Load delivery client", client.from("clients").select("*").eq("id", order.client_id).limit(1)) : Promise.resolve([]),
      rows<OrganizationNotificationSettingsRow>("Load notification settings", client.from("organization_notification_settings").select("*").eq("organization_id", order.organization_id).limit(1))
    ]);
    const clientRecord = clientRows[0];
    const notificationSettings = notificationSettingsRows[0];
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
    const deliveryRecipientName = order.lender_contact || "Delivery recipient";
    const delivery = await single<ReportDeliveryRow>(
      "Create delivery record",
      client
        .from("report_deliveries")
        .insert({
          organization_id: order.organization_id,
          order_id: orderId,
          delivered_by: userId,
          delivered_by_name: actor,
          recipient_name: deliveryRecipientName,
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

    const definition = getNotificationDefinition("final_report_delivered");
    const recipientEmail = usableEmail(clientRecord?.email) ?? usableEmail(clientRecord?.billing_email) ?? usableEmail(order.lender_contact);
    const recipientName = clientRecord?.primary_contact ?? clientRecord?.name ?? order.lender_contact ?? "Delivery recipient";
    const actionUrl = `/orders/${order.id}`;
    const safeMessage = `Your appraisal report for ${order.subject_address} is ready to view securely in CAS.`;
    const emailStatus = notificationSettings?.email_enabled && notificationSettings.clients_receive_delivery_email && recipientEmail ? "Pending" : "Configuration required";

    const inAppNotification = await single<{ id: string }>(
      "Create report delivery notification",
      client
        .from("notifications")
        .insert({
          organization_id: order.organization_id,
          user_id: null,
          title: "Final report ready",
          body: safeMessage,
          type: "delivery",
          event_type: "final_report_delivered",
          order_id: order.id,
          actor_user_id: userId,
          recipient_organization_id: null,
          recipient_role: "client_user",
          channel: "in_app",
          subject: "Your appraisal report is ready",
          sanitized_message: safeMessage,
          priority: definition.priority,
          action_url: actionUrl,
          template_version: definition.templateVersion,
          visibility_classification: "client_safe",
          related_entity_type: "report_delivery",
          related_entity_id: delivery.id,
          requires_action: false,
          metadata: { deliveryId: delivery.id, fileNumber: order.file_number, productType: order.product_type }
        })
        .select("id")
        .single()
    );

    const emailQueue = await single<{ id: string }>(
      "Create delivery email queue item",
      client
        .from("notification_queue")
        .insert({
          organization_id: order.organization_id,
          event_id: inAppNotification.id,
          recipient_email: recipientEmail,
          recipient_role: "client_user",
          event_type: "final_report_delivered",
          channel: "Email",
          status: emailStatus,
          attempt_count: 0,
          failure_reason: emailStatus === "Configuration required" ? "Email provider or delivery recipient email is not configured." : null,
          related_order_id: order.id,
          subject: "Your appraisal report is ready",
          preview: safeMessage,
          payload: {
            deliveryId: delivery.id,
            actionUrl,
            fileNumber: order.file_number,
            permanentSignedUrl: false
          },
          priority: definition.priority,
          action_url: actionUrl,
          template_version: definition.templateVersion,
          visibility_classification: "client_safe",
          related_entity_type: "report_delivery",
          related_entity_id: delivery.id,
          dedupe_key: `delivery:${delivery.id}:client_email`,
          requires_action: false
        })
        .select("id")
        .single()
    );

    await client.from("notification_queue").insert({
      organization_id: order.organization_id,
      event_id: inAppNotification.id,
      recipient_email: recipientEmail,
      recipient_role: "client_user",
      event_type: "final_report_delivered",
      channel: "In-app",
      status: "Pending",
      attempt_count: 0,
      related_order_id: order.id,
      subject: "Your appraisal report is ready",
      preview: safeMessage,
      payload: { deliveryId: delivery.id, actionUrl, fileNumber: order.file_number },
      priority: definition.priority,
      action_url: actionUrl,
      template_version: definition.templateVersion,
      visibility_classification: "client_safe",
      related_entity_type: "report_delivery",
      related_entity_id: delivery.id,
      dedupe_key: `delivery:${delivery.id}:client_in_app`,
      requires_action: false
    });

    await client.from("communication_events").insert({
      organization_id: order.organization_id,
      order_id: order.id,
      actor_user_id: userId,
      event_type: "final_report_delivered",
      channel: "email",
      recipient_role: "client_user",
      recipient_email: recipientEmail,
      visibility_classification: "client_safe",
      subject: "Your appraisal report is ready",
      sanitized_message: safeMessage,
      action_url: actionUrl,
      delivery_status: emailStatus === "Pending" ? "queued" : "failed",
      notification_id: inAppNotification.id,
      notification_queue_id: emailQueue.id,
      failure_reason: emailStatus === "Configuration required" ? "Email provider or recipient email configuration required." : null,
      retry_count: 0,
      metadata: {
        deliveryId: delivery.id,
        recipientName,
        signedUrlEmbedded: false
      }
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
