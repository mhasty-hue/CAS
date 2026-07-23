import type { MessageChannel, Order, OrderMessage, PortalUser } from "@/types/domain";

export function createOrderMessage(order: Order, user: PortalUser, channel: MessageChannel, body: string): OrderMessage {
  return {
    id: `msg-${Date.now()}`,
    organizationId: user.organizationId,
    orderId: order.id,
    sender: user.name,
    senderRole: user.role,
    recipients: channel === "Lender/client message" ? [order.lenderContact || order.client] : [order.appraiser, order.reviewer].filter(Boolean),
    visibility: channel === "Lender/client message" ? "Lender/client" : channel === "Appraiser message" ? "Assigned appraiser" : "Internal team",
    body,
    attachmentIds: [],
    createdAt: "Just now",
    readBy: [user.name],
    pinned: false,
    channel,
    assignedFollowUpOwner: body.includes("@") ? user.name : undefined,
    followUpDueDate: body.includes("@") ? order.dueDate : undefined,
    auditMetadata: {
      createdBy: user.name,
      externalDelivery: channel === "Lender/client message" || channel === "AMC message" ? "Queued" : "Not sent"
    }
  };
}

export function messageSearchText(message: OrderMessage) {
  return [message.sender, message.channel, message.body, message.recipients.join(" ")].join(" ").toLowerCase();
}
