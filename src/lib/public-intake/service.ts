import type { PublicOrderPurpose, PublicOrderRequest } from "@/types/domain";

export type PublicOrderRequestInput = {
  organizationId: string;
  requesterName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: string;
  purpose: PublicOrderPurpose;
  intendedUse: string;
  ownerBorrowerName: string;
  accessContact: string;
  preferredContactMethod: "Email" | "Phone" | "Text";
  requestedTiming: string;
  comments: string;
  consentAccepted: boolean;
  documentCount: number;
};

export function createPendingPublicOrderRequest(input: PublicOrderRequestInput): PublicOrderRequest {
  const now = new Date();
  const id = `public-req-${now.getTime()}`;

  return {
    id,
    ...input,
    status: "Pending review",
    submittedAt: now.toISOString(),
    auditTrail: [
      {
        id: `${id}-audit-1`,
        action: "Public request submitted",
        actor: input.requesterName,
        at: "Just now"
      }
    ]
  };
}

export function publicRequestToOrderSeed(request: PublicOrderRequest) {
  const [address = request.propertyAddress, city = "Atlanta", stateZip = "GA 30339"] = request.propertyAddress.split(", ");
  const [state = "GA", zip = "30339"] = stateZip.split(" ");

  return {
    borrower: request.ownerBorrowerName,
    address,
    city,
    state,
    zip,
    propertyType: request.propertyType,
    contactName: request.requesterName,
    contactPhone: request.phone,
    accessInfo: request.accessContact,
    loanType: request.purpose,
    lenderContact: request.email,
    assignmentPreference: request.requestedTiming,
    nextAction: "Staff review public intake and complete professional fields"
  };
}
