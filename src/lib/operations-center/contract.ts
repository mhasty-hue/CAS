import type { OperationsCenterModel } from "@/lib/operations-center/service";

export type OperationsCenterContractResult =
  | { ok: true; model: OperationsCenterModel }
  | { ok: false; issues: string[] };

const forbiddenPayloadKeys = [
  "orders",
  "accountingEntries",
  "invoices",
  "clients",
  "companyUsers",
  "appraisers",
  "vendors",
  "vendorDocuments",
  "clientFee",
  "vendorFee",
  "margin",
  "companyMargin",
  "appraiserPayout",
  "commissionSplitOverride",
  "internalNotes",
  "auditTrail"
];

function hasObjectShape(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function findForbiddenKeys(value: unknown, path = "model", found = new Set<string>()) {
  if (!value || typeof value !== "object") return found;

  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${path}[${index}]`, found));
    return found;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPayloadKeys.includes(key)) found.add(`${path}.${key}`);
    findForbiddenKeys(child, `${path}.${key}`, found);
  }

  return found;
}

export function validateOperationsCenterModel(model: OperationsCenterModel): OperationsCenterContractResult {
  const issues: string[] = [];

  if (!hasObjectShape(model)) {
    return { ok: false, issues: ["Operations Center payload is not an object."] };
  }

  if (!hasString(model.greeting)) issues.push("Missing greeting.");
  if (!hasString(model.dateLabel)) issues.push("Missing date label.");
  if (!hasString(model.organizationName)) issues.push("Missing organization name.");
  if (!hasObjectShape(model.activeUser) || !hasString(model.activeUser.id) || !hasString(model.activeUser.displayName) || !hasString(model.activeUser.role)) {
    issues.push("Missing active user summary.");
  }
  if (!hasObjectShape(model.activeOrganization) || !hasString(model.activeOrganization.id) || !hasString(model.activeOrganization.name) || !hasString(model.activeOrganization.type)) {
    issues.push("Missing active organization summary.");
  }
  if (!hasString(model.persona)) issues.push("Missing operations persona.");
  if (!hasObjectShape(model.scope)) {
    issues.push("Missing scope.");
  } else {
    if (!Array.isArray(model.scope.visibleOrderIds)) issues.push("Scope visible order ids must be an array.");
    if (!hasNumber(model.scope.orderCount)) issues.push("Scope order count must be numeric.");
    if (!Array.isArray(model.scope.financialPolicy)) issues.push("Scope financial policy must be an array.");
  }

  for (const key of ["missionItems", "snapshots", "riskQueue", "upcoming", "activity", "quickActions", "capacityInsights", "vendorScorecards"] as const) {
    if (!Array.isArray(model[key])) issues.push(`${key} must be an array.`);
  }

  if (!hasObjectShape(model.recommendation)) issues.push("Missing appraiser recommendation object.");
  if (!hasString(model.emptyState)) issues.push("Missing empty state.");
  if (!hasString(model.generatedAt)) issues.push("Missing generation timestamp.");
  if (!hasObjectShape(model.freshness) || !hasString(model.freshness.source) || !hasString(model.freshness.generatedAt)) {
    issues.push("Missing data freshness indicator.");
  }

  const forbidden = Array.from(findForbiddenKeys(model));
  if (forbidden.length) {
    issues.push(`Payload contains forbidden raw or hidden fields: ${forbidden.join(", ")}.`);
  }

  const visibleOrderIds = new Set(model.scope?.visibleOrderIds ?? []);
  for (const item of model.missionItems ?? []) {
    const scopedOrderIds = hasObjectShape(item) && Array.isArray(item.scopedOrderIds) ? item.scopedOrderIds : [];
    const unauthorizedIds = scopedOrderIds.filter((orderId) => typeof orderId === "string" && !visibleOrderIds.has(orderId));
    if (unauthorizedIds.length) issues.push(`Mission item ${String(hasObjectShape(item) ? item.id : "unknown")} references non-visible orders.`);
  }

  return issues.length ? { ok: false, issues } : { ok: true, model };
}

export function assertOperationsCenterModel(model: OperationsCenterModel): OperationsCenterModel {
  const validation = validateOperationsCenterModel(model);
  if (!validation.ok) {
    throw new Error(`Operations Center model failed contract validation: ${validation.issues.join(" ")}`);
  }
  return validation.model;
}
