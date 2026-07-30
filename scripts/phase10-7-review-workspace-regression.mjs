import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const require = Module.createRequire(import.meta.url);

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
const { demoReportReviewResults } = require("../src/data/report-review.ts");
const { demoAiReviewSettings, defaultAiReviewSettings, userCanManageAiReviewSettings } = require("../src/lib/report-review/ai-settings.ts");
const ingestion = require("../src/lib/report-review/ingestion.ts");
const permissions = require("../src/lib/report-review/permissions.ts");
const rules = require("../src/lib/report-review/rules.ts");
const workspace = require("../src/lib/report-review/workspace.ts");

const org = organizations.find((organization) => organization.id === "org-firm-1");
const clientOrg = organizations.find((organization) => organization.id === "org-client-1");
const admin = portalUsers.find((user) => user.id === "user-admin");
const reviewer = portalUsers.find((user) => user.id === "user-reviewer");
const lender = portalUsers.find((user) => user.id === "user-client");
const baseAppraiser = portalUsers.find((user) => user.id === "user-appraiser");
const fhaOrder = orders.find((order) => order.id === "ord-1002");
const conventionalOrder = orders.find((order) => order.id === "ord-1001");

assert(org && clientOrg && admin && reviewer && lender && baseAppraiser && fhaOrder && conventionalOrder, "Expected Phase 10.7 demo orgs, users, and orders.");
const priyaAppraiser = { ...baseAppraiser, id: "user-priya-demo", name: "Priya Shah", firstName: "Priya", preferredName: "Priya", appraiserName: "Priya Shah" };

function file(orderId, fileName, checksum = `sha256-${fileName}`) {
  return {
    id: `${orderId}-${fileName}`,
    fileName,
    mimeType: fileName.endsWith(".xml") ? "application/xml" : "application/pdf",
    sizeBytes: 4_000_000,
    storagePath: `organizations/${org.id}/orders/${orderId}/reports/${fileName}`,
    checksum,
    uploadedBy: priyaAppraiser.name,
    uploadedAt: "2026-07-27T12:00:00Z"
  };
}

function ingest(order, user, scenarioHint, aiSettings, existingVersions = [], fileName = `${order.fileNumber}-report.pdf`) {
  return ingestion.ingestReportUpload({
    order,
    organization: org,
    user,
    sourceFiles: [file(order.id, fileName)],
    runMode: user.role === "appraiser" ? "pre_submission" : "review_queue",
    existingVersions,
    scenarioHint,
    aiSettings
  });
}

assert(userCanManageAiReviewSettings(admin), "Company admin should be able to manage AI review settings.");
assert(!userCanManageAiReviewSettings(priyaAppraiser), "Appraiser should not manage organization AI settings.");
assert.equal(defaultAiReviewSettings(org.id).enabled, false, "Production AI review settings should default disabled.");
assert.equal(demoAiReviewSettings(org.id).providerId, "cas-demo-ai", "Demo settings should use the deterministic CAS mock provider.");

const defaultRun = ingest(fhaOrder, priyaAppraiser, "fha condition", defaultAiReviewSettings(org.id));
assert.equal(defaultRun.reviewResult.aiProviderStatus, "disabled", "Default production-style run should keep AI disabled.");
assert(!defaultRun.reviewResult.findings.some((finding) => finding.aiAssisted), "Disabled AI run should not create AI findings.");

const appraiserRun = ingest(fhaOrder, priyaAppraiser, "fha condition", demoAiReviewSettings(org.id));
assert(appraiserRun.reportVersion.immutable && appraiserRun.reportVersion.storagePreserved, "Appraiser upload should create an immutable preserved report version.");
assert.equal(appraiserRun.reportVersion.versionNumber, 1, "Initial appraiser upload should create version 1.");
assert.equal(appraiserRun.reviewResult.aiProviderStatus, "completed", "Demo AI pilot should complete when explicitly enabled.");
assert.equal(appraiserRun.reviewResult.aiRun.providerId, "cas-demo-ai", "AI run should audit provider ID.");
assert.equal(appraiserRun.reviewResult.aiRun.modelId, "cas-demo-evidence-reviewer-v1", "AI run should audit model ID.");
assert(appraiserRun.reviewResult.aiRun.findingsAccepted > 0, "Demo AI should accept at least one evidence-grounded finding.");

const aiFindings = appraiserRun.reviewResult.findings.filter((finding) => finding.aiAssisted);
assert(aiFindings.length > 0, "FHA demo should include AI-assisted reviewer questions.");
assert(aiFindings.every((finding) => finding.requiresHumanJudgment), "AI findings must require human judgment.");
assert(aiFindings.every((finding) => finding.visibility.includes("internal") && !finding.visibility.includes("client")), "AI findings should default internal and never client-visible.");
assert(aiFindings.every((finding) => finding.aiMetadata?.providerId === "cas-demo-ai" && finding.aiMetadata?.evidenceQuality !== "unverified"), "AI findings should include provider/model/evidence metadata.");
assert(aiFindings.every((finding) => finding.evidence.length > 0 && finding.evidence.some((evidence) => evidence.sourcePage || evidence.xmlPath || evidence.sourceFileName)), "AI findings should be evidence-grounded.");
assert(!/auto-?approved|auto-?rejected|automatically reject|automated value change|change the value to/i.test(JSON.stringify(aiFindings)), "AI findings must not auto-reject, approve, or change value.");

const appraiserWorkspace = workspace.buildReviewWorkspaceModel({
  order: fhaOrder,
  user: priyaAppraiser,
  organization: org,
  versions: [appraiserRun.reportVersion],
  results: [appraiserRun.reviewResult],
  filters: workspace.defaultReviewWorkspaceFilters
});
assert(appraiserWorkspace.activeVersion.id === appraiserRun.reportVersion.id, "Workspace should select the uploaded report version.");
assert(appraiserWorkspace.extractionStatus.fileReceived.includes("CAA-26-1049"), "Extraction transparency should name the received file.");
assert(appraiserWorkspace.extractionStatus.fieldsNeedConfirmation > 0, "Extraction status should surface fields needing confirmation.");
assert(appraiserWorkspace.viewerPages.length > 0, "Report viewer should provide page-level evidence.");
assert(appraiserWorkspace.visibleFindings.some((finding) => finding.aiAssisted), "Assigned appraiser should see permitted pre-submission AI findings.");
assert(!JSON.stringify(appraiserWorkspace).includes('"clientFee"') && !JSON.stringify(appraiserWorkspace).includes('"vendorFee"') && !JSON.stringify(appraiserWorkspace).includes('"companyMargin"'), "Workspace payload must not include fee or margin fields.");

const selectedFinding = appraiserWorkspace.visibleFindings.find((finding) => finding.aiAssisted) ?? appraiserWorkspace.visibleFindings[0];
const selectedWorkspace = workspace.buildReviewWorkspaceModel({
  order: fhaOrder,
  user: priyaAppraiser,
  organization: org,
  versions: [appraiserRun.reportVersion],
  results: [appraiserRun.reviewResult],
  selectedFindingId: selectedFinding.id
});
assert(selectedWorkspace.viewerPages[0].evidenceFindingIds.includes(selectedFinding.id), "Jump-to-evidence should prioritize the selected finding page.");

const filteredCritical = workspace.filterReviewFindings(appraiserWorkspace.visibleFindings, { ...workspace.defaultReviewWorkspaceFilters, severity: "Critical" }, appraiserRun.reviewResult);
assert(filteredCritical.every((finding) => finding.severity === "Critical"), "Findings panel should filter by severity.");
const filteredAi = workspace.filterReviewFindings(appraiserWorkspace.visibleFindings, { ...workspace.defaultReviewWorkspaceFilters, humanJudgment: "Required", visibility: "appraiser" }, appraiserRun.reviewResult);
assert(filteredAi.every((finding) => finding.requiresHumanJudgment && finding.visibility.includes("appraiser")), "Findings panel should filter by human judgment and visibility.");

const reviewerWorkspace = workspace.buildReviewWorkspaceModel({
  order: fhaOrder,
  user: reviewer,
  organization: org,
  versions: [appraiserRun.reportVersion],
  results: [appraiserRun.reviewResult]
});
assert(reviewerWorkspace.visibleFindings.length >= appraiserWorkspace.visibleFindings.length, "Reviewer should see internal review findings.");
assert(reviewerWorkspace.revisionDraft.items.length > 0, "Reviewer should be able to draft a revision request from appraiser-visible findings.");
assert(!JSON.stringify(reviewerWorkspace.revisionDraft).includes("cas-demo-ai"), "Revision request draft must not expose raw provider details.");
assert(reviewerWorkspace.readiness.ready === false && reviewerWorkspace.readiness.reasons.length > 0, "Blocking findings should prevent delivery readiness.");

const alienReviewer = { ...reviewer, organizationId: clientOrg.id };
assert.equal(
  permissions.getVisibleReviewFindings(appraiserRun.reviewResult, { user: alienReviewer, organization: clientOrg, order: fhaOrder }).length,
  0,
  "Reviewer from another organization must not see internal findings."
);
assert.equal(
  permissions.getVisibleReviewFindings(appraiserRun.reviewResult, { user: lender, organization: clientOrg, order: fhaOrder }).length,
  0,
  "Unrelated lender should not see internal or appraiser findings."
);

const clientFindingCandidate = appraiserRun.reviewResult.findings.find((finding) => finding.severity !== "Passed");
const releasedResult = rules.releaseFindingToClient(appraiserRun.reviewResult, clientFindingCandidate.id, reviewer.name);
const ownClient = { ...lender, clientName: fhaOrder.client };
assert.equal(
  permissions.getVisibleReviewFindings(releasedResult, { user: ownClient, organization: clientOrg, order: fhaOrder }).length,
  1,
  "Only approved client-visible findings should reach the lender/client."
);

const responded = rules.respondToReviewFinding(appraiserRun.reviewResult, selectedFinding.id, "I added the FHA condition addendum and photo reference in the corrected version.", priyaAppraiser.name);
assert.equal(responded.findings.find((finding) => finding.id === selectedFinding.id).status, "Appraiser Responded", "Appraiser response should be captured.");
const confirmed = rules.updateReviewFindingStatus(appraiserRun.reviewResult, selectedFinding.id, "Confirmed", reviewer.name);
assert.equal(confirmed.findings.find((finding) => finding.id === selectedFinding.id).aiMetadata?.humanDisposition, "confirmed", "Reviewer confirmation should update AI human disposition.");
const dismissed = rules.updateReviewFindingStatus(appraiserRun.reviewResult, selectedFinding.id, "Not Applicable", reviewer.name);
assert.equal(dismissed.findings.find((finding) => finding.id === selectedFinding.id).aiMetadata?.humanDisposition, "dismissed", "Not applicable should dismiss an AI suggestion.");

const correctedRun = ingestion.ingestReportUpload({
  order: fhaOrder,
  organization: org,
  user: priyaAppraiser,
  sourceFiles: [file(fhaOrder.id, "CAA-26-1049-corrected-v2.pdf", "sha256-corrected-v2")],
  runMode: "revision_compare",
  existingVersions: [appraiserRun.reportVersion],
  scenarioHint: "revised corrected",
  aiSettings: demoAiReviewSettings(org.id)
});
assert.equal(correctedRun.reportVersion.versionNumber, 2, "Corrected upload should create a second immutable version.");
const comparison = workspace.compareReportVersions(appraiserRun.reportVersion, correctedRun.reportVersion);
assert(comparison.changedFields.length > 0, "Version comparison should show structured changes.");
assert(comparison.resolvedFindingIds.length > 0, "Version comparison should preserve resolved finding mapping.");
assert(comparison.limitation.includes("not pixel-perfect"), "Comparison should disclose non-pixel-perfect limitations.");

const clearedResult = correctedRun.reviewResult.findings.reduce(
  (result, finding) => finding.severity === "Passed" ? result : rules.updateReviewFindingStatus(result, finding.id, "Resolved", reviewer.name),
  correctedRun.reviewResult
);
const clearedWorkspace = workspace.buildReviewWorkspaceModel({
  order: fhaOrder,
  user: reviewer,
  organization: org,
  versions: [appraiserRun.reportVersion, correctedRun.reportVersion],
  results: [clearedResult],
  selectedVersionId: correctedRun.reportVersion.id
});
assert.equal(clearedWorkspace.readiness.ready, true, "Resolved corrected version should become ready for delivery.");
assert.equal(clearedWorkspace.readiness.state, "Ready for Delivery", "Delivery readiness should explain the ready state.");

const unavailableSettings = {
  ...demoAiReviewSettings(org.id),
  providerId: "external",
  modelId: "external-demo-disabled",
  promptTemplateVersion: "external-demo-disabled"
};
const unavailableRun = ingest(conventionalOrder, reviewer, "conventional inconsistency", unavailableSettings, [], "CAA-26-1048-external-provider.pdf");
assert.equal(unavailableRun.reviewResult.aiProviderStatus, "unavailable", "External provider failure should be shown as unavailable.");
assert(unavailableRun.reviewResult.findings.some((finding) => finding.deterministic), "Deterministic findings should still complete when AI is unavailable.");
assert.equal(unavailableRun.reviewResult.aiRun.status, "failed", "AI run audit should preserve failed provider status.");

assert(demoReportReviewResults.some((result) => result.aiProviderStatus === "completed"), "Preloaded demo review data should include the AI pilot.");
assert(demoReportReviewResults.some((result) => result.aiProviderStatus === "disabled"), "Preloaded demo review data should still include a deterministic-only clean scenario.");

const reportReviewSource = fs.readFileSync(path.join(root, "src", "components", "cas", "report-review.tsx"), "utf8");
for (const requiredText of [
  "Appraisal Review Workspace",
  "Jump to evidence",
  "Version comparison",
  "AI-assisted evidence summary",
  "Delivery readiness",
  "Revision request draft",
  "Production default"
]) {
  assert(reportReviewSource.includes(requiredText), `Workspace source should include ${requiredText}.`);
}

console.log("Phase 10.7 review workspace, version comparison, AI pilot, privacy, and delivery-readiness regressions passed.");
