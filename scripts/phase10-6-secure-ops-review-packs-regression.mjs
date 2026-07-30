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

const { orders, appraisers, vendors } = require("../src/data/demo.ts");
const { accountingEntries, invoices, organizations, portalUsers, vendorDocuments, workflowTasks } = require("../src/data/platform.ts");
const { demoCasRepository } = require("../src/lib/repositories/demo-repository.ts");
const operations = require("../src/lib/operations-center/service.ts");
const contract = require("../src/lib/operations-center/contract.ts");
const operationsRepository = require("../src/lib/operations-center/repository.ts");
const ingestion = require("../src/lib/report-review/ingestion.ts");
const profiles = require("../src/lib/report-review/profiles.ts");
const rulePacks = require("../src/lib/report-review/rule-packs.ts");

const org = organizations.find((organization) => organization.id === "org-firm-1");
const admin = portalUsers.find((user) => user.id === "user-admin");
const lender = portalUsers.find((user) => user.id === "user-client");
const appraiser = portalUsers.find((user) => user.id === "user-appraiser");
const reviewer = portalUsers.find((user) => user.id === "user-reviewer");
assert(org && admin && lender && appraiser && reviewer, "Expected demo users and organization.");

function buildModel(user) {
  return operations.buildOperationsCenterModel({
    orders,
    appraisers,
    user,
    organization: org,
    vendors,
    vendorDocuments,
    accountingEntries,
    invoices,
    tasks: workflowTasks,
    now: operations.commandCenterToday,
    source: "demo"
  });
}

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

function ingest(orderId, scenarioHint) {
  const order = orders.find((candidate) => candidate.id === orderId);
  assert(order, `Expected order ${orderId}.`);
  return ingestion.ingestReportUpload({
    order,
    organization: org,
    user: reviewer,
    sourceFiles: [file(order.id, `${order.fileNumber}-report.pdf`)],
    runMode: "review_queue",
    scenarioHint
  });
}

const adminModel = buildModel(admin);
assert.equal(contract.validateOperationsCenterModel(adminModel).ok, true, "Valid model should pass the sanitized contract.");
assert.equal(adminModel.freshness.source, "demo", "Demo model should identify its data source.");
assert(adminModel.generatedAt, "Operations Center model should include a generation timestamp.");

const tampered = structuredClone(adminModel);
tampered.orders = orders;
tampered.clientFee = 500;
const tamperedValidation = contract.validateOperationsCenterModel(tampered);
assert.equal(tamperedValidation.ok, false, "Contract should reject raw order lists and hidden fee fields.");
assert(tamperedValidation.issues.join(" ").includes("forbidden"), "Contract rejection should name forbidden payload fields.");

const appraiserModel = buildModel(appraiser);
const appraiserPayload = JSON.stringify(appraiserModel);
assert(!appraiserPayload.includes("Client Fee"), "Appraiser model must omit client fee labels.");
assert(!appraiserPayload.includes("Gross Spread"), "Appraiser model must omit margin labels.");
assert(appraiserModel.capacityInsights.every((insight) => insight.appraiser.name === appraiser.appraiserName), "Appraiser model should show only personal capacity.");

const lenderModel = buildModel(lender);
const lenderPayload = JSON.stringify(lenderModel);
assert(!lenderPayload.includes("Vendor Fee"), "Lender model must omit vendor fee labels.");
assert(!lenderPayload.includes("Gross Spread"), "Lender model must omit margin labels.");

const repositoryModel = await operationsRepository.loadOperationsCenterModelFromRepository({
  repository: demoCasRepository,
  user: admin,
  organization: org,
  source: "demo"
});
assert.equal(repositoryModel.persona, "appraisal_owner", "Repository helper should return a sanitized model for the active role.");
assert.equal(contract.validateOperationsCenterModel(repositoryModel).ok, true, "Repository helper should return a contract-valid model.");

const routeSource = fs.readFileSync(path.join(root, "app", "api", "operations-center", "route.ts"), "utf8");
assert(routeSource.includes("Bearer"), "Production endpoint should require an authenticated bearer token.");
assert(routeSource.includes("status: 401"), "Production endpoint should fail closed when authentication is missing.");
assert(routeSource.includes("status: 403"), "Production endpoint should fail closed when organization or role resolution fails.");
assert(routeSource.includes("loadOperationsCenterModelFromRepository"), "Production endpoint should use the repository/model boundary.");
assert(routeSource.includes('source: "supabase"'), "Production endpoint should label Supabase-sourced models.");

const appSource = fs.readFileSync(path.join(root, "src", "components", "cas-app.tsx"), "utf8");
assert(appSource.includes("/api/operations-center"), "Production dashboard should load the Operations Center through the API boundary.");
assert(appSource.includes("productionOperationsCenterModel"), "Production dashboard should use server-returned dashboard state.");
assert(!appSource.includes("productionOperationsCenterModel ??"), "Production dashboard must not silently fall back to demo-derived model data.");

for (const pack of rulePacks.reviewRulePacks) {
  assert(pack.version, `${pack.id} should be versioned.`);
  assert(pack.effectiveFrom, `${pack.id} should have an effective date.`);
  assert(pack.ruleIds.length > 0, `${pack.id} should list rules.`);
  assert(pack.sourceReference, `${pack.id} should preserve source reference text.`);
}

const conventionalProfile = profiles.selectReportProfile("1004 URAR");
const conventionalOrder = orders.find((order) => order.id === "ord-1001");
assert(conventionalOrder, "Expected conventional demo order.");
const conventionalOverlays = profiles.selectReviewOverlays({ order: conventionalOrder, profile: conventionalProfile, organization: org });
assert(rulePacks.getReviewRulePacks(conventionalProfile, conventionalOverlays).some((pack) => pack.id === "pack-legacy-conventional-single-family-v1"), "Conventional profile should select the conventional pack.");

const conventional = ingest("ord-1001", "conventional inconsistency");
assert(conventional.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-legacy-conventional-single-family-v1"), "Conventional review should preserve the pack summary.");
assert(conventional.reviewResult.findings.every((finding) => finding.ruleVersion && finding.whyItMatters && finding.deterministic === true), "Findings should preserve rule governance metadata.");
assert(conventional.reviewResult.findings.some((finding) => finding.ruleId === "adjustment-grid-balanced" && finding.severity === "Warning"), "Conventional pack should run adjustment grid checks.");

const fha = ingest("ord-1002", "fha condition");
assert(fha.reviewResult.overlayIds.includes("fha"), "FHA order should select FHA overlay.");
assert(fha.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-fha-single-family-overlay-v1"), "FHA result should identify FHA pack version.");
assert(fha.reviewResult.findings.some((finding) => finding.ruleId === "fha-subject-to-consistency" && finding.requiresHumanJudgment), "FHA subject-to check should remain human-controlled.");

const va = ingest("ord-1004", "va mpr review question");
assert(va.reviewResult.overlayIds.includes("va"), "VA order should select VA overlay.");
assert(va.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-va-single-family-overlay-v1"), "VA result should identify VA pack version.");
assert(va.reviewResult.findings.some((finding) => finding.ruleId === "va-mpr-review-question" && finding.severity === "Advisory"), "VA MPR concern should be advisory and human-reviewed.");
assert(!JSON.stringify(va.reviewResult).includes("MPR failure"), "VA review must not automatically declare an MPR failure.");

const estate = ingest("ord-demo-private", "estate retrospective");
assert(estate.reviewResult.rulePackSummary.some((pack) => pack.id === "pack-estate-retrospective-v1"), "Estate result should identify estate pack version.");
assert(estate.reviewResult.findings.some((finding) => finding.ruleId === "estate-retrospective-effective-date" && finding.severity === "Critical"), "Wrong retrospective effective date should be critical.");

const clean = ingest("ord-demo-ready", "clean");
assert.equal(clean.status, "ready", "Clean report should remain ready after new packs.");
assert.equal(clean.reviewResult.aiProviderStatus, "disabled", "AI review provider should remain disabled by default.");

console.log("Phase 10.6 secure Operations Center contract, server boundary, rule packs, and demo review scenarios passed.");
