import type { Order, Organization, PortalUser } from "@/types/domain";
import type {
  AppraisalReportVersion,
  ExtractedField,
  ReportReviewResult,
  ReviewFinding,
  ReviewFindingCategory,
  ReviewFindingStatus,
  ReviewFindingVisibility,
  ReviewSeverity
} from "@/types/report-review";
import { canDeliverReports } from "@/lib/permissions";
import { canReviewerManageFinding, getVisibleReviewFindings } from "@/lib/report-review/permissions";

export type ReviewWorkspaceTab = "viewer" | "findings" | "detail" | "versions";
export type ComparisonConfidence = "Verified structured change" | "Textual change" | "Potential change" | "Unable to compare";
export type DeliveryReadinessState =
  | "Review Not Started"
  | "Review In Progress"
  | "Waiting on Appraiser"
  | "Corrected Report Submitted"
  | "Reviewer Action Required"
  | "Blocking Findings Open"
  | "Ready for Delivery"
  | "Delivered";

export type ReviewWorkspaceFilters = {
  severity: ReviewSeverity | "All";
  status: ReviewFindingStatus | "All";
  category: ReviewFindingCategory | "All";
  rulePackId: string | "All";
  humanJudgment: "All" | "Required" | "Not required";
  visibility: ReviewFindingVisibility | "All";
  sourcePage: number | "All";
  responsibleParty: "All" | "Appraiser" | "Reviewer" | "Client";
};

export const defaultReviewWorkspaceFilters: ReviewWorkspaceFilters = {
  severity: "All",
  status: "All",
  category: "All",
  rulePackId: "All",
  humanJudgment: "All",
  visibility: "All",
  sourcePage: "All",
  responsibleParty: "All"
};

export type ReportViewerPage = {
  pageNumber: number;
  title: string;
  snippets: string[];
  evidenceFindingIds: string[];
};

export type ReportVersionSummary = {
  id: string;
  versionNumber: number;
  fileNames: string;
  uploadedBy: string;
  uploadedAt: string;
  immutableIdentity: string;
  status: AppraisalReportVersion["status"];
  active: boolean;
  delivered: boolean;
  superseded: boolean;
  findingCounts: {
    Critical: number;
    Warning: number;
    Advisory: number;
    Passed: number;
    openFindings: number;
  };
};

export type ExtractionStatus = {
  fileReceived: string;
  fileTypes: string;
  textExtractionStatus: string;
  structuredDataStatus: string;
  reportProfile: string;
  overlays: string;
  pagesProcessed: number;
  attachmentsDetected: number;
  fieldsVerified: number;
  fieldsNeedConfirmation: number;
  limitations: string[];
};

export type VersionComparisonItem = {
  id: string;
  label: string;
  previousValue: string;
  newValue: string;
  confidence: ComparisonConfidence;
  source: string;
};

export type VersionComparisonSummary = {
  baseVersionId?: string;
  comparedVersionId?: string;
  changedFields: VersionComparisonItem[];
  resolvedFindingIds: string[];
  unresolvedFindingIds: string[];
  newFindingIds: string[];
  addedExhibits: string[];
  removedExhibits: string[];
  limitation: string;
};

export type RevisionRequestDraft = {
  orderIdentifier: string;
  propertyAddress: string;
  reportVersionLabel: string;
  requestedAt: string;
  dueDate: string;
  items: Array<{
    findingId: string;
    title: string;
    explanation: string;
    sourceReference: string;
    suggestedResolution: string;
    clientVisible: boolean;
  }>;
  submissionInstructions: string;
};

export type DeliveryReadiness = {
  state: DeliveryReadinessState;
  ready: boolean;
  reasons: string[];
};

export type ReviewWorkspaceModel = {
  activeVersion?: AppraisalReportVersion;
  activeResult?: ReportReviewResult;
  selectedFinding?: ReviewFinding;
  visibleFindings: ReviewFinding[];
  filteredFindings: ReviewFinding[];
  versionSummaries: ReportVersionSummary[];
  viewerPages: ReportViewerPage[];
  extractionStatus: ExtractionStatus;
  comparison: VersionComparisonSummary;
  revisionDraft: RevisionRequestDraft;
  readiness: DeliveryReadiness;
  filterOptions: {
    severities: Array<ReviewSeverity | "All">;
    statuses: Array<ReviewFindingStatus | "All">;
    categories: Array<ReviewFindingCategory | "All">;
    rulePacks: Array<{ id: string | "All"; label: string }>;
    sourcePages: Array<number | "All">;
  };
};

const openStatuses = new Set<ReviewFindingStatus>(["Open", "Confirmed", "Appraiser Responded", "Clarification Requested", "Escalated", "Revision Requested", "Reopened"]);

function sortVersions(versions: AppraisalReportVersion[]) {
  return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
}

function resultForVersion(results: ReportReviewResult[], versionId?: string) {
  return versionId ? results.find((result) => result.reportVersionId === versionId) : undefined;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Missing";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

function fieldDisplay(field: ExtractedField<unknown> | undefined) {
  return formatValue(field?.value);
}

function fieldSource(field: ExtractedField<unknown> | undefined) {
  if (!field) return "No source";
  if (field.xmlPath) return field.xmlPath;
  if (field.sourcePage) return `${field.sourceFileName}, p. ${field.sourcePage}`;
  return field.sourceFileName;
}

function countExtractedFields(value: unknown): { verified: number; needsConfirmation: number; pages: number[] } {
  if (!value || typeof value !== "object") return { verified: 0, needsConfirmation: 0, pages: [] };
  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => {
        const next = countExtractedFields(item);
        return {
          verified: total.verified + next.verified,
          needsConfirmation: total.needsConfirmation + next.needsConfirmation,
          pages: [...total.pages, ...next.pages]
        };
      },
      { verified: 0, needsConfirmation: 0, pages: [] as number[] }
    );
  }

  const maybeField = value as Partial<ExtractedField<unknown>>;
  if (typeof maybeField.key === "string" && typeof maybeField.label === "string" && typeof maybeField.confidence === "number") {
    return {
      verified: maybeField.verificationStatus === "matched_order" || maybeField.verificationStatus === "manual_confirmed" ? 1 : 0,
      needsConfirmation: maybeField.verificationStatus === "unverified" || maybeField.verificationStatus === "mismatch" || maybeField.verificationStatus === "missing" ? 1 : 0,
      pages: typeof maybeField.sourcePage === "number" ? [maybeField.sourcePage] : []
    };
  }

  return Object.values(value).reduce(
    (total, item) => {
      const next = countExtractedFields(item);
      return {
        verified: total.verified + next.verified,
        needsConfirmation: total.needsConfirmation + next.needsConfirmation,
        pages: [...total.pages, ...next.pages]
      };
    },
    { verified: 0, needsConfirmation: 0, pages: [] as number[] }
  );
}

export function buildExtractionStatus(version?: AppraisalReportVersion): ExtractionStatus {
  if (!version) {
    return {
      fileReceived: "No report file received",
      fileTypes: "None",
      textExtractionStatus: "Not started",
      structuredDataStatus: "Not started",
      reportProfile: "Not selected",
      overlays: "None",
      pagesProcessed: 0,
      attachmentsDetected: 0,
      fieldsVerified: 0,
      fieldsNeedConfirmation: 0,
      limitations: ["Upload a report PDF/XML package before extraction transparency is available."]
    };
  }

  const counts = countExtractedFields(version.normalizedReport);
  return {
    fileReceived: version.sourceFiles.map((file) => file.fileName).join(", "),
    fileTypes: version.sourceFiles.map((file) => file.kind ?? file.mimeType).join(", "),
    textExtractionStatus: version.sourceFiles.some((file) => file.kind === "pdf_report") ? "Demo text extracted where available" : "No PDF text layer detected",
    structuredDataStatus: version.status === "Extraction Failed" ? "Failed" : "Structured demo fields extracted",
    reportProfile: version.profileId.replaceAll("-", " "),
    overlays: version.overlayIds.join(", "),
    pagesProcessed: Math.max(0, ...counts.pages, ...version.normalizedReport.sourceFiles.map(() => 1)),
    attachmentsDetected: version.normalizedReport.attachments.length + version.normalizedReport.photos.length + version.normalizedReport.maps.length + version.normalizedReport.sketch.length,
    fieldsVerified: counts.verified,
    fieldsNeedConfirmation: counts.needsConfirmation,
    limitations: [
      "Current extraction uses deterministic demo fixtures unless a production parser is configured.",
      "Exact PDF highlighting is simulated with page and evidence focus when source coordinates are unavailable."
    ]
  };
}

function compareField(id: string, label: string, previousField: ExtractedField<unknown> | undefined, newField: ExtractedField<unknown> | undefined): VersionComparisonItem | null {
  const previousValue = fieldDisplay(previousField);
  const newValue = fieldDisplay(newField);
  if (previousValue === newValue) return null;
  return {
    id,
    label,
    previousValue,
    newValue,
    confidence: previousField && newField ? "Verified structured change" : "Unable to compare",
    source: fieldSource(newField ?? previousField)
  };
}

export function compareReportVersions(previous?: AppraisalReportVersion, current?: AppraisalReportVersion): VersionComparisonSummary {
  if (!previous || !current) {
    return {
      baseVersionId: previous?.id,
      comparedVersionId: current?.id,
      changedFields: [],
      resolvedFindingIds: current?.normalizedReport.versionComparison?.resolvedFindingIds ?? [],
      unresolvedFindingIds: current?.normalizedReport.versionComparison?.unresolvedFindingIds ?? [],
      newFindingIds: [],
      addedExhibits: [],
      removedExhibits: [],
      limitation: "A prior and current structured report version are required for comparison."
    };
  }

  const prior = previous.normalizedReport;
  const next = current.normalizedReport;
  const changedFields = [
    compareField("effective-date", "Effective date", prior.valueDates.effectiveDate, next.valueDates.effectiveDate),
    compareField("value", "Value conclusion", prior.reconciliation.finalValue, next.reconciliation.finalValue),
    compareField("address", "Subject address", prior.subject.address, next.subject.address),
    compareField("gla", "GLA", prior.improvements.gla, next.improvements.gla),
    compareField("site-size", "Site size", prior.site.siteSizeAcres, next.site.siteSizeAcres),
    compareField("bedrooms", "Bedrooms", prior.improvements.bedrooms, next.improvements.bedrooms),
    compareField("baths", "Bathrooms", prior.improvements.baths, next.improvements.baths),
    compareField("condition", "Condition commentary", prior.improvements.conditionCommentary, next.improvements.conditionCommentary),
    compareField("reconciliation", "Reconciliation", prior.reconciliation.commentary, next.reconciliation.commentary),
    compareField("certifications", "Signed certification", prior.certifications.signedCertification, next.certifications.signedCertification)
  ].filter((item): item is VersionComparisonItem => Boolean(item));

  const priorExhibits = new Set(prior.attachments.filter((attachment) => attachment.present.value).map((attachment) => attachment.label));
  const nextExhibits = new Set(next.attachments.filter((attachment) => attachment.present.value).map((attachment) => attachment.label));

  return {
    baseVersionId: previous.id,
    comparedVersionId: current.id,
    changedFields,
    resolvedFindingIds: next.versionComparison?.resolvedFindingIds ?? [],
    unresolvedFindingIds: next.versionComparison?.unresolvedFindingIds ?? [],
    newFindingIds: next.versionComparison?.unresolvedFindingIds ?? [],
    addedExhibits: Array.from(nextExhibits).filter((item) => !priorExhibits.has(item)),
    removedExhibits: Array.from(priorExhibits).filter((item) => !nextExhibits.has(item)),
    limitation: "Comparison uses structured extracted fields and exhibit presence. It is not pixel-perfect document comparison."
  };
}

function primaryEvidenceReference(finding: ReviewFinding) {
  const evidence = finding.evidence[0] ?? finding.orderEvidence[0];
  if (!evidence) return "No source reference available";
  if (evidence.xmlPath) return evidence.xmlPath;
  if (evidence.sourcePage) return `${evidence.sourceFileName ?? "Report"}, p. ${evidence.sourcePage}`;
  return evidence.sourceFileName ?? evidence.label;
}

export function buildRevisionRequestDraft(order: Order, version: AppraisalReportVersion | undefined, findings: ReviewFinding[]): RevisionRequestDraft {
  const requestedItems = findings
    .filter((finding) => finding.severity !== "Passed" && openStatuses.has(finding.status) && finding.visibility.includes("appraiser"))
    .slice(0, 8)
    .map((finding) => ({
      findingId: finding.id,
      title: finding.title,
      explanation: finding.description,
      sourceReference: primaryEvidenceReference(finding),
      suggestedResolution: finding.suggestedResolution,
      clientVisible: finding.visibility.includes("client")
    }));

  return {
    orderIdentifier: order.fileNumber,
    propertyAddress: `${order.address}, ${order.city}, ${order.state} ${order.zip}`,
    reportVersionLabel: version ? `Version ${version.versionNumber}` : "No version selected",
    requestedAt: "Just now",
    dueDate: order.dueDate,
    items: requestedItems,
    submissionInstructions: "Upload a corrected immutable report version and respond to each released finding in CAS."
  };
}

export function calculateDeliveryReadiness({
  order,
  result,
  visibleFindings,
  activeVersion,
  user,
  organization
}: {
  order: Order;
  result?: ReportReviewResult;
  visibleFindings: ReviewFinding[];
  activeVersion?: AppraisalReportVersion;
  user: PortalUser;
  organization: Organization;
}): DeliveryReadiness {
  if (order.status === "Delivered" || order.status === "Completed") {
    return { state: "Delivered", ready: true, reasons: ["Final report version has been released."] };
  }
  if (!activeVersion) {
    return { state: "Review Not Started", ready: false, reasons: ["No immutable report version exists yet."] };
  }
  if (!result) {
    return { state: "Review In Progress", ready: false, reasons: ["Deterministic review has not completed for the selected version."] };
  }

  const openFindings = visibleFindings.filter((finding) => finding.severity !== "Passed" && openStatuses.has(finding.status));
  const openCritical = openFindings.filter((finding) => finding.severity === "Critical");
  const revisionRequested = openFindings.filter((finding) => finding.status === "Revision Requested" || finding.status === "Clarification Requested");
  const appraiserResponded = openFindings.filter((finding) => finding.status === "Appraiser Responded");
  const correctedSubmitted = Boolean(activeVersion.normalizedReport.versionComparison?.resolvedFindingIds.length);
  const canRelease = canDeliverReports(user) || canReviewerManageFinding({ user, order, organization });

  if (openCritical.length) {
    return { state: "Blocking Findings Open", ready: false, reasons: [`${openCritical.length} critical finding${openCritical.length === 1 ? "" : "s"} remain open.`] };
  }
  if (revisionRequested.length) {
    return { state: "Waiting on Appraiser", ready: false, reasons: [`${revisionRequested.length} revision or clarification item${revisionRequested.length === 1 ? "" : "s"} await appraiser response.`] };
  }
  if (appraiserResponded.length) {
    return { state: "Reviewer Action Required", ready: false, reasons: [`${appraiserResponded.length} appraiser response${appraiserResponded.length === 1 ? "" : "s"} need reviewer disposition.`] };
  }
  if (correctedSubmitted && openFindings.length) {
    return { state: "Corrected Report Submitted", ready: false, reasons: ["Corrected report has been uploaded but open findings still need reviewer disposition."] };
  }
  if (openFindings.length) {
    return { state: "Reviewer Action Required", ready: false, reasons: [`${openFindings.length} non-blocking finding${openFindings.length === 1 ? "" : "s"} need reviewer disposition.`] };
  }
  if (!canRelease) {
    return { state: "Reviewer Action Required", ready: false, reasons: ["A user with delivery permission must approve the final release."] };
  }

  return { state: "Ready for Delivery", ready: true, reasons: ["No blocking findings remain and reviewer delivery permission is available."] };
}

export function filterReviewFindings(findings: ReviewFinding[], filters: ReviewWorkspaceFilters, result?: ReportReviewResult) {
  const packLabel = filters.rulePackId === "All" ? "" : result?.rulePackSummary.find((pack) => pack.id === filters.rulePackId)?.name.toLowerCase() ?? "";
  return findings.filter((finding) => {
    if (filters.severity !== "All" && finding.severity !== filters.severity) return false;
    if (filters.status !== "All" && finding.status !== filters.status) return false;
    if (filters.category !== "All" && finding.category !== filters.category) return false;
    if (filters.humanJudgment === "Required" && !finding.requiresHumanJudgment) return false;
    if (filters.humanJudgment === "Not required" && finding.requiresHumanJudgment) return false;
    if (filters.visibility !== "All" && !finding.visibility.includes(filters.visibility)) return false;
    if (filters.sourcePage !== "All" && !finding.evidence.some((evidence) => evidence.sourcePage === filters.sourcePage)) return false;
    if (filters.responsibleParty === "Appraiser" && !finding.visibility.includes("appraiser")) return false;
    if (filters.responsibleParty === "Reviewer" && finding.visibility.includes("client")) return false;
    if (filters.responsibleParty === "Client" && !finding.visibility.includes("client")) return false;
    if (packLabel && !finding.ruleSource.toLowerCase().includes(packLabel.split(" ")[0]) && !finding.ruleId.includes("ai")) return false;
    return true;
  });
}

export function buildReportViewerPages(version: AppraisalReportVersion | undefined, findings: ReviewFinding[], selectedFindingId?: string): ReportViewerPage[] {
  if (!version) {
    return [{ pageNumber: 1, title: "No report selected", snippets: ["Upload or select an immutable report version to inspect evidence."], evidenceFindingIds: [] }];
  }

  const pages = new Map<number, ReportViewerPage>();
  const addPage = (pageNumber: number, snippet: string, findingId?: string) => {
    const page = pages.get(pageNumber) ?? { pageNumber, title: `Page ${pageNumber}`, snippets: [], evidenceFindingIds: [] };
    page.snippets.push(snippet);
    if (findingId) page.evidenceFindingIds.push(findingId);
    pages.set(pageNumber, page);
  };

  for (const finding of findings) {
    for (const evidence of finding.evidence) {
      addPage(evidence.sourcePage ?? 1, `${evidence.label}: ${evidence.value}`, finding.id);
    }
  }

  if (!pages.size) {
    addPage(1, `${version.normalizedReport.reportIdentity.reportType.value ?? "Report"} for ${version.normalizedReport.subject.address.value ?? "subject property"}.`);
  }

  const selectedPage = findings.find((finding) => finding.id === selectedFindingId)?.evidence.find((evidence) => evidence.sourcePage)?.sourcePage;
  return Array.from(pages.values()).sort((a, b) => {
    if (selectedPage && a.pageNumber === selectedPage) return -1;
    if (selectedPage && b.pageNumber === selectedPage) return 1;
    return a.pageNumber - b.pageNumber;
  });
}

export function buildReviewWorkspaceModel({
  order,
  user,
  organization,
  versions,
  results,
  selectedVersionId,
  selectedFindingId,
  filters = defaultReviewWorkspaceFilters
}: {
  order: Order;
  user: PortalUser;
  organization: Organization;
  versions: AppraisalReportVersion[];
  results: ReportReviewResult[];
  selectedVersionId?: string;
  selectedFindingId?: string;
  filters?: ReviewWorkspaceFilters;
}): ReviewWorkspaceModel {
  const orderVersions = sortVersions(versions.filter((version) => version.orderId === order.id));
  const activeVersion = orderVersions.find((version) => version.id === selectedVersionId) ?? orderVersions[0];
  const activeResult = resultForVersion(results, activeVersion?.id) ?? results.filter((result) => result.orderId === order.id).at(-1);
  const context = { user, organization, order };
  const visibleFindings = getVisibleReviewFindings(activeResult, context);
  const filteredFindings = filterReviewFindings(visibleFindings, filters, activeResult);
  const selectedFinding = filteredFindings.find((finding) => finding.id === selectedFindingId) ?? filteredFindings.find((finding) => finding.severity !== "Passed") ?? filteredFindings[0];
  const previousVersion = activeVersion ? orderVersions.find((version) => version.versionNumber < activeVersion.versionNumber) : undefined;
  const versionSummaries = orderVersions.map<ReportVersionSummary>((version) => {
    const result = resultForVersion(results, version.id);
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      fileNames: version.sourceFiles.map((file) => file.fileName).join(", "),
      uploadedBy: version.uploadedBy,
      uploadedAt: version.uploadedAt,
      immutableIdentity: version.sourceFiles.map((file) => file.checksum ?? file.id).join(", "),
      status: version.status,
      active: version.id === activeVersion?.id,
      delivered: order.status === "Delivered" || order.status === "Completed",
      superseded: Boolean(version.replacedByVersionId) || version.status === "Superseded",
      findingCounts: result?.summary ?? { Critical: 0, Warning: 0, Advisory: 0, Passed: 0, openFindings: 0 }
    };
  });

  const sourcePages = Array.from(new Set(visibleFindings.flatMap((finding) => finding.evidence.map((evidence) => evidence.sourcePage).filter((page): page is number => typeof page === "number")))).sort((a, b) => a - b);

  return {
    activeVersion,
    activeResult,
    selectedFinding,
    visibleFindings,
    filteredFindings,
    versionSummaries,
    viewerPages: buildReportViewerPages(activeVersion, visibleFindings, selectedFinding?.id),
    extractionStatus: buildExtractionStatus(activeVersion),
    comparison: compareReportVersions(previousVersion, activeVersion),
    revisionDraft: buildRevisionRequestDraft(order, activeVersion, visibleFindings),
    readiness: calculateDeliveryReadiness({ order, result: activeResult, visibleFindings, activeVersion, user, organization }),
    filterOptions: {
      severities: ["All", "Critical", "Warning", "Advisory", "Passed"],
      statuses: ["All", "Open", "Confirmed", "Appraiser Responded", "Corrected", "Accepted Explanation", "Clarification Requested", "Not Applicable", "Dismissed", "Escalated", "Revision Requested", "Resolved", "Reopened"],
      categories: ["All", ...Array.from(new Set(visibleFindings.map((finding) => finding.category)))],
      rulePacks: [{ id: "All", label: "All packs" }, ...(activeResult?.rulePackSummary.map((pack) => ({ id: pack.id, label: `${pack.name} ${pack.version}` })) ?? [])],
      sourcePages: ["All", ...sourcePages]
    }
  };
}
