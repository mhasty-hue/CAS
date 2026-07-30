import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const require = Module.createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;

function resolveProjectModule(request) {
  const withoutAlias = request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : path.resolve(path.dirname(request), request);
  const candidates = [
    withoutAlias,
    `${withoutAlias}.ts`,
    `${withoutAlias}.tsx`,
    `${withoutAlias}.js`,
    path.join(withoutAlias, "index.ts"),
    path.join(withoutAlias, "index.tsx")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const resolved = resolveProjectModule(request);
    if (resolved) return resolved;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  Module._extensions[extension] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };
}

const { orders } = require("../src/data/demo.ts");
const { organizations, portalUsers } = require("../src/data/platform.ts");
const { demoReportReviewResults, demoReportReviewScenarios, demoReportVersions } = require("../src/data/report-review.ts");
const { disabledAiReviewProvider } = require("../src/lib/report-review/ai-provider.ts");
const ingestion = require("../src/lib/report-review/ingestion.ts");
const permissions = require("../src/lib/report-review/permissions.ts");
const profiles = require("../src/lib/report-review/profiles.ts");
const rules = require("../src/lib/report-review/rules.ts");
const fees = require("../src/lib/orders/fees.ts");
const delivery = require("../src/lib/delivery/service.ts");

const org = organizations.find((organization) => organization.id === "org-firm-1");
const admin = portalUsers.find((user) => user.id === "user-admin");
const reviewer = portalUsers.find((user) => user.id === "user-reviewer");
const appraiser = portalUsers.find((user) => user.id === "user-appraiser");
const client = portalUsers.find((user) => user.id === "user-client");
assert(org && admin && reviewer && appraiser && client, "Expected demo organization and users.");

function file(orderId, fileName, checksum = `sha256-${fileName}`) {
  return {
    id: `${orderId}-${fileName}`,
    fileName,
    mimeType: fileName.endsWith(".xml") ? "application/xml" : "application/pdf",
    sizeBytes: 4_000_000,
    storagePath: `organizations/${org.id}/orders/${orderId}/reports/${fileName}`,
    checksum,
    uploadedBy: reviewer.name,
    uploadedAt: "2026-07-27T12:00:00Z"
  };
}

function ingest(orderId, scenarioHint, sourceFile = null, existingVersions = []) {
  const order = orders.find((candidate) => candidate.id === orderId);
  assert(order, `Expected order ${orderId}.`);
  return ingestion.ingestReportUpload({
    order,
    organization: org,
    user: reviewer,
    sourceFiles: [sourceFile ?? file(order.id, `${order.fileNumber}-report.pdf`)],
    runMode: "review_queue",
    existingVersions,
    scenarioHint
  });
}

assert.equal(demoReportReviewScenarios.length, 6, "Expected the requested demo review scenarios, including VA and revised-version examples.");
assert(demoReportVersions.length >= 5, "Demo report versions should exist.");
assert(demoReportReviewResults.length >= 5, "Demo review results should exist.");
assert(demoReportVersions.every((version) => version.immutable && version.storagePreserved), "Report versions must be immutable and preserve original files.");

const profileIds = profiles.reviewProfiles.map((profile) => profile.id).sort();
assert(profileIds.includes("uad-3-6-urar"), "UAD 3.6 profile should be configured.");
assert(profileIds.includes("estate-retrospective"), "Estate/retrospective profile should be configured.");
assert(profileIds.includes("divorce-litigation"), "Divorce/litigation profile should be configured.");
assert(profiles.reviewOverlays.some((overlay) => overlay.id === "fha" && overlay.ruleIds.includes("fha-condition-commentary")), "FHA overlay should carry FHA condition checks.");
assert.equal(profiles.selectReportProfile("UAD 3.6 URAR").id, "uad-3-6-urar", "UAD 3.6 product should select the UAD profile.");

const conventional = ingest("ord-1001", "conventional inconsistency");
assert.equal(conventional.status, "needs_review", "Conventional inconsistency should require review.");
assert(conventional.reviewResult.findings.some((finding) => finding.ruleId === "final-value-reconciliation-match" && finding.severity === "Warning"), "Final value mismatch should produce a warning.");
assert(conventional.reviewResult.findings.some((finding) => finding.ruleId === "net-gross-adjustment-math" && finding.status === "Open"), "Adjustment math should produce an open finding.");
assert(conventional.reportVersion.normalizedReport.reconciliation.finalValue.sourceFileName, "Extracted fields should carry source file evidence.");
assert(conventional.reportVersion.normalizedReport.reconciliation.finalValue.confidence > 0, "Extracted fields should carry confidence.");

const fha = ingest("ord-1002", "fha condition");
assert(fha.reviewResult.findings.some((finding) => finding.ruleId === "fha-condition-commentary" && finding.severity === "Critical"), "FHA condition issue should be critical.");
assert(fha.reviewResult.overlayIds.includes("fha"), "FHA review should include the FHA overlay.");
assert(fha.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-fha-single-family-overlay-v1"), "FHA review should include the FHA rule pack summary.");

const va = ingest("ord-1004", "va mpr review question");
assert(va.reviewResult.overlayIds.includes("va"), "VA review should include the VA overlay.");
assert(va.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-va-single-family-overlay-v1"), "VA review should include the VA rule pack summary.");
assert(va.reviewResult.findings.some((finding) => finding.ruleId === "va-mpr-review-question" && finding.requiresHumanJudgment), "VA MPR concerns should be reviewer questions.");
assert(!va.reviewResult.findings.some((finding) => /reject|failure/i.test(finding.description)), "VA findings should not automatically reject the report.");

const estate = ingest("ord-demo-private", "estate retrospective");
assert(estate.reviewResult.findings.some((finding) => finding.ruleId === "estate-retrospective-effective-date" && finding.severity === "Critical"), "Estate date mismatch should be critical.");
assert(estate.reviewResult.overlayIds.includes("estate"), "Estate review should include estate overlay.");
assert(estate.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-estate-retrospective-v1"), "Estate review should include the estate retrospective rule pack.");

const clean = ingest("ord-demo-ready", "clean");
assert.equal(clean.status, "ready", "Clean demo report should be ready.");
assert.equal(clean.reviewResult.summary.openFindings, 0, "Clean demo report should have no open findings.");

const prior = ingest("ord-1012", "conventional inconsistency", file("ord-1012", "CAA-26-1059-report-v1.pdf", "sha256-v1"));
const revised = ingest("ord-1012", "revised corrected", file("ord-1012", "CAA-26-1059-revised-v2.pdf", "sha256-v2"), [prior.reportVersion]);
assert(revised.reportVersion.versionNumber === 2, "Revised report should create a new immutable version.");
assert(revised.reportVersion.normalizedReport.versionComparison.resolvedFindingIds.length > 0, "Revised report should preserve mapping to prior findings.");
assert(revised.reviewResult.findings.some((finding) => finding.ruleId === "revised-version-compare" && finding.severity === "Passed"), "Revised version comparison should pass when prior findings are resolved.");

const duplicate = ingest("ord-1001", "conventional inconsistency", conventional.reportVersion.sourceFiles[0], [conventional.reportVersion]);
assert.equal(duplicate.status, "duplicate", "Duplicate report upload should not create a new version.");
const large = ingest("ord-1001", "conventional inconsistency", { ...file("ord-1001", "large-report.pdf"), sizeBytes: 101 * 1024 * 1024 });
assert.equal(large.status, "failed", "Large report upload should fail in plain language.");
assert(large.errors[0].includes("100 MB"), "Large upload error should explain the size limit.");
const malformed = ingest("ord-1001", "conventional inconsistency", file("ord-1001", "malformed-report.pdf"));
assert.equal(malformed.status, "failed", "Malformed report should fail before review.");
assert(malformed.errors[0].includes("could not be parsed"), "Malformed upload error should be plain language.");

const order1001 = orders.find((order) => order.id === "ord-1001");
const appraiserFindings = permissions.getVisibleReviewFindings(conventional.reviewResult, { user: appraiser, organization: org, order: order1001 });
assert(appraiserFindings.some((finding) => finding.severity !== "Passed"), "Assigned appraiser should see permitted open findings.");
const reviewerFindings = permissions.getVisibleReviewFindings(conventional.reviewResult, { user: reviewer, organization: org, order: order1001 });
assert(reviewerFindings.length >= appraiserFindings.length, "Reviewer should see internal report findings.");
assert.equal(permissions.getVisibleReviewFindings(conventional.reviewResult, { user: client, organization: org, order: order1001 }).length, 0, "Client should not see internal findings before release.");
const releasableFinding = conventional.reviewResult.findings.find((finding) => finding.severity !== "Passed");
const released = rules.releaseFindingToClient(conventional.reviewResult, releasableFinding.id, reviewer.name);
assert.equal(permissions.getVisibleReviewFindings(released, { user: client, organization: org, order: order1001 }).length, 1, "Only released findings should be client visible.");

const responded = rules.respondToReviewFinding(conventional.reviewResult, releasableFinding.id, "Corrected report uploaded.", appraiser.name);
assert(responded.findings.find((finding) => finding.id === releasableFinding.id).status === "Appraiser Responded", "Appraiser response should update finding status.");
const dismissed = rules.updateReviewFindingStatus(conventional.reviewResult, releasableFinding.id, "Dismissed", reviewer.name);
assert(dismissed.summary.openFindings < conventional.reviewResult.summary.openFindings, "Dismissed findings should reduce open count.");

const reviewerPayload = fees.sanitizeOrderFeesForUser(order1001, reviewer, org);
assert.equal(reviewerPayload.clientFee, undefined, "Reviewer report review should not expose client fee.");
assert.equal(reviewerPayload.vendorFee, undefined, "Reviewer report review should not expose vendor fee.");
assert.equal(disabledAiReviewProvider.analyze({ order: order1001, report: conventional.reportVersion.normalizedReport, profile: conventional.profile, overlays: conventional.overlays }).status, "disabled", "AI provider should remain disabled by default.");

const appraiserUpload = ingestion.ingestReportUpload({
  order: order1001,
  organization: org,
  user: appraiser,
  sourceFiles: [file(order1001.id, "CAA-26-1048-appraiser-upload.pdf", "sha256-appraiser-v1")],
  runMode: "pre_submission",
  existingVersions: [],
  scenarioHint: "conventional inconsistency"
});
assert(appraiserUpload.reportVersion.immutable, "Appraiser upload should create an immutable report version.");
assert.equal(appraiserUpload.reportVersion.versionNumber, 1, "First appraiser upload should create version 1.");
assert(appraiserUpload.reviewResult.findings.some((finding) => finding.severity !== "Passed"), "Appraiser upload should produce structured findings.");

const appraiserVisibleFinding = permissions.getVisibleReviewFindings(appraiserUpload.reviewResult, { user: appraiser, organization: org, order: order1001 }).find((finding) => finding.severity !== "Passed");
assert(appraiserVisibleFinding, "Appraiser should see at least one finding to answer.");
const answered = rules.respondToReviewFinding(appraiserUpload.reviewResult, appraiserVisibleFinding.id, "I uploaded a corrected version addressing the adjustment math and exhibit inconsistency.", appraiser.name);
assert.equal(answered.findings.find((finding) => finding.id === appraiserVisibleFinding.id).status, "Appraiser Responded", "Appraiser response should be captured before reviewer action.");

const correctedUpload = ingestion.ingestReportUpload({
  order: order1001,
  organization: org,
  user: appraiser,
  sourceFiles: [file(order1001.id, "CAA-26-1048-corrected-v2.pdf", "sha256-appraiser-v2")],
  runMode: "revision_compare",
  existingVersions: [appraiserUpload.reportVersion],
  scenarioHint: "revised corrected"
});
assert.equal(correctedUpload.reportVersion.versionNumber, 2, "Corrected upload should create immutable version 2.");
assert(correctedUpload.reportVersion.normalizedReport.versionComparison.resolvedFindingIds.length > 0, "Corrected version should compare against prior findings.");

const reviewerCleared = correctedUpload.reviewResult.findings.reduce(
  (result, finding) => finding.severity === "Passed" ? result : rules.updateReviewFindingStatus(result, finding.id, "Resolved", reviewer.name),
  correctedUpload.reviewResult
);
assert.equal(reviewerCleared.summary.openFindings, 0, "Reviewer should be able to resolve findings before marking ready for delivery.");
const reportReviewSource = fs.readFileSync(path.join(root, "src", "components", "cas", "report-review.tsx"), "utf8");
assert(reportReviewSource.includes("Upload report and run checks"), "Appraiser workflow should expose upload-and-check language.");
assert(reportReviewSource.includes("Mark ready for delivery"), "Reviewer workflow should expose ready-for-delivery action.");

const deliveryDocs = [
  {
    id: "doc-final-report",
    organizationId: org.id,
    orderId: order1001.id,
    uploaderId: appraiser.id,
    uploaderName: appraiser.name,
    category: "Appraisal report PDF",
    fileName: "CAA-26-1048-final.pdf",
    displayName: "Final appraisal report",
    fileType: "application/pdf",
    fileSizeBytes: 4_000_000,
    storagePath: "organizations/org-firm-1/orders/ord-1001/documents/final.pdf",
    versionNumber: 2,
    visibility: "Reviewer",
    source: "Appraiser upload",
    uploadedAt: "Just now",
    description: "Final report",
    tags: ["report"],
    status: "Uploaded",
    auditMetadata: { createdBy: appraiser.name, lastAction: "Uploaded", lastActionAt: "Just now", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: []
  },
  {
    id: "doc-workfile",
    organizationId: org.id,
    orderId: order1001.id,
    uploaderId: appraiser.id,
    uploaderName: appraiser.name,
    category: "Workfile",
    fileName: "workfile.pdf",
    displayName: "Internal workfile",
    fileType: "application/pdf",
    fileSizeBytes: 1_000_000,
    storagePath: "organizations/org-firm-1/orders/ord-1001/documents/workfile.pdf",
    versionNumber: 1,
    visibility: "Organization internal",
    source: "Appraiser upload",
    uploadedAt: "Just now",
    description: "Internal support",
    tags: ["workfile"],
    status: "Uploaded",
    auditMetadata: { createdBy: appraiser.name, lastAction: "Uploaded", lastActionAt: "Just now", virusScanStatus: "Passed", duplicateDetection: "Unique" },
    versions: []
  }
];
const deliveryRecord = delivery.createDeliveryRecord({ ...order1001, status: "Ready for Delivery" }, reviewer, deliveryDocs);
const deliveredDocs = delivery.markDeliveredFilesClientVisible(deliveryDocs, deliveryRecord);
assert.equal(deliveredDocs.find((document) => document.id === "doc-final-report").visibility, "Delivery recipient", "Delivered final report should become client-visible.");
assert.equal(deliveredDocs.find((document) => document.id === "doc-workfile").visibility, "Organization internal", "Workfile should remain internal after report delivery.");

console.log("Phase 10.4 report ingestion, deterministic review, permissions, upload safety, versioning, and AI-disabled checks passed.");
