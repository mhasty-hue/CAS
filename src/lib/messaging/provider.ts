import type { MessageChannel, Order, OrderMessage, PortalUser } from "@/types/domain";
import { createOrderMessage } from "./service";

export type OutboundMessageInput = {
  order: Order;
  user: PortalUser;
  channel: MessageChannel;
  body: string;
};

export type MessageIntegrationResult = {
  message: OrderMessage;
  notificationEvents: string[];
};

export type MessageIntegrationProvider = {
  sendOrderMessage(input: OutboundMessageInput): Promise<MessageIntegrationResult>;
};

export const demoMessageIntegrationProvider: MessageIntegrationProvider = {
  async sendOrderMessage({ order, user, channel, body }) {
    const message = createOrderMessage(order, user, channel, body);
    const notificationEvents = [
      body.includes("@") ? "new_internal_mention" : "",
      channel === "Lender/client message" ? "new_client_message" : "",
      channel === "Appraiser message" ? "new_appraiser_message" : "",
      channel === "Reviewer comment" ? "new_reviewer_comment" : ""
    ].filter(Boolean);

    return { message, notificationEvents };
  }
};
