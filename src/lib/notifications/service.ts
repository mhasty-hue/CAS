import type { EmailDeliveryRecord, NotificationEventKey, NotificationTemplate } from "@/types/domain";

export type EmailMessage = {
  organizationId: string;
  eventKey: NotificationEventKey;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  id: EmailDeliveryRecord["provider"];
  send(message: EmailMessage): Promise<EmailDeliveryRecord>;
}

export const notificationEventLabels: Record<NotificationEventKey, string> = {
  new_order_received: "New order received",
  public_order_request_submitted: "Public order request submitted",
  order_assigned: "Order assigned",
  appraiser_accepted: "Appraiser accepted",
  appraiser_declined: "Appraiser declined",
  inspection_scheduled: "Inspection scheduled",
  inspection_rescheduled: "Inspection rescheduled",
  inspection_completed: "Inspection completed",
  report_submitted: "Report submitted",
  report_entered_review: "Report entered review",
  revisions_requested: "Revisions requested",
  revision_response_received: "Revision response received",
  report_approved: "Report approved",
  report_delivered: "Report delivered",
  order_completed: "Order completed",
  order_placed_on_hold: "Order placed on hold",
  order_cancelled: "Order cancelled",
  invoice_generated: "Invoice generated",
  invoice_paid: "Invoice paid",
  vendor_compliance_document_expiring: "Vendor compliance document expiring",
  license_expiring: "License expiring",
  eo_expiring: "E&O expiring",
  w9_missing: "W-9 missing",
  due_date_warning: "Due-date warning",
  past_due_warning: "Past-due warning",
  new_internal_mention: "New internal mention",
  new_client_message: "New client message",
  new_appraiser_message: "New appraiser message",
  new_reviewer_comment: "New reviewer comment",
  revision_requested: "Revision requested",
  revision_response_submitted: "Revision response submitted",
  updated_report_uploaded: "Updated report uploaded",
  final_report_ready_for_delivery: "Final report ready for delivery",
  final_report_delivered: "Final report delivered",
  document_requested: "Document requested",
  requested_document_uploaded: "Requested document uploaded"
};

export function createDevelopmentEmailProvider(): EmailProvider {
  return {
    id: "development-log",
    async send(message) {
      return {
        id: `email-${Date.now()}`,
        organizationId: message.organizationId,
        eventKey: message.eventKey,
        recipient: message.to,
        subject: message.subject,
        status: "Logged",
        provider: "development-log",
        createdAt: new Date().toISOString()
      };
    }
  };
}

export function resolveEmailProvider() {
  return createDevelopmentEmailProvider();
}

export function buildNotificationTemplate(eventKey: NotificationEventKey): NotificationTemplate {
  const label = notificationEventLabels[eventKey];
  return {
    eventKey,
    label,
    subject: `CAS: ${label}`,
    preview: `${label} event is ready for delivery through the configured provider.`,
    defaultAudience: "Configured organization recipients"
  };
}

export async function previewEmailEvent(message: EmailMessage) {
  return resolveEmailProvider().send(message);
}
