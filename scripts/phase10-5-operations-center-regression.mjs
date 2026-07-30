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
const operations = require("../src/lib/operations-center/service.ts");
const workflow = require("../src/lib/orders/workflow.ts");

const morning = new Date("2026-07-30T13:30:00.000Z"); // 9:30 AM New York
const afternoon = new Date("2026-07-30T18:30:00.000Z"); // 2:30 PM New York
const evening = new Date("2026-07-30T23:30:00.000Z"); // 7:30 PM New York

function user(id) {
  const found = portalUsers.find((candidate) => candidate.id === id);
  assert(found, `Missing user ${id}`);
  return found;
}

function orgFor(userId) {
  const activeUser = user(userId);
  const found = organizations.find((organization) => organization.id === activeUser.organizationId);
  assert(found, `Missing organization for ${userId}`);
  return found;
}

function model(userId, now = morning) {
  const activeUser = user(userId);
  return operations.buildOperationsCenterModel({
    orders,
    appraisers,
    user: activeUser,
    organization: orgFor(userId),
    vendors,
    vendorDocuments,
    accountingEntries,
    invoices,
    tasks: workflowTasks,
    now
  });
}

function serialized(payload) {
  return JSON.stringify(payload);
}

assert.equal(operations.resolveGreeting({ user: user("user-client"), organization: orgFor("user-client"), now: morning }), "Good morning, Claire.");
assert.equal(operations.resolveGreeting({ user: user("user-client"), organization: orgFor("user-client"), now: afternoon }), "Good afternoon, Claire.");
assert.equal(operations.resolveGreeting({ user: user("user-client"), organization: orgFor("user-client"), now: evening }), "Good evening, Claire.");
assert.equal(operations.resolveGreeting({ user: { ...user("user-client"), name: "", firstName: "", preferredName: "" }, organization: orgFor("user-client"), now: morning }), "Welcome back.");

const amcAdmin = model("user-amc");
const amcStaff = model("user-amc-staff");
const lender = model("user-client");
const internalLender = model("user-lender-internal");
const hybridLender = model("user-hybrid-lender");
const owner = model("user-admin");
const appraiser = model("user-appraiser");
const reviewer = model("user-reviewer");
const attorney = model("user-attorney");
const propertyOwner = model("user-property-owner");

assert.equal(amcAdmin.persona, "amc_admin");
assert.equal(amcStaff.persona, "amc_staff");
assert.equal(lender.persona, "lender_amc");
assert.equal(internalLender.persona, "internal_lender");
assert.equal(hybridLender.persona, "hybrid_lender");
assert.equal(owner.persona, "appraisal_owner");
assert.equal(appraiser.persona, "individual_appraiser");
assert.equal(reviewer.persona, "reviewer");
assert.equal(attorney.persona, "private_professional_client");
assert.equal(propertyOwner.persona, "property_owner");

assert(amcAdmin.scope.financialPolicy.includes("client_fee"), "AMC admin should see client fees when authorized.");
assert(amcAdmin.scope.financialPolicy.includes("vendor_fee"), "AMC admin should see vendor fees when authorized.");
assert(amcAdmin.scope.financialPolicy.includes("gross_spread_or_margin"), "AMC admin should see margin when authorized.");
assert.equal(amcStaff.snapshots.some((item) => item.source === "finance"), false, "AMC staff should not receive executive finance cards by default.");
assert.equal(amcStaff.scope.financialPolicy.length, 0, "AMC staff payload should omit financial policy without fee permission.");

assert(lender.scope.financialPolicy.includes("client_fee"), "Lender should see client fee when authorized.");
assert(!lender.scope.financialPolicy.includes("vendor_fee"), "Lender must not receive vendor fee.");
assert(!lender.scope.financialPolicy.includes("gross_spread_or_margin"), "Lender must not receive margin.");
assert(!serialized(lender).includes("Vendor Fee"), "Lender payload must not serialize vendor fee labels.");
assert(!serialized(lender).includes("Gross Spread"), "Lender payload must not serialize margin labels.");

assert(appraiser.scope.financialPolicy.includes("own_assignment_fee"), "Assigned appraiser should receive only own assignment fee.");
assert(!serialized(appraiser).includes("Client Fee"), "Appraiser payload must not serialize client fee labels.");
assert(!serialized(appraiser).includes("Gross Spread"), "Appraiser payload must not serialize margin labels.");
assert(appraiser.capacityInsights.every((insight) => insight.appraiser.name === user("user-appraiser").appraiserName), "Appraiser should not see other appraisers' capacity.");

assert.equal(reviewer.snapshots.some((item) => item.source === "finance"), false, "Reviewer should not receive finance dashboard cards.");
assert.equal(reviewer.scope.financialPolicy.length, 0, "Reviewer should not receive financial policy.");
assert(!serialized(reviewer).includes("Payroll"), "Reviewer payload should not include payroll alerts.");

assert(propertyOwner.scope.orderCount <= 1, "Private property owner should receive only their own simplified order scope.");
assert.equal(propertyOwner.capacityInsights.length, 0, "Private property owner must not receive internal capacity.");
assert.equal(propertyOwner.vendorScorecards.length, 0, "Private property owner must not receive vendor scorecards.");
assert(!serialized(propertyOwner).includes("Vendor Fee"), "Private property owner must not receive vendor fee labels.");
assert(!serialized(propertyOwner).includes("reviewer"), "Private property owner payload should avoid internal reviewer language.");

for (const payload of [amcAdmin, amcStaff, lender, appraiser, reviewer, attorney, propertyOwner]) {
  const visible = new Set(payload.scope.visibleOrderIds);
  for (const item of payload.missionItems) {
    assert.equal(item.scopedOrderIds.every((orderId) => visible.has(orderId)), true, `${payload.persona} mission ${item.id} includes non-visible orders.`);
  }
  assert(!serialized(payload).includes("$86.4k"), `${payload.persona} should not receive static dashboard KPI demo revenue.`);
}

const sourceFiles = [
  "src/components/cas/dashboard/command-center.tsx",
  "src/components/cas/dashboard.tsx",
  "src/lib/operations-center/service.ts"
].map((file) => fs.readFileSync(path.join(root, file), "utf8"));

assert.equal(sourceFiles.some((source) => source.includes("Good morning, Matt")), false, "Dashboard must not hard-code Matt.");
assert.equal(sourceFiles.some((source) => source.includes("Good Morning")), false, "Dashboard must not hard-code Good Morning.");

assert.equal(workflow.filterOrdersForWorkflow(orders, user("user-client"), orgFor("user-client")).length, lender.scope.orderCount, "Lender operation count must match workflow scope.");
assert.equal(workflow.filterOrdersForWorkflow(orders, user("user-appraiser"), orgFor("user-appraiser")).length, appraiser.scope.orderCount, "Appraiser operation count must match workflow scope.");

console.log("Phase 10.5 Operations Center greeting, scope, role visibility, finance redaction, activity, and demo checks passed.");
