import type { EmailDeliveryRecord } from "@/types/domain";
import type { EmailMessage, EmailProvider } from "./service";

type ProviderKey = EmailDeliveryRecord["provider"] | "none";

function providerKey(): ProviderKey {
  const configured = process.env.CAS_EMAIL_PROVIDER?.toLowerCase();
  if (configured === "resend" || configured === "postmark" || configured === "sendgrid" || configured === "custom" || configured === "development-log") {
    return configured;
  }
  return "none";
}

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function configurationRequired(message: EmailMessage, provider: EmailDeliveryRecord["provider"] = "development-log", reason = "Email provider is not configured.") {
  return {
    id: messageId("email-config"),
    organizationId: message.organizationId,
    eventKey: message.eventKey as EmailDeliveryRecord["eventKey"],
    recipient: message.to,
    subject: message.subject,
    status: "Configuration required",
    provider,
    createdAt: new Date().toISOString(),
    error: reason,
    actionUrl: message.actionUrl,
    templateVersion: message.templateVersion,
    visibilityClassification: message.visibilityClassification as EmailDeliveryRecord["visibilityClassification"],
    attemptCount: 0,
    failureClassification: "configuration",
    plaintextPreview: message.text.slice(0, 240),
    htmlPreview: message.html.slice(0, 240)
  } satisfies EmailDeliveryRecord;
}

export function createUnavailableEmailProvider(reason = "Email provider is not configured."): EmailProvider {
  return {
    id: "development-log",
    async send(message) {
      return configurationRequired(message, "development-log", reason);
    }
  };
}

export function createDevelopmentLogEmailProvider(): EmailProvider {
  return {
    id: "development-log",
    async send(message) {
      return {
        id: messageId("email-log"),
        organizationId: message.organizationId,
        eventKey: message.eventKey as EmailDeliveryRecord["eventKey"],
        recipient: message.to,
        subject: message.subject,
        status: "Logged",
        provider: "development-log",
        providerMessageId: messageId("dev"),
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        actionUrl: message.actionUrl,
        templateVersion: message.templateVersion,
        visibilityClassification: message.visibilityClassification as EmailDeliveryRecord["visibilityClassification"],
        attemptCount: 1,
        plaintextPreview: message.text.slice(0, 240),
        htmlPreview: message.html.slice(0, 240)
      };
    }
  };
}

export function createResendEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CAS_EMAIL_FROM;
  if (!apiKey || !from) return createUnavailableEmailProvider("RESEND_API_KEY and CAS_EMAIL_FROM are required for Resend delivery.");

  return {
    id: "resend",
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          reply_to: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text
        })
      });
      const body = await response.json().catch(() => ({} as { id?: string; message?: string }));
      if (!response.ok) {
        return {
          ...configurationRequired(message, "resend", body?.message ?? `Resend returned HTTP ${response.status}.`),
          status: response.status >= 500 ? "Failed" : "Configuration required",
          failureClassification: response.status >= 500 ? "transient" : "configuration",
          attemptCount: 1,
          failedAt: new Date().toISOString()
        };
      }

      return {
        id: messageId("email-resend"),
        organizationId: message.organizationId,
        eventKey: message.eventKey as EmailDeliveryRecord["eventKey"],
        recipient: message.to,
        subject: message.subject,
        status: "Sent",
        provider: "resend",
        providerMessageId: typeof body?.id === "string" ? body.id : undefined,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        actionUrl: message.actionUrl,
        templateVersion: message.templateVersion,
        visibilityClassification: message.visibilityClassification as EmailDeliveryRecord["visibilityClassification"],
        attemptCount: 1,
        plaintextPreview: message.text.slice(0, 240),
        htmlPreview: message.html.slice(0, 240)
      };
    }
  };
}

export function resolveServerEmailProvider(): EmailProvider {
  const provider = providerKey();
  if (provider === "development-log") return createDevelopmentLogEmailProvider();
  if (provider === "resend") return createResendEmailProvider();
  if (provider === "postmark") return createUnavailableEmailProvider("Postmark is documented for production setup but no Postmark sender has been configured in this build.");
  if (provider === "sendgrid") return createUnavailableEmailProvider("SendGrid is documented for production setup but no SendGrid sender has been configured in this build.");
  if (provider === "custom") return createUnavailableEmailProvider("Custom email webhook delivery requires a server-side adapter before use.");
  return createUnavailableEmailProvider();
}

export function emailProviderStatus() {
  const provider = providerKey();
  return {
    provider,
    configured: provider === "development-log" || (provider === "resend" && Boolean(process.env.RESEND_API_KEY && process.env.CAS_EMAIL_FROM)),
    productionDelivery: provider === "resend" && Boolean(process.env.RESEND_API_KEY && process.env.CAS_EMAIL_FROM)
  };
}
