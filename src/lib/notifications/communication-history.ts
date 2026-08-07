import type {
  CommunicationEvent,
  DeliveryRecord,
  DocumentAuditEvent,
  EmailDeliveryRecord,
  NotificationQueueItem,
  OrderMessage,
  PortalUser
} from "@/types/domain";

export type CommunicationHistoryItem = {
  id: string;
  at: string;
  channel: CommunicationEvent["channel"];
  recipient: string;
  event: string;
  deliveryStatus: CommunicationEvent["deliveryStatus"];
  relatedAction: string;
  visibleToClient: boolean;
};

function userCanSeeInternal(user: PortalUser) {
  return !["client_user"].includes(user.role);
}

function statusFromQueue(status: NotificationQueueItem["status"]): CommunicationEvent["deliveryStatus"] {
  if (status === "Sent") return "sent";
  if (status === "Delivered") return "delivered";
  if (status === "Failed" || status === "Configuration required") return "failed";
  if (status === "Read") return "read";
  if (status === "Dismissed") return "dismissed";
  return "queued";
}

function statusFromEmail(status: EmailDeliveryRecord["status"]): CommunicationEvent["deliveryStatus"] {
  if (status === "Sent") return "sent";
  if (status === "Delivered") return "delivered";
  if (status === "Failed" || status === "Configuration required") return "failed";
  if (status === "Logged") return "simulated";
  return "queued";
}

export function buildCommunicationHistory({
  orderId,
  user,
  communicationEvents,
  notificationQueue,
  emailDeliveries,
  messages,
  deliveries,
  documentAuditEvents
}: {
  orderId: string;
  user: PortalUser;
  communicationEvents: CommunicationEvent[];
  notificationQueue: NotificationQueueItem[];
  emailDeliveries: EmailDeliveryRecord[];
  messages: OrderMessage[];
  deliveries: DeliveryRecord[];
  documentAuditEvents: DocumentAuditEvent[];
}): CommunicationHistoryItem[] {
  const clientUser = user.role === "client_user";
  const items: CommunicationHistoryItem[] = [];

  for (const event of communicationEvents.filter((item) => item.orderId === orderId)) {
    const visibleToClient = event.visibilityClassification === "client_safe" || event.visibilityClassification === "shared";
    if (clientUser && !visibleToClient) continue;
    items.push({
      id: event.id,
      at: event.occurredAt,
      channel: event.channel,
      recipient: clientUser && !visibleToClient ? "CAS" : event.recipient,
      event: event.subject,
      deliveryStatus: event.deliveryStatus,
      relatedAction: event.sanitizedMessage,
      visibleToClient
    });
  }

  for (const item of notificationQueue.filter((entry) => entry.relatedOrderId === orderId)) {
    const visibleToClient = item.visibilityClassification === "client_safe" || item.visibilityClassification === "shared";
    if (clientUser && !visibleToClient) continue;
    items.push({
      id: item.id,
      at: item.sentAt ?? item.queuedAt,
      channel: item.channel === "In-app" ? "in_app" : item.channel === "Email" ? "email" : "digest",
      recipient: item.recipient,
      event: item.subject,
      deliveryStatus: statusFromQueue(item.status),
      relatedAction: item.preview,
      visibleToClient
    });
  }

  for (const delivery of emailDeliveries) {
    const visibleToClient = delivery.visibilityClassification === "client_safe" || delivery.visibilityClassification === "shared";
    if (clientUser && !visibleToClient) continue;
    const matchingQueue = notificationQueue.find((item) => item.emailDeliveryId === delivery.id && item.relatedOrderId === orderId);
    if (!matchingQueue) continue;
    items.push({
      id: delivery.id,
      at: delivery.sentAt ?? delivery.createdAt,
      channel: "email",
      recipient: delivery.recipient,
      event: delivery.subject,
      deliveryStatus: statusFromEmail(delivery.status),
      relatedAction: delivery.error ?? delivery.providerMessageId ?? delivery.plaintextPreview ?? "Email delivery attempt recorded.",
      visibleToClient
    });
  }

  for (const message of messages.filter((entry) => entry.orderId === orderId)) {
    const visibleToClient = message.channel === "Lender/client message";
    if (clientUser && !visibleToClient) continue;
    items.push({
      id: message.id,
      at: message.createdAt,
      channel: "message",
      recipient: message.channel,
      event: "Message sent",
      deliveryStatus: message.auditMetadata.externalDelivery === "Sent" ? "sent" : "created",
      relatedAction: visibleToClient || userCanSeeInternal(user) ? message.body : "You have a new message in CAS.",
      visibleToClient
    });
  }

  for (const delivery of deliveries.filter((entry) => entry.orderId === orderId)) {
    items.push({
      id: delivery.id,
      at: delivery.deliveredAt ?? "Pending delivery",
      channel: "delivery",
      recipient: delivery.recipientName,
      event: "Report delivered",
      deliveryStatus: delivery.status === "Failed" ? "failed" : delivery.status === "Viewed" ? "read" : "delivered",
      relatedAction: "Secure report delivery created. The file itself is available only after authorization.",
      visibleToClient: true
    });
  }

  for (const audit of documentAuditEvents.filter((entry) => entry.orderId === orderId && ["Delivered", "Downloaded", "Message sent"].includes(entry.event))) {
    const visibleToClient = audit.event === "Delivered" || audit.event === "Downloaded";
    if (clientUser && !visibleToClient) continue;
    items.push({
      id: audit.id,
      at: audit.at,
      channel: audit.event === "Message sent" ? "message" : "delivery",
      recipient: audit.actor,
      event: audit.event,
      deliveryStatus: audit.event === "Downloaded" ? "read" : "created",
      relatedAction: audit.detail,
      visibleToClient
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
