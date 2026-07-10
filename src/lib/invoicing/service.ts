import type { Invoice, InvoiceLineItem, InvoiceSettings, Order, Organization } from "@/types/domain";

export function buildInvoiceLineItems(order: Order): InvoiceLineItem[] {
  const rushFee = order.priority === "Rush" ? 125 : 0;
  const items: InvoiceLineItem[] = [
    {
      id: `${order.id}-appraisal-fee`,
      label: order.productType,
      description: `${order.fileNumber} appraisal assignment`,
      quantity: 1,
      unitAmount: order.fee,
      amount: order.fee,
      type: "Appraisal fee"
    },
    {
      id: `${order.id}-technology-fee`,
      label: "Technology fee",
      quantity: 1,
      unitAmount: order.techFee,
      amount: order.techFee,
      type: "Technology fee"
    }
  ];

  if (rushFee > 0) {
    items.push({
      id: `${order.id}-rush-fee`,
      label: "Rush fee",
      quantity: 1,
      unitAmount: rushFee,
      amount: rushFee,
      type: "Rush fee"
    });
  }

  return items;
}

export function calculateInvoiceTotal(lineItems: InvoiceLineItem[]) {
  return lineItems.reduce((total, item) => total + item.amount, 0);
}

export function nextInvoiceNumber(settings: InvoiceSettings, invoiceCount: number) {
  return `${settings.invoicePrefix}-${settings.nextInvoiceNumber + invoiceCount}`;
}

export function buildInvoiceFromOrder(order: Order, organization: Organization, settings: InvoiceSettings | undefined, invoiceCount: number): Invoice {
  const lineItems = buildInvoiceLineItems(order);
  const subtotal = calculateInvoiceTotal(lineItems);
  const prefixFallback = organization.name.split(" ").map((word) => word[0]).join("").slice(0, 4).toUpperCase() || "CAS";
  const invoiceNumber = settings ? nextInvoiceNumber(settings, invoiceCount) : `${prefixFallback}-INV-${Date.now().toString().slice(-6)}`;

  return {
    id: `inv-${Date.now()}`,
    organizationId: organization.id,
    orderId: order.id,
    invoiceNumber,
    client: order.client,
    billingParty: order.client,
    billToContact: order.lenderContact || order.contactName,
    lineItems,
    amount: subtotal,
    subtotal,
    taxAmount: 0,
    balanceDue: subtotal,
    status: "Draft",
    dueDate: order.dueDate,
    orderCount: 1,
    paymentTerms: settings?.defaultPaymentTerms ?? "Net 15",
    notes: settings?.defaultInvoiceNotes ?? "Generated from the appraisal assignment.",
    draftDate: new Date().toISOString().slice(0, 10)
  };
}
