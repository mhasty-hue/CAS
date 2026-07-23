import type { ManagedDocument, Order, RequiredDocumentRule } from "@/types/domain";

export function matchingRequiredRules(order: Order, rules: RequiredDocumentRule[]) {
  return rules.filter((rule) => {
    const productMatch = !rule.productType || rule.productType === order.productType;
    const clientMatch = !rule.client || rule.client === order.client;
    const loanMatch = !rule.loanType || rule.loanType === order.loanType;
    const purposeMatch = !rule.appraisalPurpose || rule.appraisalPurpose === order.loanType;
    return productMatch && clientMatch && loanMatch && purposeMatch && rule.required;
  });
}

export function requiredDocumentChecklist(order: Order, documents: ManagedDocument[], rules: RequiredDocumentRule[]) {
  const orderDocuments = documents.filter((document) => document.orderId === order.id && document.status !== "Archived");
  return matchingRequiredRules(order, rules).map((rule) => {
    const matching = orderDocuments.find((document) => document.category === rule.category && !["Missing", "Failed upload"].includes(document.status));
    return {
      rule,
      document: matching,
      status: matching ? "Uploaded" as const : "Missing" as const
    };
  });
}

export function searchableDocumentText(document: ManagedDocument) {
  return [
    document.fileName,
    document.displayName,
    document.category,
    document.visibility,
    document.source,
    document.description,
    document.tags.join(" ")
  ].join(" ").toLowerCase();
}
