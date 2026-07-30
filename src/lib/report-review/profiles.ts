import type { Order, Organization } from "@/types/domain";
import type { ReportFileKind, ReportProfileId, ReviewOverlay, ReviewOverlayId, ReviewProfile, ReviewRuleDefinition } from "@/types/report-review";

const baseReviewRuleDefinitions: ReviewRuleDefinition[] = [
  {
    id: "address-match",
    title: "Subject address matches the order",
    category: "Order match",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "client-intended-user-match",
    title: "Client and intended user align with the order",
    category: "Order match",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "report-type-product-match",
    title: "Report type matches the ordered product",
    category: "Report identity",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "effective-date-present",
    title: "Effective date is present",
    category: "Dates",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "inspection-date-present",
    title: "Inspection date is present when required",
    category: "Dates",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "signature-date-present",
    title: "Signature date is present",
    category: "Dates",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "date-ordering",
    title: "Report dates follow a logical order",
    category: "Dates",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "appraiser-signature",
    title: "Appraiser signature is present",
    category: "Signature",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "final-value-numeric",
    title: "Final value is numeric",
    category: "Report identity",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "final-value-reconciliation-match",
    title: "Final value matches reconciliation",
    category: "Report identity",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "required-sections-present",
    title: "Required report sections are present",
    category: "Required section",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS profile requirements v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "required-exhibits-present",
    title: "Required exhibits are present",
    category: "Required exhibit",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS profile requirements v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "gla-consistency",
    title: "GLA is consistent across report and sketch",
    category: "Property data",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "site-size-consistency",
    title: "Site size is consistent",
    category: "Property data",
    severityDefault: "Advisory",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "bed-bath-consistency",
    title: "Bedroom and bath counts are consistent",
    category: "Property data",
    severityDefault: "Advisory",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "comparable-sale-adjusted-values",
    title: "Comparable adjusted values are complete",
    category: "Comparable data",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "net-gross-adjustment-math",
    title: "Net and gross adjustment math is internally consistent",
    category: "Adjustment math",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "order-instructions-addressed",
    title: "Order instructions are addressed",
    category: "Client instruction",
    severityDefault: "Advisory",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS universal report QC v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "revised-version-compare",
    title: "Revised version addresses prior findings",
    category: "Revision comparison",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS revision comparison v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "fha-condition-commentary",
    title: "FHA condition and repair commentary is complete",
    category: "Program overlay",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS FHA overlay placeholder v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "va-program-exhibits",
    title: "VA program exhibits are present",
    category: "Program overlay",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS VA overlay placeholder v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "estate-retrospective-effective-date",
    title: "Retrospective effective date matches estate instruction",
    category: "Program overlay",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS estate/private-client overlay v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "litigation-purpose-disclosure",
    title: "Litigation purpose and intended-use language is present",
    category: "Program overlay",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS litigation overlay v1.0",
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "certifications-signed",
    title: "Required certifications are signed",
    category: "Signature",
    severityDefault: "Critical",
    deterministic: true,
    requiresHumanJudgment: false,
    source: "CAS conventional single-family review pack v1.0",
    effectiveFrom: "2026-07-01",
    applicableProfiles: ["legacy-conventional-single-family"],
    status: "active"
  },
  {
    id: "reconciliation-commentary-present",
    title: "Reconciliation commentary supports the final value",
    category: "Reconciliation",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS conventional single-family review pack v1.0",
    effectiveFrom: "2026-07-01",
    applicableProfiles: ["legacy-conventional-single-family"],
    status: "active"
  },
  {
    id: "adjustment-grid-balanced",
    title: "Adjustment grid balance flag is clear",
    category: "Adjustment math",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS conventional single-family review pack v1.0",
    effectiveFrom: "2026-07-01",
    applicableProfiles: ["legacy-conventional-single-family"],
    status: "active"
  },
  {
    id: "fha-case-identifier-present",
    title: "FHA case or assignment identifier is present",
    category: "FHA",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS FHA overlay v1.0",
    sourceType: "program_guidance",
    sourceReference: "Organization-maintained FHA review interpretation, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableOverlays: ["fha"],
    status: "active"
  },
  {
    id: "fha-subject-to-consistency",
    title: "FHA repair commentary and conclusion are consistent",
    category: "FHA",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS FHA overlay v1.0",
    sourceType: "program_guidance",
    sourceReference: "Organization-maintained FHA review interpretation, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableOverlays: ["fha"],
    status: "active"
  },
  {
    id: "va-case-identifier-present",
    title: "VA case or assignment identifier is present",
    category: "VA",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS VA overlay v1.0",
    sourceType: "program_guidance",
    sourceReference: "Organization-maintained VA review interpretation, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableOverlays: ["va"],
    status: "active"
  },
  {
    id: "va-mpr-review-question",
    title: "VA MPR-related observations are routed as reviewer questions",
    category: "VA",
    severityDefault: "Advisory",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS VA overlay v1.0",
    sourceType: "program_guidance",
    sourceReference: "Organization-maintained VA review interpretation, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableOverlays: ["va"],
    status: "active"
  },
  {
    id: "va-repair-conclusion-consistency",
    title: "VA repair observations align with the conclusion",
    category: "VA",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS VA overlay v1.0",
    sourceType: "program_guidance",
    sourceReference: "Organization-maintained VA review interpretation, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableOverlays: ["va"],
    status: "active"
  },
  {
    id: "retrospective-date-separation",
    title: "Report date and retrospective effective date are clearly distinguished",
    category: "Retrospective",
    severityDefault: "Warning",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS estate retrospective review pack v1.0",
    sourceType: "internal_qc",
    sourceReference: "Private-client retrospective assignment checks, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableProfiles: ["estate-retrospective"],
    applicableOverlays: ["estate"],
    status: "active"
  },
  {
    id: "post-effective-date-data-disclosure",
    title: "Post-effective-date data is identified for retrospective assignments",
    category: "Retrospective",
    severityDefault: "Advisory",
    deterministic: true,
    requiresHumanJudgment: true,
    source: "CAS estate retrospective review pack v1.0",
    sourceType: "internal_qc",
    sourceReference: "Private-client retrospective assignment checks, effective 2026-07-01",
    effectiveFrom: "2026-07-01",
    applicableProfiles: ["estate-retrospective"],
    applicableOverlays: ["estate"],
    status: "active"
  }
];

export const reviewRuleDefinitions: ReviewRuleDefinition[] = baseReviewRuleDefinitions.map((rule) => ({
  sourceType: "internal_qc",
  version: rule.source.match(/v(\d+(?:\.\d+)?)/i)?.[1] ?? "1.0",
  clientVisibleDefault: false,
  whyItMatters: "Reviewers need a traceable, explainable check before clearing the report for delivery.",
  suggestedNextStep: "Review the cited evidence, decide whether a revision is needed, and keep client visibility internal unless approved.",
  testFixtures: [rule.id],
  ...rule
}));

const universalRuleIds = [
  "address-match",
  "client-intended-user-match",
  "report-type-product-match",
  "effective-date-present",
  "inspection-date-present",
  "signature-date-present",
  "date-ordering",
  "appraiser-signature",
  "final-value-numeric",
  "final-value-reconciliation-match",
  "required-sections-present",
  "required-exhibits-present",
  "gla-consistency",
  "site-size-consistency",
  "bed-bath-consistency",
  "comparable-sale-adjusted-values",
  "net-gross-adjustment-math",
  "order-instructions-addressed",
  "revised-version-compare"
];

const conventionalSingleFamilyRuleIds = [
  "certifications-signed",
  "reconciliation-commentary-present",
  "adjustment-grid-balanced"
];

const fhaRuleIds = ["fha-case-identifier-present", "fha-condition-commentary", "fha-subject-to-consistency"];
const vaRuleIds = ["va-case-identifier-present", "va-program-exhibits", "va-mpr-review-question", "va-repair-conclusion-consistency"];
const estateRuleIds = ["estate-retrospective-effective-date", "retrospective-date-separation", "post-effective-date-data-disclosure"];

export const reviewProfiles: ReviewProfile[] = [
  {
    id: "legacy-conventional-single-family",
    name: "Legacy Conventional Single-Family",
    version: "1.0",
    reportStandard: "legacy_uad_2_6",
    description: "Legacy UAD 2.6 style single-family lending report profile.",
    productMatches: ["1004", "conventional", "urar", "single family"],
    requiredSections: ["Subject", "Contract", "Neighborhood", "Site", "Improvements", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "sketch", "map", "xml", "certification"],
    ruleIds: [...universalRuleIds, ...conventionalSingleFamilyRuleIds],
    aiReviewCategories: ["Professional judgment", "Client instruction", "Comparable data"],
    overlayIds: ["universal", "legacy-conventional"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "uad-3-6-urar",
    name: "UAD 3.6 Dynamic URAR",
    version: "0.1",
    reportStandard: "uad_3_6",
    description: "Forward-compatible UAD 3.6 data package profile.",
    productMatches: ["uad 3.6", "dynamic urar", "urar"],
    requiredSections: ["Assignment", "Subject", "Site", "Improvements", "Market", "Valuation", "Reconciliation", "Certification"],
    requiredExhibits: ["photo", "sketch", "map", "xml", "certification"],
    ruleIds: universalRuleIds,
    aiReviewCategories: ["Professional judgment", "Property data", "Comparable data"],
    overlayIds: ["universal", "uad-3-6"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "condominium",
    name: "Condominium",
    version: "1.0",
    reportStandard: "legacy_uad_2_6",
    description: "Condo report profile with project and HOA exhibit expectations.",
    productMatches: ["condo", "1073"],
    requiredSections: ["Subject", "Project", "HOA", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "map", "xml", "certification"],
    ruleIds: universalRuleIds,
    aiReviewCategories: ["Professional judgment", "Client instruction"],
    overlayIds: ["universal", "legacy-conventional"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "two-to-four-unit",
    name: "2-4 Unit",
    version: "1.0",
    reportStandard: "legacy_uad_2_6",
    description: "Small residential income property profile.",
    productMatches: ["2-4", "1025", "small residential income"],
    requiredSections: ["Subject", "Rent Schedule", "Income Approach", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "sketch", "map", "xml", "certification"],
    ruleIds: universalRuleIds,
    aiReviewCategories: ["Professional judgment", "Comparable data"],
    overlayIds: ["universal", "legacy-conventional"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "manufactured-home",
    name: "Manufactured Home",
    version: "1.0",
    reportStandard: "legacy_uad_2_6",
    description: "Manufactured home report profile.",
    productMatches: ["manufactured"],
    requiredSections: ["Subject", "Manufactured Home", "Site", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "sketch", "map", "xml", "certification"],
    ruleIds: universalRuleIds,
    aiReviewCategories: ["Professional judgment", "Property data"],
    overlayIds: ["universal", "legacy-conventional"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "desktop",
    name: "Desktop",
    version: "1.0",
    reportStandard: "non_gse",
    description: "Desktop/no physical inspection profile.",
    productMatches: ["desktop"],
    requiredSections: ["Subject", "Data Sources", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["map", "certification"],
    ruleIds: universalRuleIds.filter((ruleId) => ruleId !== "inspection-date-present"),
    aiReviewCategories: ["Professional judgment", "Comparable data"],
    overlayIds: ["universal"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "hybrid",
    name: "Hybrid",
    version: "1.0",
    reportStandard: "non_gse",
    description: "Hybrid report profile with third-party inspection artifacts.",
    productMatches: ["hybrid"],
    requiredSections: ["Subject", "Inspection Source", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "map", "certification"],
    ruleIds: universalRuleIds,
    aiReviewCategories: ["Professional judgment", "Property data"],
    overlayIds: ["universal"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "land",
    name: "Land",
    version: "1.0",
    reportStandard: "non_gse",
    description: "Land appraisal profile.",
    productMatches: ["land"],
    requiredSections: ["Subject", "Site", "Zoning", "Highest and Best Use", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "map", "certification"],
    ruleIds: universalRuleIds.filter((ruleId) => !["gla-consistency", "bed-bath-consistency"].includes(ruleId)),
    aiReviewCategories: ["Professional judgment", "Client instruction"],
    overlayIds: ["universal"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "estate-retrospective",
    name: "Estate / Retrospective",
    version: "1.0",
    reportStandard: "narrative",
    description: "Private-client estate or date-of-death retrospective profile.",
    productMatches: ["estate", "retrospective", "date-of-death"],
    requiredSections: ["Assignment", "Subject", "Effective Date", "Market", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "map", "certification"],
    ruleIds: [...universalRuleIds, ...estateRuleIds],
    aiReviewCategories: ["Professional judgment", "Client instruction"],
    overlayIds: ["universal", "private-client", "estate"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "divorce-litigation",
    name: "Divorce / Litigation",
    version: "1.0",
    reportStandard: "narrative",
    description: "Attorney or court-oriented valuation profile.",
    productMatches: ["divorce", "litigation", "attorney"],
    requiredSections: ["Assignment", "Subject", "Intended Use", "Market", "Sales Comparison", "Reconciliation", "Certifications"],
    requiredExhibits: ["photo", "map", "certification"],
    ruleIds: [...universalRuleIds, "litigation-purpose-disclosure"],
    aiReviewCategories: ["Professional judgment", "Client instruction"],
    overlayIds: ["universal", "private-client", "divorce"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "general-purpose-narrative",
    name: "General-Purpose Narrative",
    version: "1.0",
    reportStandard: "narrative",
    description: "General non-lending narrative profile.",
    productMatches: ["narrative", "consulting", "private"],
    requiredSections: ["Assignment", "Subject", "Scope", "Market", "Reconciliation", "Certification"],
    requiredExhibits: ["photo", "map", "certification"],
    ruleIds: universalRuleIds,
    aiReviewCategories: ["Professional judgment", "Client instruction"],
    overlayIds: ["universal", "private-client"],
    effectiveFrom: "2026-07-01",
    status: "active"
  }
];

export const reviewOverlays: ReviewOverlay[] = [
  {
    id: "universal",
    name: "Universal CAS QC",
    scope: "universal",
    version: "1.0",
    description: "Objective checks that apply to all report submissions.",
    ruleIds: universalRuleIds,
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "legacy-conventional",
    name: "Legacy Conventional",
    scope: "profile",
    version: "1.0",
    description: "Legacy lending report expectations.",
    ruleIds: ["required-sections-present", "required-exhibits-present"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "uad-3-6",
    name: "UAD 3.6",
    scope: "profile",
    version: "0.1",
    description: "UAD 3.6 package readiness placeholder.",
    ruleIds: ["required-sections-present", "required-exhibits-present"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "fha",
    name: "FHA",
    scope: "program",
    version: "0.1",
    description: "FHA condition and repair commentary placeholder overlay.",
    ruleIds: fhaRuleIds,
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "va",
    name: "VA",
    scope: "program",
    version: "0.1",
    description: "VA exhibit and program note placeholder overlay.",
    ruleIds: vaRuleIds,
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "private-client",
    name: "Private Client",
    scope: "program",
    version: "1.0",
    description: "Plain-language private-client deliverable expectations.",
    ruleIds: ["order-instructions-addressed"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "estate",
    name: "Estate",
    scope: "program",
    version: "1.0",
    description: "Retrospective effective-date expectations for estate work.",
    ruleIds: estateRuleIds,
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "divorce",
    name: "Divorce / Litigation",
    scope: "program",
    version: "1.0",
    description: "Attorney/court use disclosure expectations.",
    ruleIds: ["litigation-purpose-disclosure"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "lender-specific",
    name: "Lender-Specific",
    scope: "client",
    version: "0.1",
    description: "Client instruction placeholder. Exact lender guidance must be versioned before enforcement.",
    ruleIds: ["order-instructions-addressed"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "amc-specific",
    name: "AMC-Specific",
    scope: "client",
    version: "0.1",
    description: "AMC instruction placeholder. Exact AMC guidance must be versioned before enforcement.",
    ruleIds: ["order-instructions-addressed"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "organization-default",
    name: "Organization Default",
    scope: "organization",
    version: "0.1",
    description: "Organization-level QC defaults placeholder.",
    ruleIds: ["required-exhibits-present"],
    effectiveFrom: "2026-07-01",
    status: "active"
  },
  {
    id: "order-specific",
    name: "Order-Specific",
    scope: "order",
    version: "0.1",
    description: "Order-instruction overlay placeholder.",
    ruleIds: ["order-instructions-addressed"],
    effectiveFrom: "2026-07-01",
    status: "active"
  }
];

export function getReviewRule(ruleId: string) {
  return reviewRuleDefinitions.find((rule) => rule.id === ruleId);
}

export function selectReportProfile(productType: string, fileName = "", kind?: ReportFileKind): ReviewProfile {
  const product = `${productType} ${fileName} ${kind ?? ""}`.toLowerCase();
  const preferred: Array<[boolean, ReportProfileId]> = [
    [product.includes("uad 3.6") || product.includes("dynamic urar"), "uad-3-6-urar"],
    [product.includes("condo") || product.includes("1073"), "condominium"],
    [product.includes("2-4") || product.includes("1025") || product.includes("small residential income"), "two-to-four-unit"],
    [product.includes("manufactured"), "manufactured-home"],
    [product.includes("desktop"), "desktop"],
    [product.includes("hybrid"), "hybrid"],
    [product.includes("land"), "land"],
    [product.includes("estate") || product.includes("retrospective") || product.includes("date-of-death"), "estate-retrospective"],
    [product.includes("divorce") || product.includes("litigation") || product.includes("attorney"), "divorce-litigation"],
    [product.includes("narrative") || product.includes("private"), "general-purpose-narrative"]
  ];
  const match = preferred.find(([matches]) => matches)?.[1] ?? "legacy-conventional-single-family";
  return reviewProfiles.find((profile) => profile.id === match) ?? reviewProfiles[0];
}

export function selectReviewOverlays({
  order,
  profile,
  organization
}: {
  order: Order;
  profile: ReviewProfile;
  organization: Organization;
}) {
  const product = `${order.productType} ${order.loanType} ${order.amc} ${order.client}`.toLowerCase();
  const overlayIds = new Set<ReviewOverlayId>(["universal", ...profile.overlayIds, "organization-default", "order-specific"]);

  if (product.includes("fha")) overlayIds.add("fha");
  if (product.includes("va")) overlayIds.add("va");
  if (product.includes("private") || order.loanType.toLowerCase() === "private") overlayIds.add("private-client");
  if (product.includes("estate")) overlayIds.add("estate");
  if (product.includes("divorce") || product.includes("litigation")) overlayIds.add("divorce");
  if (order.client && !product.includes("private")) overlayIds.add("lender-specific");
  if (order.amc && !/^direct/i.test(order.amc)) overlayIds.add("amc-specific");
  if (organization.type === "solo_appraiser") overlayIds.add("organization-default");

  return reviewOverlays.filter((overlay) => overlayIds.has(overlay.id) && overlay.status === "active");
}

export function getActiveReviewRules(profile: ReviewProfile, overlays: ReviewOverlay[]) {
  const ruleIds = new Set([...profile.ruleIds, ...overlays.flatMap((overlay) => overlay.ruleIds)]);
  return reviewRuleDefinitions.filter((rule) => ruleIds.has(rule.id) && rule.status === "active");
}
