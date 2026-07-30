import type { Order, Organization, PortalUser } from "@/types/domain";

export type ReportFileKind =
  | "pdf_report"
  | "legacy_xml"
  | "uad_3_6_xml"
  | "uad_3_6_package"
  | "addendum"
  | "photo_exhibit"
  | "sketch"
  | "map"
  | "invoice"
  | "other";

export type ExtractionMethod =
  | "pdf_text"
  | "legacy_xml_path"
  | "uad_3_6_data_point"
  | "demo_parser"
  | "manual_entry"
  | "computed"
  | "ai_assisted_placeholder";

export type FieldVerificationStatus =
  | "unverified"
  | "matched_order"
  | "mismatch"
  | "missing"
  | "manual_confirmed"
  | "not_applicable";

export type ExtractedField<T = string> = {
  key: string;
  label: string;
  value: T | null;
  normalizedValue?: string;
  sourceFileId: string;
  sourceFileName: string;
  sourcePage?: number;
  xmlPath?: string;
  method: ExtractionMethod;
  confidence: number;
  verificationStatus: FieldVerificationStatus;
  notes?: string;
};

export type ReportProfileId =
  | "legacy-conventional-single-family"
  | "uad-3-6-urar"
  | "condominium"
  | "two-to-four-unit"
  | "manufactured-home"
  | "desktop"
  | "hybrid"
  | "land"
  | "estate-retrospective"
  | "divorce-litigation"
  | "general-purpose-narrative";

export type ReviewOverlayId =
  | "universal"
  | "legacy-conventional"
  | "uad-3-6"
  | "fha"
  | "va"
  | "private-client"
  | "estate"
  | "divorce"
  | "lender-specific"
  | "amc-specific"
  | "organization-default"
  | "order-specific";

export type ReviewOverlayScope = "universal" | "profile" | "program" | "client" | "organization" | "order";
export type ReviewAssetKind = "photo" | "sketch" | "map" | "addendum" | "contract" | "xml" | "certification" | "invoice" | "other";
export type ReviewFindingCategory =
  | "Order match"
  | "Report identity"
  | "Dates"
  | "Signature"
  | "Required section"
  | "Required exhibit"
  | "Property data"
  | "Comparable data"
  | "Adjustment math"
  | "Reconciliation"
  | "Program overlay"
  | "FHA"
  | "VA"
  | "Retrospective"
  | "Client instruction"
  | "Revision comparison"
  | "Extraction"
  | "Professional judgment";
export type ReviewSeverity = "Critical" | "Warning" | "Advisory" | "Passed";
export type ReviewFindingStatus =
  | "Open"
  | "Appraiser Responded"
  | "Corrected"
  | "Accepted Explanation"
  | "Dismissed"
  | "Escalated"
  | "Revision Requested"
  | "Resolved";
export type ReviewFindingVisibility = "internal" | "appraiser" | "client";
export type ReviewRunMode = "pre_submission" | "review_queue" | "revision_compare";
export type ReviewProfileStatus = "draft" | "active" | "retired";

export type ReviewRuleDefinition = {
  id: string;
  title: string;
  category: ReviewFindingCategory;
  severityDefault: ReviewSeverity;
  deterministic: boolean;
  requiresHumanJudgment: boolean;
  source: string;
  sourceType?: "internal_qc" | "program_guidance" | "client_instruction" | "organization_policy" | "order_instruction";
  sourceReference?: string;
  version?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  applicableProfiles?: ReportProfileId[];
  applicableOverlays?: ReviewOverlayId[];
  whyItMatters?: string;
  suggestedNextStep?: string;
  clientVisibleDefault?: boolean;
  testFixtures?: string[];
  status: ReviewProfileStatus;
};

export type ReviewProfile = {
  id: ReportProfileId;
  name: string;
  version: string;
  reportStandard: "legacy_uad_2_6" | "uad_3_6" | "non_gse" | "narrative";
  description: string;
  productMatches: string[];
  requiredSections: string[];
  requiredExhibits: ReviewAssetKind[];
  ruleIds: string[];
  aiReviewCategories: ReviewFindingCategory[];
  overlayIds: ReviewOverlayId[];
  effectiveFrom: string;
  effectiveTo?: string;
  status: ReviewProfileStatus;
};

export type ReviewOverlay = {
  id: ReviewOverlayId;
  name: string;
  scope: ReviewOverlayScope;
  version: string;
  description: string;
  ruleIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  status: ReviewProfileStatus;
};

export type IngestionSourceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  checksum?: string;
  uploadedBy: string;
  uploadedAt: string;
  kind?: ReportFileKind;
};

export type ReportAttachmentSummary = {
  id: string;
  kind: ReviewAssetKind;
  label: string;
  present: ExtractedField<boolean>;
  documentId?: string;
};

export type ComparableSaleSummary = {
  id: string;
  address: ExtractedField;
  salePrice: ExtractedField<number>;
  adjustedValue: ExtractedField<number>;
  netAdjustment: ExtractedField<number>;
  grossAdjustment: ExtractedField<number>;
  calculatedNetAdjustment: ExtractedField<number>;
  calculatedGrossAdjustment: ExtractedField<number>;
};

export type NormalizedAppraisalReport = {
  id: string;
  orderId: string;
  profileId: ReportProfileId;
  sourceFiles: IngestionSourceFile[];
  reportIdentity: {
    fileNumber: ExtractedField;
    clientName: ExtractedField;
    intendedUser: ExtractedField;
    reportType: ExtractedField;
    loanNumber?: ExtractedField;
  };
  subject: {
    borrowerName: ExtractedField;
    address: ExtractedField;
    city: ExtractedField;
    state: ExtractedField;
    zip: ExtractedField;
    county: ExtractedField;
  };
  property: {
    propertyType: ExtractedField;
    occupancy: ExtractedField;
  };
  site: {
    siteSizeAcres: ExtractedField<number>;
    statedSiteSizeAcres?: ExtractedField<number>;
  };
  improvements: {
    gla: ExtractedField<number>;
    sketchGla?: ExtractedField<number>;
    bedrooms: ExtractedField<number>;
    baths: ExtractedField<number>;
    sketchBedrooms?: ExtractedField<number>;
    sketchBaths?: ExtractedField<number>;
    conditionCommentary?: ExtractedField;
  };
  zoning: {
    zoningCode?: ExtractedField;
    conformity?: ExtractedField;
  };
  highestBestUse: {
    asImproved?: ExtractedField;
    asVacant?: ExtractedField;
  };
  neighborhood: Record<string, ExtractedField>;
  market: Record<string, ExtractedField>;
  contract: {
    analyzed: ExtractedField<boolean>;
    price?: ExtractedField<number>;
  };
  comparableSales: ComparableSaleSummary[];
  comparableListings: ComparableSaleSummary[];
  adjustments: {
    adjustmentGridBalanced: ExtractedField<boolean>;
  };
  costApproach: Record<string, ExtractedField | ExtractedField<number>>;
  incomeApproach: Record<string, ExtractedField | ExtractedField<number>>;
  reconciliation: {
    finalValue: ExtractedField<number>;
    indicatedValue: ExtractedField<number>;
    commentary: ExtractedField;
  };
  valueDates: {
    effectiveDate: ExtractedField;
    inspectionDate: ExtractedField;
    signatureDate: ExtractedField;
    retrospectiveDate?: ExtractedField;
  };
  appraiser: {
    name: ExtractedField;
    license: ExtractedField;
    signed: ExtractedField<boolean>;
  };
  supervisoryAppraiser?: {
    name?: ExtractedField;
    signed?: ExtractedField<boolean>;
  };
  certifications: {
    signedCertification: ExtractedField<boolean>;
    limitingConditions: ExtractedField<boolean>;
  };
  assumptions: ExtractedField<string[]>;
  extraordinaryAssumptions: ExtractedField<string[]>;
  hypotheticalConditions: ExtractedField<string[]>;
  environmentalAddenda: ReportAttachmentSummary[];
  photos: ReportAttachmentSummary[];
  sketch: ReportAttachmentSummary[];
  maps: ReportAttachmentSummary[];
  addenda: ReportAttachmentSummary[];
  attachments: ReportAttachmentSummary[];
  sections: Record<string, ExtractedField<boolean>>;
  orderInstructionResponses: ExtractedField<string[]>;
  versionComparison?: {
    previousVersionId: string;
    resolvedFindingIds: string[];
    unresolvedFindingIds: string[];
    changedSections: string[];
  };
  parsedAt: string;
};

export type AppraisalReportVersion = {
  id: string;
  organizationId: string;
  orderId: string;
  reportSubmissionId?: string;
  versionNumber: number;
  profileId: ReportProfileId;
  overlayIds: ReviewOverlayId[];
  sourceFiles: IngestionSourceFile[];
  storagePreserved: true;
  immutable: true;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  replacedByVersionId?: string;
  status: "Uploaded" | "Extracted" | "Extraction Failed" | "Under Review" | "Approved" | "Superseded";
  extractionSummary: string;
  normalizedReport: NormalizedAppraisalReport;
};

export type ReviewFindingEvidence = {
  label: string;
  value: string;
  sourceFileName?: string;
  sourcePage?: number;
  xmlPath?: string;
};

export type ReviewFinding = {
  id: string;
  organizationId: string;
  orderId: string;
  reportVersionId: string;
  ruleId: string;
  profileId: ReportProfileId;
  overlayId: ReviewOverlayId;
  title: string;
  description: string;
  category: ReviewFindingCategory;
  severity: ReviewSeverity;
  status: ReviewFindingStatus;
  evidence: ReviewFindingEvidence[];
  orderEvidence: ReviewFindingEvidence[];
  ruleSource: string;
  ruleVersion: string;
  ruleSourceReference?: string;
  whyItMatters: string;
  suggestedResolution: string;
  requiresHumanJudgment: boolean;
  deterministic: boolean;
  visibility: ReviewFindingVisibility[];
  createdAt: string;
  updatedAt: string;
  resolvedBy?: string;
  appraiserResponse?: string;
  reviewerResponse?: string;
};

export type ReviewResultSummary = {
  Critical: number;
  Warning: number;
  Advisory: number;
  Passed: number;
  openFindings: number;
  overallStatus: "Passed" | "Needs Review" | "Revision Recommended" | "Blocked";
};

export type ReportReviewResult = {
  id: string;
  organizationId: string;
  orderId: string;
  reportVersionId: string;
  profileId: ReportProfileId;
  overlayIds: ReviewOverlayId[];
  rulePackSummary: Array<{
    id: string;
    name: string;
    version: string;
    ruleCount: number;
  }>;
  runMode: ReviewRunMode;
  ruleRunVersion: string;
  aiProviderStatus: "disabled" | "not_configured" | "enabled";
  safetyNotice: string;
  findings: ReviewFinding[];
  summary: ReviewResultSummary;
  createdAt: string;
  createdBy: string;
  auditSummary: string;
};

export type ReportIngestionRequest = {
  order: Order;
  organization: Organization;
  user: PortalUser;
  sourceFiles: IngestionSourceFile[];
  runMode: ReviewRunMode;
  existingVersions?: AppraisalReportVersion[];
  scenarioHint?: string;
};

export type ReportIngestionResult = {
  status: "ready" | "needs_review" | "duplicate" | "failed";
  profile: ReviewProfile;
  overlays: ReviewOverlay[];
  reportVersion?: AppraisalReportVersion;
  reviewResult?: ReportReviewResult;
  errors: string[];
  warnings: string[];
};

export type AiReviewProviderResult = {
  enabled: boolean;
  status: "disabled" | "not_configured" | "completed" | "failed";
  findings: ReviewFinding[];
  message: string;
};

export type AiReviewProvider = {
  id: string;
  label: string;
  analyze: (request: {
    order: Order;
    report: NormalizedAppraisalReport;
    profile: ReviewProfile;
    overlays: ReviewOverlay[];
  }) => AiReviewProviderResult;
};

export type ReportReviewVisibilityContext = {
  user: PortalUser;
  organization: Organization;
  order: Order;
};
