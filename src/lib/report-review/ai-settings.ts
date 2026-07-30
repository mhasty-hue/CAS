import type { OrganizationAiReviewSettings, ReportProfileId } from "@/types/report-review";
import type { PortalUser } from "@/types/domain";

const allPilotProfiles: ReportProfileId[] = [
  "legacy-conventional-single-family",
  "uad-3-6-urar",
  "estate-retrospective",
  "divorce-litigation"
];

export function defaultAiReviewSettings(organizationId: string): OrganizationAiReviewSettings {
  return {
    organizationId,
    enabled: false,
    providerId: "disabled",
    modelId: "none",
    promptTemplateVersion: "cas-ai-review-pilot-disabled",
    permittedReportProfileIds: [],
    preSubmissionAllowed: false,
    reviewerOnlyMode: true,
    dataRetention: "none",
    humanApprovalRequired: true,
    enabledCategories: [],
    maxContentBytes: 0,
    clientVisibleAiWordingProhibited: true
  };
}

export function demoAiReviewSettings(organizationId: string): OrganizationAiReviewSettings {
  return {
    organizationId,
    enabled: true,
    providerId: "cas-demo-ai",
    modelId: "cas-demo-evidence-reviewer-v1",
    promptTemplateVersion: "cas-ai-review-pilot-v0.1",
    permittedReportProfileIds: allPilotProfiles,
    preSubmissionAllowed: true,
    reviewerOnlyMode: false,
    dataRetention: "none",
    humanApprovalRequired: true,
    enabledCategories: [
      "narrative_contradiction",
      "missing_explanation",
      "reconciliation_quality",
      "condition_inconsistency",
      "adjustment_support",
      "comparable_selection_explanation",
      "assignment_instruction_response",
      "retrospective_methodology"
    ],
    maxContentBytes: 256_000,
    monthlyCostLimitUsd: 0,
    clientVisibleAiWordingProhibited: true
  };
}

export function userCanManageAiReviewSettings(user: PortalUser) {
  return user.role === "super_admin" || user.role === "company_admin" || user.role === "amc_admin";
}
