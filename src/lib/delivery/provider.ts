import type { DeliveryRecord, ManagedDocument, Order, PortalUser } from "@/types/domain";
import { createDeliveryRecord, eligibleDeliveryFiles } from "./service";

export type ReportDeliveryInput = {
  order: Order;
  user: PortalUser;
  documents: ManagedDocument[];
  recipientEmail?: string;
};

export type ReportDeliveryProvider = {
  deliverFinalReport(input: ReportDeliveryInput): Promise<DeliveryRecord>;
  eligibleFiles(order: Order, documents: ManagedDocument[]): ManagedDocument[];
};

export const demoReportDeliveryProvider: ReportDeliveryProvider = {
  async deliverFinalReport({ order, user, documents }) {
    return createDeliveryRecord(order, user, documents);
  },
  eligibleFiles(order, documents) {
    return eligibleDeliveryFiles(order, documents);
  }
};
