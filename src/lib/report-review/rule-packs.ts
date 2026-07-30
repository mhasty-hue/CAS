import type { ReportProfileId, ReviewOverlay, ReviewOverlayId, ReviewProfile } from "@/types/report-review";

export type ReviewRulePackLayer = "universal" | "profile" | "program" | "client" | "organization" | "order";

export type ReviewRulePack = {
  id: string;
  name: string;
  layer: ReviewRulePackLayer;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: "draft" | "active" | "retired";
  profileIds: ReportProfileId[];
  overlayIds: ReviewOverlayId[];
  ruleIds: string[];
  sourceReference: string;
  description: string;
};

export const reviewRulePacks: ReviewRulePack[] = [
  {
    id: "pack-universal-qc-v1",
    name: "Universal CAS QC",
    layer: "universal",
    version: "1.0",
    effectiveFrom: "2026-07-01",
    status: "active",
    profileIds: [],
    overlayIds: ["universal"],
    ruleIds: [
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
      "required-exhibits-present"
    ],
    sourceReference: "CAS deterministic review baseline, effective 2026-07-01",
    description: "Objective identity, date, signature, exhibit, and assignment-match checks applied before profile or program overlays."
  },
  {
    id: "pack-legacy-conventional-single-family-v1",
    name: "Legacy Conventional Single-Family",
    layer: "profile",
    version: "1.0",
    effectiveFrom: "2026-07-01",
    status: "active",
    profileIds: ["legacy-conventional-single-family"],
    overlayIds: ["legacy-conventional"],
    ruleIds: [
      "gla-consistency",
      "site-size-consistency",
      "bed-bath-consistency",
      "comparable-sale-adjusted-values",
      "net-gross-adjustment-math",
      "certifications-signed",
      "reconciliation-commentary-present",
      "adjustment-grid-balanced"
    ],
    sourceReference: "CAS conventional single-family review pack, effective 2026-07-01",
    description: "Reliable deterministic checks for legacy single-family reports. Judgment-based concerns are phrased as reviewer prompts."
  },
  {
    id: "pack-fha-single-family-overlay-v1",
    name: "FHA Single-Family Overlay",
    layer: "program",
    version: "1.0",
    effectiveFrom: "2026-07-01",
    status: "active",
    profileIds: ["legacy-conventional-single-family", "uad-3-6-urar"],
    overlayIds: ["fha"],
    ruleIds: ["fha-case-identifier-present", "fha-condition-commentary", "fha-subject-to-consistency", "order-instructions-addressed"],
    sourceReference: "Organization-maintained FHA review interpretation, effective 2026-07-01",
    description: "FHA-specific condition, repair, case identifier, and instruction checks. CAS does not determine FHA eligibility."
  },
  {
    id: "pack-va-single-family-overlay-v1",
    name: "VA Single-Family Overlay",
    layer: "program",
    version: "1.0",
    effectiveFrom: "2026-07-01",
    status: "active",
    profileIds: ["legacy-conventional-single-family", "uad-3-6-urar"],
    overlayIds: ["va"],
    ruleIds: ["va-case-identifier-present", "va-program-exhibits", "va-mpr-review-question", "va-repair-conclusion-consistency", "order-instructions-addressed"],
    sourceReference: "Organization-maintained VA review interpretation, effective 2026-07-01",
    description: "VA-specific identifier, exhibit, MPR-question routing, and repair-consistency checks. CAS does not declare MPR failure."
  },
  {
    id: "pack-estate-retrospective-v1",
    name: "Estate / Retrospective",
    layer: "profile",
    version: "1.0",
    effectiveFrom: "2026-07-01",
    status: "active",
    profileIds: ["estate-retrospective"],
    overlayIds: ["estate", "private-client"],
    ruleIds: ["estate-retrospective-effective-date", "retrospective-date-separation", "post-effective-date-data-disclosure", "order-instructions-addressed"],
    sourceReference: "Private-client retrospective assignment checks, effective 2026-07-01",
    description: "Retrospective assignment checks that avoid mortgage-specific assumptions unless the order explicitly requires them."
  },
  {
    id: "pack-uad-3-6-foundation-v0-1",
    name: "UAD 3.6 Foundation",
    layer: "profile",
    version: "0.1",
    effectiveFrom: "2026-07-01",
    status: "active",
    profileIds: ["uad-3-6-urar"],
    overlayIds: ["uad-3-6"],
    ruleIds: ["required-sections-present", "required-exhibits-present", "gla-consistency", "site-size-consistency"],
    sourceReference: "CAS UAD 3.6 readiness foundation, not a complete production UAD 3.6 library",
    description: "Forward-compatible UAD 3.6 package foundation. It intentionally does not claim a complete final UAD 3.6 rule library."
  }
];

export function getReviewRulePacks(profile: ReviewProfile, overlays: ReviewOverlay[]) {
  const overlayIds = new Set(overlays.map((overlay) => overlay.id));
  return reviewRulePacks.filter((pack) =>
    pack.status === "active" &&
    (pack.profileIds.includes(profile.id) || pack.overlayIds.some((overlayId) => overlayIds.has(overlayId)))
  );
}
