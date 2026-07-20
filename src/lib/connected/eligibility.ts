import type { VendorCountyCoverage } from "@/types/domain";

export type BidEligibilityRequest = {
  state: string;
  county: string;
  productType: string;
  requiredSpecialties: string[];
  capacityRulesEnabled?: boolean;
  nearbyCounties?: string[];
};

export type BidEligibilityResult = {
  eligible: VendorCountyCoverage[];
  nearby: VendorCountyCoverage[];
  excluded: VendorCountyCoverage[];
  directCoverageFound: boolean;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesNormalized(values: string[], target: string) {
  const normalizedTarget = normalize(target);
  return values.some((value) => normalize(value) === normalizedTarget || normalizedTarget.includes(normalize(value)) || normalize(value).includes(normalizedTarget));
}

function productMatches(coverage: VendorCountyCoverage, productType: string) {
  return coverage.productTypes.length === 0 || includesNormalized(coverage.productTypes, productType);
}

function specialtyMatches(coverage: VendorCountyCoverage, requiredSpecialties: string[]) {
  return requiredSpecialties.every((specialty) => includesNormalized(coverage.specialties, specialty));
}

function hardRequirementFailures(coverage: VendorCountyCoverage, request: BidEligibilityRequest, checkCounty: boolean) {
  const failures: string[] = [];

  if (checkCounty && (normalize(coverage.state) !== normalize(request.state) || normalize(coverage.county) !== normalize(request.county))) {
    failures.push("Does not cover the subject county");
  }

  if (coverage.approvalStatus !== "approved") failures.push("Not approved by the sending organization");
  if (coverage.licenseStatus !== "current" && coverage.licenseStatus !== "expires_soon") failures.push("License is not current");
  if (coverage.eoStatus !== "current" && coverage.eoStatus !== "expires_soon") failures.push("E&O is not current");
  if (coverage.w9Status !== "on_file") failures.push("W-9 is not on file");
  if (coverage.activeStatus !== "active") failures.push("Vendor is not active");
  if (!coverage.acceptingWork) failures.push("Not accepting new work");
  if (coverage.blocked) failures.push("Blocked by organization policy");
  if (!productMatches(coverage, request.productType)) failures.push("Does not support this product type");
  if (!specialtyMatches(coverage, request.requiredSpecialties)) failures.push("Required specialty is missing");
  if (request.capacityRulesEnabled && coverage.capacityStatus === "overloaded") failures.push("Capacity rule excludes overloaded vendors");

  return failures;
}

export function evaluateBidEligibility(coverages: VendorCountyCoverage[], request: BidEligibilityRequest): BidEligibilityResult {
  const nearbyCountySet = new Set((request.nearbyCounties ?? []).map(normalize));
  const evaluated = coverages.map((coverage) => {
    const directFailures = hardRequirementFailures(coverage, request, true);
    const directMatch = directFailures.length === 0;
    const baseFailures = hardRequirementFailures(coverage, request, false);
    const nearbyMatch =
      !directMatch &&
      baseFailures.length === 0 &&
      normalize(coverage.state) === normalize(request.state) &&
      nearbyCountySet.has(normalize(coverage.county));

    if (directMatch) {
      return {
        ...coverage,
        eligibilityStatus: "eligible" as const,
        reason: "Approved, compliant, and directly covers the subject county.",
        exclusionReasons: []
      };
    }

    if (nearbyMatch) {
      return {
        ...coverage,
        eligibilityStatus: "nearby" as const,
        reason: "Compliant nearby county coverage. Ask the vendor to confirm this assignment before sending.",
        exclusionReasons: []
      };
    }

    return {
      ...coverage,
      eligibilityStatus: "excluded" as const,
      reason: directFailures[0] ?? "Does not meet bid requirements.",
      exclusionReasons: directFailures.length ? directFailures : baseFailures
    };
  });

  const eligible = evaluated.filter((coverage) => coverage.eligibilityStatus === "eligible");
  const nearby = evaluated.filter((coverage) => coverage.eligibilityStatus === "nearby");
  const excluded = evaluated.filter((coverage) => coverage.eligibilityStatus === "excluded");

  return {
    eligible,
    nearby: eligible.length ? [] : nearby,
    excluded,
    directCoverageFound: eligible.length > 0
  };
}
