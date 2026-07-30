import { orders } from "@/data/demo";
import { organizations, portalUsers } from "@/data/platform";
import { ingestReportUpload } from "@/lib/report-review/ingestion";
import type { AppraisalReportVersion, IngestionSourceFile, ReportIngestionResult, ReportReviewResult } from "@/types/report-review";

const demoOrganization = organizations.find((organization) => organization.id === "org-firm-1") ?? organizations[0];
const demoUser = portalUsers.find((user) => user.id === "user-reviewer") ?? portalUsers[0];

function sourceFile(orderId: string, fileName: string, mimeType: string, checksum: string, sizeBytes = 4_219_981): IngestionSourceFile {
  return {
    id: `${orderId}-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    fileName,
    mimeType,
    sizeBytes,
    storagePath: `organizations/${demoOrganization.id}/orders/${orderId}/report-review/${fileName}`,
    checksum,
    uploadedBy: "CAS Demo",
    uploadedAt: "2026-07-27T12:00:00Z"
  };
}

function hasPayload(result: ReportIngestionResult): result is ReportIngestionResult & { reportVersion: AppraisalReportVersion; reviewResult: ReportReviewResult } {
  return Boolean(result.reportVersion && result.reviewResult);
}

function runScenario(orderId: string, fileName: string, mimeType: string, checksum: string, scenarioHint: string, existingVersions: AppraisalReportVersion[] = []) {
  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order) return null;
  const result = ingestReportUpload({
    order,
    organization: demoOrganization,
    user: demoUser,
    sourceFiles: [sourceFile(order.id, fileName, mimeType, checksum)],
    runMode: "review_queue",
    existingVersions,
    scenarioHint
  });
  return hasPayload(result) ? result : null;
}

const conventional = runScenario("ord-1001", "CAA-26-1048-report-v1.pdf", "application/pdf", "sha256-report-review-1001-v1", "conventional inconsistency");
const fha = runScenario("ord-1002", "CAA-26-1049-fha-report.pdf", "application/pdf", "sha256-report-review-1002-fha", "fha condition");
const va = runScenario("ord-1004", "CAA-26-1051-va-report.pdf", "application/pdf", "sha256-report-review-1004-va", "va mpr review question");
const estate = runScenario("ord-demo-private", "CAS-PRIVATE-2601-estate-report.pdf", "application/pdf", "sha256-report-review-estate", "estate retrospective");
const clean = runScenario("ord-demo-ready", "CAA-26-1061-clean-desktop.pdf", "application/pdf", "sha256-report-review-clean", "clean");
const priorRevision = runScenario("ord-1012", "CAA-26-1059-report-v1.pdf", "application/pdf", "sha256-report-review-1012-v1", "conventional inconsistency");
const revised = priorRevision
  ? runScenario("ord-1012", "CAA-26-1059-revised-report-v2.pdf", "application/pdf", "sha256-report-review-1012-v2", "revised clean", [priorRevision.reportVersion])
  : null;

const scenarioResults = [conventional, fha, va, estate, clean, priorRevision, revised].filter((result): result is ReportIngestionResult & { reportVersion: AppraisalReportVersion; reviewResult: ReportReviewResult } => Boolean(result));

export const demoReportReviewScenarios = [
  "Conventional report with calculation inconsistencies",
  "FHA report with missing or conflicting condition commentary",
  "VA report with MPR-related reviewer question and repair consistency check",
  "Estate retrospective appraisal with effective-date conflict",
  "Clean report with mostly passed checks",
  "Revised report resolving prior findings"
];

export const demoReportVersions: AppraisalReportVersion[] = scenarioResults.map((result) => result.reportVersion);
export const demoReportReviewResults: ReportReviewResult[] = scenarioResults.map((result) => result.reviewResult);
