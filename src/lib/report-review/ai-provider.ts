import type { AiReviewProvider, AiReviewProviderResult, ReviewFinding, ReviewFindingEvidence, ReviewFindingCategory, ReviewSeverity } from "@/types/report-review";
import { getReviewRulePacks } from "@/lib/report-review/rule-packs";

export const disabledAiReviewProvider: AiReviewProvider = {
  id: "disabled",
  label: "AI review provider disabled",
  analyze(): AiReviewProviderResult {
    return {
      enabled: false,
      status: "disabled",
      findings: [],
      message: "AI-assisted report review is disabled. CAS ran only deterministic checks for this report."
    };
  }
};

const demoCreatedAt = "2026-07-27T12:00:00Z";

function hasUsableEvidence(evidence: ReviewFindingEvidence[]) {
  return evidence.some((item) => item.value && item.value !== "Missing" && (item.sourcePage || item.xmlPath || item.sourceFileName));
}

function aiEvidence(label: string, value: string | number | boolean | null | undefined, sourceFileName?: string, sourcePage?: number, xmlPath?: string): ReviewFindingEvidence {
  return {
    label,
    value: value === null || value === undefined || value === "" ? "Missing" : String(value),
    sourceFileName,
    sourcePage,
    xmlPath
  };
}

function createDemoAiFinding({
  id,
  title,
  category,
  severity,
  description,
  evidence,
  orderId,
  organizationId,
  reportVersionId,
  profileId,
  overlayId,
  suggestedResolution,
  settings,
  reviewPackIds,
  confidence,
  evidenceQuality
}: {
  id: string;
  title: string;
  category: ReviewFindingCategory;
  severity: Exclude<ReviewSeverity, "Passed">;
  description: string;
  evidence: ReviewFindingEvidence[];
  orderId: string;
  organizationId: string;
  reportVersionId: string;
  profileId: ReviewFinding["profileId"];
  overlayId: ReviewFinding["overlayId"];
  suggestedResolution: string;
  settings: NonNullable<Parameters<AiReviewProvider["analyze"]>[0]["settings"]>;
  reviewPackIds: string[];
  confidence: number;
  evidenceQuality: "high" | "medium" | "low" | "unverified";
}): ReviewFinding | null {
  if (!hasUsableEvidence(evidence)) return null;

  return {
    id: `${reportVersionId}-${id}`,
    organizationId,
    orderId,
    reportVersionId,
    ruleId: id,
    profileId,
    overlayId,
    title,
    description,
    category,
    severity,
    status: "Open",
    evidence,
    orderEvidence: [],
    ruleSource: "CAS demo AI-assisted review pilot",
    ruleVersion: settings.promptTemplateVersion,
    ruleSourceReference: "Fictional deterministic demo provider. No external report data was sent.",
    whyItMatters: "This is an evidence-grounded reviewer prompt. It is not a report rejection, value conclusion, or automatic revision request.",
    suggestedResolution,
    requiresHumanJudgment: true,
    deterministic: false,
    aiAssisted: true,
    aiMetadata: {
      providerId: settings.providerId,
      modelId: settings.modelId,
      promptTemplateVersion: settings.promptTemplateVersion,
      reportVersionId,
      reviewPackIds,
      confidence,
      evidenceQuality,
      category: id,
      createdAt: demoCreatedAt,
      humanDisposition: "pending"
    },
    visibility: settings.preSubmissionAllowed && !settings.reviewerOnlyMode ? ["internal", "appraiser"] : ["internal"],
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt
  };
}

export const demoAiReviewProvider: AiReviewProvider = {
  id: "cas-demo-ai",
  label: "CAS demo AI review pilot",
  analyze({ order, report, reportVersion, profile, overlays, settings }): AiReviewProviderResult {
    if (!settings?.enabled || settings.providerId !== "cas-demo-ai") {
      return {
        enabled: false,
        status: "not_configured",
        findings: [],
        message: "AI-assisted review is not configured for this organization."
      };
    }

    if (!settings.permittedReportProfileIds.includes(profile.id)) {
      return {
        enabled: true,
        status: "not_configured",
        findings: [],
        message: "AI-assisted review is not enabled for this report profile."
      };
    }

    const reviewPacks = getReviewRulePacks(profile, overlays);
    const reviewPackIds = reviewPacks.map((pack) => pack.id);
    const overlayIds = new Set(overlays.map((overlay) => overlay.id));
    const proposals: Array<ReviewFinding | null> = [];
    const condition = report.improvements.conditionCommentary;
    const reconciliation = report.reconciliation.commentary;
    const instructionResponses = report.orderInstructionResponses;

    if (settings.enabledCategories.includes("reconciliation_quality") && String(reconciliation.value ?? "").length < 80) {
      proposals.push(createDemoAiFinding({
        id: "ai-reconciliation-quality",
        title: "Reconciliation wording may need reviewer confirmation",
        category: "Reconciliation",
        severity: "Advisory",
        description: "The reconciliation text appears brief. CAS could not verify whether comparable weighting is fully explained from the extracted text alone.",
        evidence: [aiEvidence("Reconciliation commentary", reconciliation.value, reconciliation.sourceFileName, reconciliation.sourcePage, reconciliation.xmlPath)],
        orderId: order.id,
        organizationId: reportVersion.organizationId,
        reportVersionId: reportVersion.id,
        profileId: profile.id,
        overlayId: "universal",
        suggestedResolution: "Reviewer should confirm whether the report explains final value selection and comparable weighting.",
        settings,
        reviewPackIds,
        confidence: 0.62,
        evidenceQuality: "medium"
      }));
    }

    if (settings.enabledCategories.includes("assignment_instruction_response") && (instructionResponses.value ?? []).length === 0) {
      proposals.push(createDemoAiFinding({
        id: "ai-assignment-instruction-response",
        title: "Order instructions may need clearer report response",
        category: "Client instruction",
        severity: "Advisory",
        description: "No extracted response was mapped to the assignment instructions. This may be an extraction gap or a report-response gap.",
        evidence: [aiEvidence("Instruction responses", (instructionResponses.value ?? []).join(", "), instructionResponses.sourceFileName, instructionResponses.sourcePage, instructionResponses.xmlPath)],
        orderId: order.id,
        organizationId: reportVersion.organizationId,
        reportVersionId: reportVersion.id,
        profileId: profile.id,
        overlayId: "order-specific",
        suggestedResolution: "Reviewer should compare the assignment instructions against the report addenda before sending a revision request.",
        settings,
        reviewPackIds,
        confidence: 0.52,
        evidenceQuality: "low"
      }));
    }

    if (overlayIds.has("fha") && settings.enabledCategories.includes("condition_inconsistency")) {
      proposals.push(createDemoAiFinding({
        id: "ai-fha-condition-question",
        title: "FHA condition commentary may need support",
        category: "FHA",
        severity: "Advisory",
        description: "The extracted FHA condition language appears thin. CAS is routing this as a reviewer question, not a repair requirement.",
        evidence: [aiEvidence("Condition commentary", condition?.value, condition?.sourceFileName, condition?.sourcePage, condition?.xmlPath)],
        orderId: order.id,
        organizationId: reportVersion.organizationId,
        reportVersionId: reportVersion.id,
        profileId: profile.id,
        overlayId: "fha",
        suggestedResolution: "Reviewer should confirm whether utilities, repair commentary, and photo/addendum references are adequately addressed.",
        settings,
        reviewPackIds,
        confidence: 0.68,
        evidenceQuality: "medium"
      }));
    }

    if (overlayIds.has("va") && settings.enabledCategories.includes("condition_inconsistency")) {
      proposals.push(createDemoAiFinding({
        id: "ai-va-condition-question",
        title: "VA condition observation should be reviewed",
        category: "VA",
        severity: "Advisory",
        description: "The extracted condition text includes a repair-oriented observation. CAS is routing this as a reviewer question.",
        evidence: [aiEvidence("Condition commentary", condition?.value, condition?.sourceFileName, condition?.sourcePage, condition?.xmlPath)],
        orderId: order.id,
        organizationId: reportVersion.organizationId,
        reportVersionId: reportVersion.id,
        profileId: profile.id,
        overlayId: "va",
        suggestedResolution: "Reviewer should confirm whether the repair observation is adequately reconciled with the report conclusion.",
        settings,
        reviewPackIds,
        confidence: 0.66,
        evidenceQuality: "medium"
      }));
    }

    if (overlayIds.has("estate") && settings.enabledCategories.includes("retrospective_methodology")) {
      proposals.push(createDemoAiFinding({
        id: "ai-retrospective-methodology",
        title: "Retrospective methodology may need confirmation",
        category: "Retrospective",
        severity: "Advisory",
        description: "The report references a retrospective assignment. CAS could not fully verify methodology support from the extracted fields alone.",
        evidence: [
          aiEvidence("Retrospective date", report.valueDates.retrospectiveDate?.value, report.valueDates.retrospectiveDate?.sourceFileName, report.valueDates.retrospectiveDate?.sourcePage, report.valueDates.retrospectiveDate?.xmlPath),
          aiEvidence("Extraordinary assumptions", report.extraordinaryAssumptions.value?.join(", "), report.extraordinaryAssumptions.sourceFileName, report.extraordinaryAssumptions.sourcePage, report.extraordinaryAssumptions.xmlPath)
        ],
        orderId: order.id,
        organizationId: reportVersion.organizationId,
        reportVersionId: reportVersion.id,
        profileId: profile.id,
        overlayId: "estate",
        suggestedResolution: "Reviewer should confirm that retrospective property characteristics and data timing are explained before release.",
        settings,
        reviewPackIds,
        confidence: 0.6,
        evidenceQuality: "medium"
      }));
    }

    const findings = proposals.filter((finding): finding is ReviewFinding => Boolean(finding));
    const rejectedFindings = proposals.length - findings.length;

    return {
      enabled: true,
      status: "completed",
      findings,
      rejectedFindings,
      metadata: {
        providerId: settings.providerId,
        modelId: settings.modelId,
        promptTemplateVersion: settings.promptTemplateVersion,
        status: "completed",
        categoriesRequested: settings.enabledCategories,
        message: "Demo AI review completed with evidence-gated fictional findings.",
        startedAt: demoCreatedAt,
        completedAt: demoCreatedAt,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0
        }
      },
      message: rejectedFindings
        ? `Demo AI review completed. ${rejectedFindings} proposed finding(s) were rejected for insufficient evidence.`
        : "Demo AI review completed with evidence-grounded reviewer prompts."
    };
  }
};

export const unavailableAiReviewProvider: AiReviewProvider = {
  id: "external-unavailable",
  label: "External AI review provider unavailable",
  analyze({ settings, reportVersion }): AiReviewProviderResult {
    return {
      enabled: Boolean(settings?.enabled),
      status: "failed",
      findings: [],
      rejectedFindings: 0,
      metadata: {
        providerId: settings?.providerId ?? "external",
        modelId: settings?.modelId ?? "unconfigured",
        promptTemplateVersion: settings?.promptTemplateVersion ?? "unconfigured",
        status: "failed",
        categoriesRequested: settings?.enabledCategories ?? [],
        message: "Automated deterministic checks completed. AI-assisted review was unavailable.",
        startedAt: demoCreatedAt,
        completedAt: demoCreatedAt
      },
      message: `AI-assisted review was unavailable for ${reportVersion.id}. Deterministic checks still completed.`
    };
  }
};

export function resolveAiReviewProvider(settings?: Parameters<AiReviewProvider["analyze"]>[0]["settings"]) {
  if (!settings?.enabled || settings.providerId === "disabled") {
    return disabledAiReviewProvider;
  }

  if (settings.providerId === "cas-demo-ai") {
    return demoAiReviewProvider;
  }

  return unavailableAiReviewProvider;
}
