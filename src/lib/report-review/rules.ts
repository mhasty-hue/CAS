import type { Order, Organization, PortalUser } from "@/types/domain";
import type {
  AppraisalReportVersion,
  ExtractedField,
  NormalizedAppraisalReport,
  ReportReviewResult,
  ReviewFinding,
  ReviewFindingEvidence,
  ReviewFindingStatus,
  ReviewOverlay,
  ReviewOverlayId,
  ReviewProfile,
  ReviewSeverity
} from "@/types/report-review";
import { getReviewRulePacks } from "@/lib/report-review/rule-packs";
import { getActiveReviewRules, getReviewRule } from "@/lib/report-review/profiles";

const reviewRunVersion = "cas-deterministic-qc-1.0";

type RuleContext = {
  order: Order;
  organization: Organization;
  user: PortalUser;
  report: NormalizedAppraisalReport;
  reportVersion: AppraisalReportVersion;
  profile: ReviewProfile;
  overlays: ReviewOverlay[];
  previousVersion?: AppraisalReportVersion;
  createdAt?: string;
};

type FindingDraft = {
  ruleId: string;
  overlayId?: ReviewOverlayId;
  title?: string;
  description: string;
  severity: ReviewSeverity;
  status?: ReviewFindingStatus;
  evidence?: ReviewFindingEvidence[];
  orderEvidence?: ReviewFindingEvidence[];
  suggestedResolution: string;
  requiresHumanJudgment?: boolean;
};

const openStatuses = new Set<ReviewFindingStatus>(["Open", "Confirmed", "Appraiser Responded", "Clarification Requested", "Escalated", "Revision Requested", "Reopened"]);

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeAddress(parts: Array<string | null | undefined>) {
  return normalizeText(parts.filter(Boolean).join(" "));
}

function numberText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Missing";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function fieldValue(field: ExtractedField<unknown> | undefined) {
  const value = field?.value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "Missing";
  return String(value);
}

function evidenceFromField(label: string, field: ExtractedField<unknown> | undefined): ReviewFindingEvidence {
  return {
    label,
    value: fieldValue(field),
    sourceFileName: field?.sourceFileName,
    sourcePage: field?.sourcePage,
    xmlPath: field?.xmlPath
  };
}

function dateOrNull(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.slice(0, 10) === b.slice(0, 10));
}

function withinTolerance(a: number | null | undefined, b: number | null | undefined, tolerance = 1) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return Math.abs(a - b) <= tolerance;
}

function ruleOverlay(ruleId: string, overlays: ReviewOverlay[]): ReviewOverlayId {
  return overlays.find((overlay) => overlay.ruleIds.includes(ruleId))?.id ?? "universal";
}

function createFinding(context: RuleContext, draft: FindingDraft): ReviewFinding {
  const rule = getReviewRule(draft.ruleId);
  const status = draft.status ?? (draft.severity === "Passed" ? "Resolved" : "Open");
  const visibility = draft.severity === "Passed" ? ["internal" as const] : ["internal" as const, "appraiser" as const];
  return {
    id: `${context.reportVersion.id}-${draft.ruleId}`,
    organizationId: context.organization.id,
    orderId: context.order.id,
    reportVersionId: context.reportVersion.id,
    ruleId: draft.ruleId,
    profileId: context.profile.id,
    overlayId: draft.overlayId ?? ruleOverlay(draft.ruleId, context.overlays),
    title: draft.title ?? rule?.title ?? draft.ruleId,
    description: draft.description,
    category: rule?.category ?? "Professional judgment",
    severity: draft.severity,
    status,
    evidence: draft.evidence ?? [],
    orderEvidence: draft.orderEvidence ?? [],
    ruleSource: rule?.source ?? "CAS deterministic review",
    ruleVersion: rule?.version ?? "1.0",
    ruleSourceReference: rule?.sourceReference,
    whyItMatters: rule?.whyItMatters ?? "This check helps the reviewer confirm the report is complete, consistent, and aligned with the assignment before delivery.",
    suggestedResolution: draft.suggestedResolution,
    requiresHumanJudgment: draft.requiresHumanJudgment ?? rule?.requiresHumanJudgment ?? true,
    deterministic: rule?.deterministic ?? true,
    visibility,
    createdAt: context.createdAt ?? "2026-07-27T12:00:00Z",
    updatedAt: context.createdAt ?? "2026-07-27T12:00:00Z"
  };
}

function pass(context: RuleContext, ruleId: string, description: string, evidence?: ReviewFindingEvidence[]) {
  return createFinding(context, {
    ruleId,
    severity: "Passed",
    description,
    evidence,
    suggestedResolution: "No action needed."
  });
}

function orderEvidence(label: string, value: string) {
  return { label, value };
}

export function summarizeReviewFindings(findings: ReviewFinding[]) {
  const summary = findings.reduce(
    (counts, finding) => {
      counts[finding.severity] += 1;
      if (finding.severity !== "Passed" && openStatuses.has(finding.status)) counts.openFindings += 1;
      return counts;
    },
    { Critical: 0, Warning: 0, Advisory: 0, Passed: 0, openFindings: 0 }
  );
  const hasCritical = findings.some((finding) => finding.severity === "Critical" && openStatuses.has(finding.status));
  const hasWarning = findings.some((finding) => finding.severity === "Warning" && openStatuses.has(finding.status));
  const hasAdvisory = findings.some((finding) => finding.severity === "Advisory" && openStatuses.has(finding.status));
  return {
    ...summary,
    overallStatus: hasCritical ? "Blocked" as const : hasWarning ? "Revision Recommended" as const : hasAdvisory ? "Needs Review" as const : "Passed" as const
  };
}

export function runDeterministicReview(context: RuleContext): ReportReviewResult {
  const { order, report, profile, overlays } = context;
  const activeRuleIds = new Set(getActiveReviewRules(profile, overlays).map((rule) => rule.id));
  const findings: ReviewFinding[] = [];
  const add = (ruleId: string, factory: () => ReviewFinding) => {
    if (activeRuleIds.has(ruleId)) findings.push(factory());
  };

  add("address-match", () => {
    const orderAddress = normalizeAddress([order.address, order.city, order.state, order.zip]);
    const reportAddress = normalizeAddress([report.subject.address.value, report.subject.city.value, report.subject.state.value, report.subject.zip.value]);
    if (orderAddress && orderAddress === reportAddress) {
      return pass(context, "address-match", "Report subject address matches the order.", [
        evidenceFromField("Report address", report.subject.address),
        orderEvidence("Order address", `${order.address}, ${order.city}, ${order.state} ${order.zip}`)
      ]);
    }
    return createFinding(context, {
      ruleId: "address-match",
      severity: "Critical",
      description: "The subject address extracted from the report does not match the order address.",
      evidence: [
        evidenceFromField("Report address", report.subject.address),
        evidenceFromField("Report city", report.subject.city),
        evidenceFromField("Report state", report.subject.state),
        evidenceFromField("Report ZIP", report.subject.zip)
      ],
      orderEvidence: [orderEvidence("Order address", `${order.address}, ${order.city}, ${order.state} ${order.zip}`)],
      suggestedResolution: "Confirm the subject property and upload a corrected report if the report references the wrong property.",
      requiresHumanJudgment: false
    });
  });

  add("client-intended-user-match", () => {
    const clientMatch = normalizeText(report.reportIdentity.clientName.value).includes(normalizeText(order.client));
    const intendedUser = normalizeText(report.reportIdentity.intendedUser.value);
    if (clientMatch || intendedUser.includes(normalizeText(order.client))) {
      return pass(context, "client-intended-user-match", "Client or intended user aligns with the order.", [
        evidenceFromField("Report client", report.reportIdentity.clientName),
        evidenceFromField("Intended user", report.reportIdentity.intendedUser)
      ]);
    }
    return createFinding(context, {
      ruleId: "client-intended-user-match",
      severity: "Warning",
      description: "The extracted client or intended user does not clearly align with the ordering client.",
      evidence: [evidenceFromField("Report client", report.reportIdentity.clientName), evidenceFromField("Intended user", report.reportIdentity.intendedUser)],
      orderEvidence: [orderEvidence("Order client", order.client)],
      suggestedResolution: "Review intended-user language and revise if the order client is omitted or incorrect.",
      requiresHumanJudgment: true
    });
  });

  add("report-type-product-match", () => {
    const product = normalizeText(order.productType);
    const reportType = normalizeText(report.reportIdentity.reportType.value);
    const compatible = product.includes(reportType) || reportType.includes(product) || product.includes("1004") && reportType.includes("1004") || product.includes("urar") && reportType.includes("urar");
    if (compatible) {
      return pass(context, "report-type-product-match", "Report type is compatible with the ordered product.", [evidenceFromField("Report type", report.reportIdentity.reportType)]);
    }
    return createFinding(context, {
      ruleId: "report-type-product-match",
      severity: "Warning",
      description: "The extracted report type does not clearly match the ordered product.",
      evidence: [evidenceFromField("Report type", report.reportIdentity.reportType)],
      orderEvidence: [orderEvidence("Ordered product", order.productType)],
      suggestedResolution: "Verify the correct report form/profile was used before delivery.",
      requiresHumanJudgment: false
    });
  });

  add("effective-date-present", () => {
    if (report.valueDates.effectiveDate.value) {
      return pass(context, "effective-date-present", "Effective date is present.", [evidenceFromField("Effective date", report.valueDates.effectiveDate)]);
    }
    return createFinding(context, {
      ruleId: "effective-date-present",
      severity: "Critical",
      description: "No effective date was extracted from the report.",
      evidence: [evidenceFromField("Effective date", report.valueDates.effectiveDate)],
      suggestedResolution: "Add or correct the effective date before review approval.",
      requiresHumanJudgment: false
    });
  });

  add("inspection-date-present", () => {
    if (report.valueDates.inspectionDate.value || profile.id === "desktop") {
      return pass(context, "inspection-date-present", "Inspection date requirement is satisfied.", [evidenceFromField("Inspection date", report.valueDates.inspectionDate)]);
    }
    return createFinding(context, {
      ruleId: "inspection-date-present",
      severity: "Warning",
      description: "No inspection date was extracted even though this profile usually requires one.",
      evidence: [evidenceFromField("Inspection date", report.valueDates.inspectionDate)],
      orderEvidence: [orderEvidence("Order inspection", order.inspectionDate ?? "Not scheduled")],
      suggestedResolution: "Confirm inspection scope and update the report date fields.",
      requiresHumanJudgment: false
    });
  });

  add("signature-date-present", () => {
    if (report.valueDates.signatureDate.value) {
      return pass(context, "signature-date-present", "Signature date is present.", [evidenceFromField("Signature date", report.valueDates.signatureDate)]);
    }
    return createFinding(context, {
      ruleId: "signature-date-present",
      severity: "Critical",
      description: "No appraiser signature date was extracted from the report.",
      evidence: [evidenceFromField("Signature date", report.valueDates.signatureDate)],
      suggestedResolution: "Upload a signed report or correct the signature page.",
      requiresHumanJudgment: false
    });
  });

  add("date-ordering", () => {
    const effectiveDate = dateOrNull(report.valueDates.effectiveDate.value);
    const inspectionDate = dateOrNull(report.valueDates.inspectionDate.value);
    const signatureDate = dateOrNull(report.valueDates.signatureDate.value);
    const valid = Boolean(effectiveDate && signatureDate && (!inspectionDate || signatureDate >= inspectionDate));
    if (valid) {
      return pass(context, "date-ordering", "Signature and inspection dates are in a logical order.", [
        evidenceFromField("Inspection date", report.valueDates.inspectionDate),
        evidenceFromField("Signature date", report.valueDates.signatureDate)
      ]);
    }
    return createFinding(context, {
      ruleId: "date-ordering",
      severity: "Warning",
      description: "The date sequence should be reviewed before delivery.",
      evidence: [
        evidenceFromField("Effective date", report.valueDates.effectiveDate),
        evidenceFromField("Inspection date", report.valueDates.inspectionDate),
        evidenceFromField("Signature date", report.valueDates.signatureDate)
      ],
      suggestedResolution: "Confirm the inspection, effective, and signature dates. Revise any transcription or signing errors.",
      requiresHumanJudgment: true
    });
  });

  add("appraiser-signature", () => {
    if (report.appraiser.signed.value) {
      return pass(context, "appraiser-signature", "Appraiser signature was detected.", [evidenceFromField("Appraiser signed", report.appraiser.signed)]);
    }
    return createFinding(context, {
      ruleId: "appraiser-signature",
      severity: "Critical",
      description: "The appraiser signature was not detected.",
      evidence: [evidenceFromField("Appraiser signed", report.appraiser.signed), evidenceFromField("Appraiser", report.appraiser.name)],
      suggestedResolution: "Upload the signed report package before review approval.",
      requiresHumanJudgment: false
    });
  });

  add("final-value-numeric", () => {
    if (typeof report.reconciliation.finalValue.value === "number") {
      return pass(context, "final-value-numeric", "Final value is numeric.", [evidenceFromField("Final value", report.reconciliation.finalValue)]);
    }
    return createFinding(context, {
      ruleId: "final-value-numeric",
      severity: "Critical",
      description: "The final value could not be extracted as a number.",
      evidence: [evidenceFromField("Final value", report.reconciliation.finalValue)],
      suggestedResolution: "Correct the reconciliation value field and resubmit.",
      requiresHumanJudgment: false
    });
  });

  add("final-value-reconciliation-match", () => {
    if (withinTolerance(report.reconciliation.finalValue.value, report.reconciliation.indicatedValue.value, 1)) {
      return pass(context, "final-value-reconciliation-match", "Final value matches the reconciliation indication.", [
        evidenceFromField("Final value", report.reconciliation.finalValue),
        evidenceFromField("Reconciliation indicated value", report.reconciliation.indicatedValue)
      ]);
    }
    return createFinding(context, {
      ruleId: "final-value-reconciliation-match",
      severity: "Warning",
      description: "The final value does not match the reconciliation indication extracted from the report.",
      evidence: [
        evidenceFromField("Final value", report.reconciliation.finalValue),
        evidenceFromField("Reconciliation indicated value", report.reconciliation.indicatedValue)
      ],
      suggestedResolution: "Reviewer should confirm whether this is a report inconsistency or an extraction issue.",
      requiresHumanJudgment: true
    });
  });

  add("required-sections-present", () => {
    const missing = profile.requiredSections.filter((section) => !report.sections[section]?.value);
    if (!missing.length) {
      return pass(context, "required-sections-present", "Required sections are present.", profile.requiredSections.map((section) => evidenceFromField(section, report.sections[section])));
    }
    return createFinding(context, {
      ruleId: "required-sections-present",
      severity: "Warning",
      description: `Missing required section${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
      evidence: missing.map((section) => evidenceFromField(section, report.sections[section])),
      suggestedResolution: "Confirm the report package includes the required sections for this profile.",
      requiresHumanJudgment: false
    });
  });

  add("required-exhibits-present", () => {
    const presentKinds = new Set(report.attachments.concat(report.photos, report.sketch, report.maps, report.addenda).filter((item) => item.present.value).map((item) => item.kind));
    const missing = profile.requiredExhibits.filter((kind) => !presentKinds.has(kind));
    if (!missing.length) {
      return pass(context, "required-exhibits-present", "Required exhibits are present.");
    }
    return createFinding(context, {
      ruleId: "required-exhibits-present",
      severity: "Warning",
      description: `Missing required exhibit${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
      evidence: missing.map((kind) => ({ label: kind, value: "Missing" })),
      suggestedResolution: "Attach the missing exhibit or document why it does not apply.",
      requiresHumanJudgment: false
    });
  });

  add("gla-consistency", () => {
    if (!report.improvements.sketchGla || withinTolerance(report.improvements.gla.value, report.improvements.sketchGla.value, 1)) {
      return pass(context, "gla-consistency", "GLA fields are consistent.", [
        evidenceFromField("Report GLA", report.improvements.gla),
        evidenceFromField("Sketch GLA", report.improvements.sketchGla)
      ]);
    }
    return createFinding(context, {
      ruleId: "gla-consistency",
      severity: "Warning",
      description: "The GLA extracted from the report does not match the sketch/supporting exhibit.",
      evidence: [evidenceFromField("Report GLA", report.improvements.gla), evidenceFromField("Sketch GLA", report.improvements.sketchGla)],
      suggestedResolution: "Confirm the correct GLA and update the report or sketch support.",
      requiresHumanJudgment: true
    });
  });

  add("site-size-consistency", () => {
    if (!report.site.statedSiteSizeAcres || withinTolerance(report.site.siteSizeAcres.value, report.site.statedSiteSizeAcres.value, 0.01)) {
      return pass(context, "site-size-consistency", "Site size fields are consistent.", [
        evidenceFromField("Site size", report.site.siteSizeAcres),
        evidenceFromField("Stated site size", report.site.statedSiteSizeAcres)
      ]);
    }
    return createFinding(context, {
      ruleId: "site-size-consistency",
      severity: "Advisory",
      description: "Site size differs between extracted report fields.",
      evidence: [evidenceFromField("Site size", report.site.siteSizeAcres), evidenceFromField("Stated site size", report.site.statedSiteSizeAcres)],
      suggestedResolution: "Reviewer should confirm parcel source and whether rounding explains the difference.",
      requiresHumanJudgment: true
    });
  });

  add("bed-bath-consistency", () => {
    const bedsOk = !report.improvements.sketchBedrooms || withinTolerance(report.improvements.bedrooms.value, report.improvements.sketchBedrooms.value, 0);
    const bathsOk = !report.improvements.sketchBaths || withinTolerance(report.improvements.baths.value, report.improvements.sketchBaths.value, 0);
    if (bedsOk && bathsOk) {
      return pass(context, "bed-bath-consistency", "Bedroom and bath counts are consistent.", [
        evidenceFromField("Bedrooms", report.improvements.bedrooms),
        evidenceFromField("Baths", report.improvements.baths)
      ]);
    }
    return createFinding(context, {
      ruleId: "bed-bath-consistency",
      severity: "Advisory",
      description: "Bedroom or bath counts differ between report fields and support data.",
      evidence: [
        evidenceFromField("Report bedrooms", report.improvements.bedrooms),
        evidenceFromField("Sketch bedrooms", report.improvements.sketchBedrooms),
        evidenceFromField("Report baths", report.improvements.baths),
        evidenceFromField("Sketch baths", report.improvements.sketchBaths)
      ],
      suggestedResolution: "Confirm room counts and note whether the difference is a support-data issue.",
      requiresHumanJudgment: true
    });
  });

  add("certifications-signed", () => {
    if (report.certifications.signedCertification.value && report.certifications.limitingConditions.value) {
      return pass(context, "certifications-signed", "Signed certification and limiting conditions were detected.", [
        evidenceFromField("Signed certification", report.certifications.signedCertification),
        evidenceFromField("Limiting conditions", report.certifications.limitingConditions)
      ]);
    }
    return createFinding(context, {
      ruleId: "certifications-signed",
      severity: "Critical",
      description: "The report package does not appear to include a complete signed certification and limiting conditions.",
      evidence: [
        evidenceFromField("Signed certification", report.certifications.signedCertification),
        evidenceFromField("Limiting conditions", report.certifications.limitingConditions)
      ],
      suggestedResolution: "Upload the signed certification pages or confirm the extraction result before delivery.",
      requiresHumanJudgment: false
    });
  });

  add("reconciliation-commentary-present", () => {
    const commentary = normalizeText(report.reconciliation.commentary.value);
    if (commentary.length >= 24) {
      return pass(context, "reconciliation-commentary-present", "Reconciliation commentary is present for reviewer consideration.", [evidenceFromField("Reconciliation commentary", report.reconciliation.commentary)]);
    }
    return createFinding(context, {
      ruleId: "reconciliation-commentary-present",
      severity: "Warning",
      description: "The report does not appear to include enough reconciliation commentary to support the final conclusion.",
      evidence: [evidenceFromField("Reconciliation commentary", report.reconciliation.commentary)],
      suggestedResolution: "Reviewer should confirm whether reconciliation explains comparable weighting and final value selection.",
      requiresHumanJudgment: true
    });
  });

  add("adjustment-grid-balanced", () => {
    if (report.adjustments.adjustmentGridBalanced.value) {
      return pass(context, "adjustment-grid-balanced", "Adjustment grid balance flag is clear.", [evidenceFromField("Adjustment grid balanced", report.adjustments.adjustmentGridBalanced)]);
    }
    return createFinding(context, {
      ruleId: "adjustment-grid-balanced",
      severity: "Warning",
      description: "The adjustment grid balance flag suggests the sales comparison grid needs reviewer attention.",
      evidence: [evidenceFromField("Adjustment grid balanced", report.adjustments.adjustmentGridBalanced)],
      suggestedResolution: "Check the adjustment rows and calculated indications. Treat this as a review prompt, not a value conclusion.",
      requiresHumanJudgment: true
    });
  });

  add("comparable-sale-adjusted-values", () => {
    const missing = report.comparableSales.filter((sale) => sale.salePrice.value === null || sale.adjustedValue.value === null);
    if (!missing.length) {
      return pass(context, "comparable-sale-adjusted-values", "Comparable sale and adjusted value fields are complete.");
    }
    return createFinding(context, {
      ruleId: "comparable-sale-adjusted-values",
      severity: "Warning",
      description: "One or more comparable sales are missing sale price or adjusted value data.",
      evidence: missing.flatMap((sale) => [evidenceFromField(`${sale.id} sale price`, sale.salePrice), evidenceFromField(`${sale.id} adjusted value`, sale.adjustedValue)]),
      suggestedResolution: "Review the sales comparison grid and correct missing comparable values.",
      requiresHumanJudgment: true
    });
  });

  add("net-gross-adjustment-math", () => {
    const inconsistent = report.comparableSales.filter((sale) =>
      !withinTolerance(sale.netAdjustment.value, sale.calculatedNetAdjustment.value, 1) ||
      !withinTolerance(sale.grossAdjustment.value, sale.calculatedGrossAdjustment.value, 1)
    );
    if (!inconsistent.length) {
      return pass(context, "net-gross-adjustment-math", "Comparable net and gross adjustment math is consistent.");
    }
    return createFinding(context, {
      ruleId: "net-gross-adjustment-math",
      severity: "Warning",
      description: "Comparable adjustment totals do not match the calculated net/gross adjustments.",
      evidence: inconsistent.flatMap((sale) => [
        evidenceFromField(`${sale.id} net adjustment`, sale.netAdjustment),
        evidenceFromField(`${sale.id} calculated net`, sale.calculatedNetAdjustment),
        evidenceFromField(`${sale.id} gross adjustment`, sale.grossAdjustment),
        evidenceFromField(`${sale.id} calculated gross`, sale.calculatedGrossAdjustment)
      ]),
      suggestedResolution: "Check adjustment formulas and revise the report if the grid totals are incorrect.",
      requiresHumanJudgment: true
    });
  });

  add("order-instructions-addressed", () => {
    const responses = report.orderInstructionResponses.value ?? [];
    if (responses.length > 0) {
      return pass(context, "order-instructions-addressed", "Order instructions have at least one mapped response.", [evidenceFromField("Instruction responses", report.orderInstructionResponses)]);
    }
    return createFinding(context, {
      ruleId: "order-instructions-addressed",
      severity: "Advisory",
      description: "No extracted response was mapped to the order instructions.",
      evidence: [evidenceFromField("Instruction responses", report.orderInstructionResponses)],
      orderEvidence: [orderEvidence("Order next action", order.nextAction), orderEvidence("Access/instructions", order.accessInfo)],
      suggestedResolution: "Confirm required client or order-specific instructions are addressed in the report.",
      requiresHumanJudgment: true
    });
  });

  add("revised-version-compare", () => {
    if (!report.versionComparison) {
      return pass(context, "revised-version-compare", "No prior report version requires comparison.");
    }
    if (!report.versionComparison.unresolvedFindingIds.length) {
      return pass(context, "revised-version-compare", "Revised report appears to resolve prior open findings.", [
        { label: "Resolved findings", value: report.versionComparison.resolvedFindingIds.join(", ") || "None" },
        { label: "Changed sections", value: report.versionComparison.changedSections.join(", ") || "Not detected" }
      ]);
    }
    return createFinding(context, {
      ruleId: "revised-version-compare",
      severity: "Warning",
      description: "The revised report may not address every prior open finding.",
      evidence: [
        { label: "Resolved findings", value: report.versionComparison.resolvedFindingIds.join(", ") || "None" },
        { label: "Unresolved findings", value: report.versionComparison.unresolvedFindingIds.join(", ") }
      ],
      suggestedResolution: "Reviewer should compare the revised report to the prior revision request before approval.",
      requiresHumanJudgment: true
    });
  });

  add("fha-condition-commentary", () => {
    const commentary = normalizeText(report.improvements.conditionCommentary?.value);
    if (commentary.includes("condition") && (commentary.includes("repair") || commentary.includes("utilities") || commentary.includes("fha"))) {
      return pass(context, "fha-condition-commentary", "FHA condition commentary is present.", [evidenceFromField("Condition commentary", report.improvements.conditionCommentary)]);
    }
    return createFinding(context, {
      ruleId: "fha-condition-commentary",
      overlayId: "fha",
      severity: "Critical",
      description: "FHA condition or repair commentary is missing or too thin for review routing.",
      evidence: [evidenceFromField("Condition commentary", report.improvements.conditionCommentary)],
      suggestedResolution: "Add clear FHA condition/repair commentary and supporting photo references, or explain why no repairs are required.",
      requiresHumanJudgment: true
    });
  });

  add("fha-case-identifier-present", () => {
    const identifier = normalizeText(report.reportIdentity.loanNumber?.value);
    if (identifier.includes("fha") || identifier.length >= 6) {
      return pass(context, "fha-case-identifier-present", "FHA case or assignment identifier is present where extractable.", [evidenceFromField("FHA/loan identifier", report.reportIdentity.loanNumber)]);
    }
    return createFinding(context, {
      ruleId: "fha-case-identifier-present",
      overlayId: "fha",
      severity: "Warning",
      description: "CAS could not identify an FHA case or assignment identifier in the extracted report data.",
      evidence: [evidenceFromField("FHA/loan identifier", report.reportIdentity.loanNumber)],
      suggestedResolution: "Confirm the case identifier in the report or order package before delivery.",
      requiresHumanJudgment: true
    });
  });

  add("fha-subject-to-consistency", () => {
    const commentary = normalizeText(report.improvements.conditionCommentary?.value);
    const finalCommentary = normalizeText(report.reconciliation.commentary.value);
    const repairLanguage = commentary.includes("repair") || commentary.includes("subjectto") || finalCommentary.includes("subjectto");
    if (repairLanguage && commentary.includes("photo")) {
      return pass(context, "fha-subject-to-consistency", "FHA repair commentary and support appear internally consistent.", [
        evidenceFromField("Condition commentary", report.improvements.conditionCommentary),
        evidenceFromField("Reconciliation commentary", report.reconciliation.commentary)
      ]);
    }
    return createFinding(context, {
      ruleId: "fha-subject-to-consistency",
      overlayId: "fha",
      severity: "Warning",
      description: "Review may be warranted because FHA repair, subject-to, or condition support is not clearly reconciled.",
      evidence: [
        evidenceFromField("Condition commentary", report.improvements.conditionCommentary),
        evidenceFromField("Reconciliation commentary", report.reconciliation.commentary)
      ],
      suggestedResolution: "Confirm whether repairs are required, whether the conclusion is as-is or subject-to, and whether photo/addendum support is present.",
      requiresHumanJudgment: true
    });
  });

  add("va-program-exhibits", () => {
    const hasPhotos = report.photos.some((photo) => photo.present.value);
    const hasMap = report.maps.some((map) => map.present.value);
    if (hasPhotos && hasMap) {
      return pass(context, "va-program-exhibits", "VA exhibit placeholder requirements are satisfied.");
    }
    return createFinding(context, {
      ruleId: "va-program-exhibits",
      overlayId: "va",
      severity: "Warning",
      description: "VA placeholder exhibit check needs reviewer attention.",
      evidence: [{ label: "Photos", value: hasPhotos ? "Present" : "Missing" }, { label: "Map", value: hasMap ? "Present" : "Missing" }],
      suggestedResolution: "Confirm the required VA exhibits are included before delivery.",
      requiresHumanJudgment: true
    });
  });

  add("va-case-identifier-present", () => {
    const identifier = normalizeText(report.reportIdentity.loanNumber?.value);
    if (identifier.includes("va") || identifier.length >= 6) {
      return pass(context, "va-case-identifier-present", "VA case or assignment identifier is present where extractable.", [evidenceFromField("VA/loan identifier", report.reportIdentity.loanNumber)]);
    }
    return createFinding(context, {
      ruleId: "va-case-identifier-present",
      overlayId: "va",
      severity: "Warning",
      description: "CAS could not identify a VA case or assignment identifier in the extracted report data.",
      evidence: [evidenceFromField("VA/loan identifier", report.reportIdentity.loanNumber)],
      suggestedResolution: "Confirm the VA assignment identifier in the report or order package before delivery.",
      requiresHumanJudgment: true
    });
  });

  add("va-mpr-review-question", () => {
    const commentary = normalizeText(report.improvements.conditionCommentary?.value);
    const concernTerms = ["mpr", "repair", "roof", "water", "sewage", "access", "heating", "safety", "structure"];
    const hasConcern = concernTerms.some((term) => commentary.includes(term));
    if (!hasConcern) {
      return pass(context, "va-mpr-review-question", "No VA MPR-related review question was detected from extracted condition commentary.", [evidenceFromField("Condition commentary", report.improvements.conditionCommentary)]);
    }
    return createFinding(context, {
      ruleId: "va-mpr-review-question",
      overlayId: "va",
      severity: "Advisory",
      description: "Potential VA MPR-related language was detected. Human judgment required; CAS is routing this as a reviewer question.",
      evidence: [evidenceFromField("Condition commentary", report.improvements.conditionCommentary)],
      suggestedResolution: "Reviewer should confirm whether the observation is adequately addressed and whether any repair conclusion is consistent.",
      requiresHumanJudgment: true
    });
  });

  add("va-repair-conclusion-consistency", () => {
    const commentary = normalizeText(report.improvements.conditionCommentary?.value);
    const reconciliation = normalizeText(report.reconciliation.commentary.value);
    const mentionsRepair = commentary.includes("repair") || commentary.includes("subjectto");
    const reconciled = reconciliation.includes("repair") || reconciliation.includes("subjectto") || reconciliation.includes("asis");
    if (!mentionsRepair || reconciled) {
      return pass(context, "va-repair-conclusion-consistency", "VA repair observations appear consistent with the conclusion language.", [
        evidenceFromField("Condition commentary", report.improvements.conditionCommentary),
        evidenceFromField("Reconciliation commentary", report.reconciliation.commentary)
      ]);
    }
    return createFinding(context, {
      ruleId: "va-repair-conclusion-consistency",
      overlayId: "va",
      severity: "Warning",
      description: "Repair-related VA commentary does not appear to be reconciled with the final conclusion language.",
      evidence: [
        evidenceFromField("Condition commentary", report.improvements.conditionCommentary),
        evidenceFromField("Reconciliation commentary", report.reconciliation.commentary)
      ],
      suggestedResolution: "Confirm whether the report is as-is or subject-to and whether the repair observation is addressed before release.",
      requiresHumanJudgment: true
    });
  });

  add("estate-retrospective-effective-date", () => {
    const retrospectiveDate = report.valueDates.retrospectiveDate?.value;
    if (retrospectiveDate && sameDay(retrospectiveDate, report.valueDates.effectiveDate.value)) {
      return pass(context, "estate-retrospective-effective-date", "Retrospective effective date matches the estate instruction.", [
        evidenceFromField("Retrospective date", report.valueDates.retrospectiveDate),
        evidenceFromField("Effective date", report.valueDates.effectiveDate)
      ]);
    }
    return createFinding(context, {
      ruleId: "estate-retrospective-effective-date",
      overlayId: "estate",
      severity: "Critical",
      description: "The effective date does not match the retrospective estate date extracted from the order/report package.",
      evidence: [evidenceFromField("Retrospective date", report.valueDates.retrospectiveDate), evidenceFromField("Effective date", report.valueDates.effectiveDate)],
      suggestedResolution: "Confirm the intended retrospective valuation date and update the report or order notes before release.",
      requiresHumanJudgment: true
    });
  });

  add("retrospective-date-separation", () => {
    const effectiveDate = report.valueDates.effectiveDate.value;
    const signatureDate = report.valueDates.signatureDate.value;
    const retrospectiveDate = report.valueDates.retrospectiveDate?.value;
    if (retrospectiveDate && effectiveDate && signatureDate && !sameDay(retrospectiveDate, signatureDate)) {
      return pass(context, "retrospective-date-separation", "Report date and retrospective effective date are distinguishable.", [
        evidenceFromField("Retrospective date", report.valueDates.retrospectiveDate),
        evidenceFromField("Signature date", report.valueDates.signatureDate)
      ]);
    }
    return createFinding(context, {
      ruleId: "retrospective-date-separation",
      overlayId: "estate",
      severity: "Warning",
      description: "The report date and retrospective effective date are not clearly distinguishable in the extracted fields.",
      evidence: [
        evidenceFromField("Retrospective date", report.valueDates.retrospectiveDate),
        evidenceFromField("Effective date", report.valueDates.effectiveDate),
        evidenceFromField("Signature date", report.valueDates.signatureDate)
      ],
      suggestedResolution: "Confirm the date-of-death or retrospective valuation date is clearly stated apart from the report/signature date.",
      requiresHumanJudgment: true
    });
  });

  add("post-effective-date-data-disclosure", () => {
    const assumptions = report.extraordinaryAssumptions.value ?? [];
    const referencesRetrospectiveData = assumptions.some((item) => normalizeText(item).includes("retrospective") || normalizeText(item).includes("dateofdeath"));
    if (referencesRetrospectiveData) {
      return pass(context, "post-effective-date-data-disclosure", "Retrospective data handling is identified in assumptions or addenda.", [evidenceFromField("Extraordinary assumptions", report.extraordinaryAssumptions)]);
    }
    return createFinding(context, {
      ruleId: "post-effective-date-data-disclosure",
      overlayId: "estate",
      severity: "Advisory",
      description: "The report does not appear to explain how retrospective or post-effective-date data was handled.",
      evidence: [evidenceFromField("Extraordinary assumptions", report.extraordinaryAssumptions)],
      suggestedResolution: "Reviewer should confirm whether data after the effective date is identified and appropriately discussed.",
      requiresHumanJudgment: true
    });
  });

  add("litigation-purpose-disclosure", () => {
    const intendedUse = normalizeText(report.reportIdentity.intendedUser.value);
    if (intendedUse.includes("attorney") || intendedUse.includes("litigation") || intendedUse.includes("court") || intendedUse.includes("divorce")) {
      return pass(context, "litigation-purpose-disclosure", "Litigation/divorce intended-use language is present.", [evidenceFromField("Intended user", report.reportIdentity.intendedUser)]);
    }
    return createFinding(context, {
      ruleId: "litigation-purpose-disclosure",
      overlayId: "divorce",
      severity: "Warning",
      description: "Attorney/court intended-use language was not detected.",
      evidence: [evidenceFromField("Intended user", report.reportIdentity.intendedUser)],
      suggestedResolution: "Reviewer should confirm the report is suitable for the attorney/court use before release.",
      requiresHumanJudgment: true
    });
  });

  const summary = summarizeReviewFindings(findings);
  const rulePacks = getReviewRulePacks(profile, overlays);
  return {
    id: `${context.reportVersion.id}-review`,
    organizationId: context.organization.id,
    orderId: order.id,
    reportVersionId: context.reportVersion.id,
    profileId: profile.id,
    overlayIds: overlays.map((overlay) => overlay.id),
    rulePackSummary: rulePacks.map((pack) => ({ id: pack.id, name: pack.name, version: pack.version, ruleCount: pack.ruleIds.length })),
    runMode: "review_queue",
    ruleRunVersion: reviewRunVersion,
    aiProviderStatus: "disabled",
    safetyNotice: "Automated findings are quality-control aids only. CAS does not determine value, alter conclusions, or reject a report without human review.",
    findings,
    summary,
    createdAt: context.createdAt ?? "2026-07-27T12:00:00Z",
    createdBy: context.user.name,
    auditSummary: `Ran ${findings.length} deterministic report checks against ${profile.name} ${profile.version} using ${rulePacks.map((pack) => `${pack.name} ${pack.version}`).join(", ")}. Final value ${numberText(report.reconciliation.finalValue.value)} was not changed.`
  };
}

export function updateReviewFindingStatus(
  result: ReportReviewResult,
  findingId: string,
  status: ReviewFindingStatus,
  actor: string,
  severity?: ReviewSeverity
): ReportReviewResult {
  const findings = result.findings.map((finding) =>
    finding.id === findingId
      ? {
          ...finding,
          status,
          severity: severity ?? finding.severity,
          resolvedBy: ["Dismissed", "Resolved", "Accepted Explanation", "Corrected", "Not Applicable"].includes(status) ? actor : finding.resolvedBy,
          reviewerResponse: `Reviewer marked finding ${status.toLowerCase()} in CAS.`,
          aiMetadata: finding.aiMetadata
            ? {
                ...finding.aiMetadata,
                humanDisposition: ["Dismissed", "Not Applicable"].includes(status)
                  ? "dismissed"
                  : ["Resolved", "Corrected", "Accepted Explanation"].includes(status)
                    ? "accepted"
                    : status === "Confirmed"
                      ? "confirmed"
                      : finding.aiMetadata.humanDisposition
              }
            : finding.aiMetadata,
          updatedAt: "Just now"
        }
      : finding
  );
  return { ...result, findings, summary: summarizeReviewFindings(findings) };
}

export function respondToReviewFinding(result: ReportReviewResult, findingId: string, response: string, actor: string): ReportReviewResult {
  const findings = result.findings.map((finding) =>
    finding.id === findingId
      ? {
          ...finding,
          status: "Appraiser Responded" as const,
          appraiserResponse: response,
          updatedAt: "Just now",
          evidence: [...finding.evidence, { label: "Appraiser response", value: response }]
        }
      : finding
  );
  return { ...result, findings, summary: summarizeReviewFindings(findings), auditSummary: `${actor} responded to an automated report review finding.` };
}

export function releaseFindingToClient(result: ReportReviewResult, findingId: string, actor: string): ReportReviewResult {
  const findings = result.findings.map((finding) =>
    finding.id === findingId
      ? {
          ...finding,
          visibility: finding.visibility.includes("client") ? finding.visibility : [...finding.visibility, "client" as const],
          reviewerResponse: "Reviewer approved this item for client-visible revision communication.",
          updatedAt: "Just now",
          resolvedBy: actor
        }
      : finding
  );
  return { ...result, findings, summary: summarizeReviewFindings(findings) };
}
