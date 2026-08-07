import { resolveServerEmailProvider, emailProviderStatus } from "@/lib/notifications/email-provider";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { NotificationQueueRow } from "@/types/database";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function authorized(request: Request) {
  const expected = process.env.CAS_NOTIFICATION_PROCESSOR_SECRET;
  if (!expected) return false;
  return request.headers.get("x-cas-cron-secret") === expected || request.headers.get("authorization") === `Bearer ${expected}`;
}

function queueStatusForEmail(status: string) {
  if (status === "Configuration required") return "Configuration required";
  if (status === "Failed") return "Failed";
  return "Sent";
}

function communicationStatusForEmail(status: string) {
  if (status === "Configuration required" || status === "Failed") return "failed";
  if (status === "Logged") return "simulated";
  if (status === "Delivered") return "delivered";
  return "sent";
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return jsonError("Notification processor secret is required.", 401);
  }

  const client = createSupabaseServiceRoleClient();
  if (!client) {
    return jsonError("Supabase service-role client is not configured for notification processing.", 503);
  }

  const provider = resolveServerEmailProvider();
  const providerStatus = emailProviderStatus();
  const { data, error } = await client
    .from("notification_queue")
    .select("*")
    .eq("channel", "Email")
    .in("status", ["Pending", "Queued", "Failed"])
    .order("queued_at", { ascending: true })
    .limit(25);

  if (error) return jsonError(`Notification queue query failed: ${error.message}`, 500);

  const processed = [];
  for (const item of (data ?? []) as NotificationQueueRow[]) {
    if (!item.recipient_email || !item.recipient_email.includes("@")) {
      await client.from("notification_queue").update({
        status: "Configuration required",
        failure_reason: "Recipient email is missing or invalid.",
        failed_at: new Date().toISOString(),
        attempt_count: item.attempt_count + 1
      }).eq("id", item.id);
      processed.push({ id: item.id, status: "Configuration required" });
      continue;
    }

    const result = providerStatus.configured
      ? await provider.send({
          organizationId: item.organization_id,
          eventKey: item.event_type,
          to: item.recipient_email,
          subject: item.subject,
          text: `${item.preview ?? item.subject}\n\nOpen CAS: ${item.action_url ?? "/notifications"}`,
          html: `<p>${item.preview ?? item.subject}</p><p><a href="${item.action_url ?? "/notifications"}">Open in CAS</a></p>`,
          actionUrl: item.action_url ?? undefined,
          templateVersion: item.template_version,
          visibilityClassification: item.visibility_classification
        })
      : await provider.send({
          organizationId: item.organization_id,
          eventKey: item.event_type,
          to: item.recipient_email,
          subject: item.subject,
          text: item.preview ?? item.subject,
          html: `<p>${item.preview ?? item.subject}</p>`,
          actionUrl: item.action_url ?? undefined,
          templateVersion: item.template_version,
          visibilityClassification: item.visibility_classification
        });

    const emailInsert = await client.from("email_deliveries").insert({
      organization_id: item.organization_id,
      notification_queue_id: item.id,
      event_key: item.event_type,
      recipient: item.recipient_email,
      recipient_user_id: item.recipient_user_id,
      recipient_role: item.recipient_role,
      subject: item.subject,
      status: result.status,
      provider: result.provider,
      provider_message_id: result.providerMessageId,
      error: result.error,
      payload: {
        actionUrl: item.action_url,
        provider: result.provider,
        templateVersion: item.template_version,
        visibilityClassification: item.visibility_classification
      },
      visibility_classification: item.visibility_classification,
      action_url: item.action_url,
      template_version: item.template_version,
      attempt_count: result.attemptCount ?? item.attempt_count + 1,
      sent_at: result.sentAt,
      delivered_at: result.deliveredAt,
      failed_at: result.failedAt,
      failure_classification: result.failureClassification,
      plaintext_preview: result.plaintextPreview,
      html_preview: result.htmlPreview
    }).select("id").single();

    const emailDeliveryId = emailInsert.data?.id ?? null;
    await client.from("notification_queue").update({
      status: queueStatusForEmail(result.status),
      attempt_count: item.attempt_count + 1,
      failure_reason: result.error,
      sent_at: result.sentAt ?? (result.status === "Logged" || result.status === "Sent" ? new Date().toISOString() : item.sent_at),
      delivered_at: result.deliveredAt,
      failed_at: result.failedAt ?? (result.status === "Failed" || result.status === "Configuration required" ? new Date().toISOString() : item.failed_at),
      provider_message_id: result.providerMessageId,
      email_delivery_id: emailDeliveryId
    }).eq("id", item.id);

    await client.from("communication_events").insert({
      organization_id: item.organization_id,
      order_id: item.related_order_id,
      event_type: item.event_type,
      channel: "email",
      recipient_user_id: item.recipient_user_id,
      recipient_organization_id: item.recipient_organization_id,
      recipient_role: item.recipient_role,
      recipient_email: item.recipient_email,
      visibility_classification: item.visibility_classification,
      subject: item.subject,
      sanitized_message: item.preview ?? item.subject,
      action_url: item.action_url,
      delivery_status: communicationStatusForEmail(result.status),
      notification_queue_id: item.id,
      email_delivery_id: emailDeliveryId,
      provider_message_id: result.providerMessageId,
      failure_reason: result.error,
      retry_count: item.attempt_count + 1,
      metadata: {
        provider: result.provider,
        templateVersion: item.template_version,
        permanentSignedUrl: false
      }
    });

    processed.push({ id: item.id, status: queueStatusForEmail(result.status), provider: result.provider });
  }

  return Response.json({
    processed,
    provider: providerStatus.provider,
    productionDelivery: providerStatus.productionDelivery
  });
}
