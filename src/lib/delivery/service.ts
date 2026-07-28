import type { DeliveryRecord, ManagedDocument, Order, PortalUser } from "@/types/domain";

export function eligibleDeliveryFiles(order: Order, documents: ManagedDocument[]) {
  return documents.filter((document) =>
    document.orderId === order.id &&
    document.status !== "Archived" &&
    ["Appraisal report PDF", "Appraisal XML", "ENV file", "Delivery receipt"].includes(document.category)
  );
}

export function createDeliveryRecord(order: Order, user: PortalUser, documents: ManagedDocument[]): DeliveryRecord {
  const files = eligibleDeliveryFiles(order, documents);
  return {
    id: `delivery-${Date.now()}`,
    organizationId: user.organizationId,
    orderId: order.id,
    recipientName: order.lenderContact || order.client,
    recipientEmail: user.clientName ? user.email : "delivery-recipient@example.com",
    fileIds: files.map((file) => file.id),
    deliveryNote: `Secure delivery created by ${user.name}. Internal and payout documents excluded.`,
    secureLink: `/deliveries/${order.id}-${Date.now()}`,
    deliveredAt: "Just now",
    status: "Delivered",
    deliveryReceiptDocumentId: undefined,
    losHookStatus: "Not configured",
    emailHookStatus: "Development log"
  };
}

export function markDeliveredFilesClientVisible(documents: ManagedDocument[], delivery: DeliveryRecord) {
  const deliveredFileIds = new Set(delivery.fileIds);
  return documents.map((document) =>
    deliveredFileIds.has(document.id)
      ? {
          ...document,
          visibility: "Delivery recipient" as const,
          status: document.category === "Appraisal report PDF" || document.category === "Appraisal XML" || document.category === "ENV file" ? "Final" as const : document.status,
          auditMetadata: {
            ...document.auditMetadata,
            lastAction: "Delivered",
            lastActionAt: "Just now"
          }
        }
      : document
  );
}
