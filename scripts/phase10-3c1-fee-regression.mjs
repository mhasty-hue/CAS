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

const fees = require("../src/lib/orders/fees.ts");
const { orders } = require("../src/data/demo.ts");
const { organizations, portalUsers } = require("../src/data/platform.ts");

const amcOrg = organizations.find((organization) => organization.id === "org-amc-1");
const clientOrg = organizations.find((organization) => organization.id === "org-client-1");
const companyOrg = organizations.find((organization) => organization.id === "org-firm-1");
const amcAdmin = portalUsers.find((user) => user.id === "user-amc");
const appraiser = portalUsers.find((user) => user.id === "user-appraiser");
const client = portalUsers.find((user) => user.id === "user-client");
const reviewer = portalUsers.find((user) => user.id === "user-reviewer");
assert(amcOrg && clientOrg && companyOrg && amcAdmin && appraiser && client && reviewer, "Expected demo users and orgs.");

const baseOrder = orders.find((order) => order.id === "ord-1001");
assert(baseOrder, "Expected base order.");
const order = {
  ...baseOrder,
  appraiser: appraiser.appraiserName,
  clientFee: 600,
  vendorFee: 500,
  companyMargin: 100,
  fee: 600,
  appraiserPayout: 500,
  payrollSnapshot: {
    ...baseOrder.payrollSnapshot,
    grossFee: 600,
    commissionableBase: 565,
    calculatedPayout: 500,
    finalPayout: 500
  }
};

function keys(list) {
  return list.map((item) => item.key).sort();
}

const amcFees = fees.getAuthorizedOrderFees(order, amcAdmin, amcOrg);
assert.deepEqual(keys(amcFees), ["clientFee", "margin", "vendorFee"], "AMC admin should see client fee, vendor fee, and gross spread.");
assert.equal(amcFees.find((item) => item.key === "clientFee").amount, 600, "AMC client fee should be the client charge.");
assert.equal(amcFees.find((item) => item.key === "vendorFee").amount, 500, "AMC vendor fee should be the appraiser/vendor agreement.");
assert.equal(amcFees.find((item) => item.key === "margin").amount, 100, "AMC margin should be client fee minus vendor fee.");

const appraiserFees = fees.getAuthorizedOrderFees(order, appraiser, companyOrg);
assert.deepEqual(keys(appraiserFees), ["vendorFee"], "Assigned appraiser should see only their assignment fee.");
assert.equal(appraiserFees[0].label, "Your Assignment Fee", "Appraiser label should not imply client fee.");
assert.equal(appraiserFees[0].amount, 500, "Appraiser should see the agreed vendor fee.");
const appraiserPayload = fees.sanitizeOrderFeesForUser(order, appraiser, companyOrg);
assert.equal(appraiserPayload.clientFee, undefined, "Appraiser API payload should exclude client fee.");
assert.equal(appraiserPayload.companyMargin, undefined, "Appraiser API payload should exclude margin.");
assert.equal(appraiserPayload.fee, 500, "Appraiser payload primary fee should be the vendor fee only.");
assert.equal(appraiserPayload.appraiserPayout, 500, "Appraiser payout should match the authorized vendor fee.");

const clientFees = fees.getAuthorizedOrderFees(order, client, clientOrg);
assert.deepEqual(keys(clientFees), ["clientFee"], "Lender/client should see only the appraisal fee it is charged.");
assert.equal(clientFees[0].label, "Appraisal Fee", "Client label should be client-facing.");
assert.equal(clientFees[0].amount, 600, "Client should see client fee only.");
const clientPayload = fees.sanitizeOrderFeesForUser(order, client, clientOrg);
assert.equal(clientPayload.vendorFee, undefined, "Client API payload should exclude vendor fee.");
assert.equal(clientPayload.companyMargin, undefined, "Client API payload should exclude AMC spread.");
assert.equal(clientPayload.appraiserPayout, 0, "Client payload should not expose appraiser payout.");

const reviewerFees = fees.getAuthorizedOrderFees(order, reviewer, companyOrg);
assert.equal(reviewerFees.length, 0, "Reviewer should not see fees without explicit accounting permission.");
const reviewerPayload = fees.sanitizeOrderFeesForUser(order, reviewer, companyOrg);
assert.equal(reviewerPayload.clientFee, undefined, "Reviewer payload should exclude client fee.");
assert.equal(reviewerPayload.vendorFee, undefined, "Reviewer payload should exclude vendor fee.");
assert.equal(reviewerPayload.companyMargin, undefined, "Reviewer payload should exclude margin.");

const awarded = fees.applyAwardedVendorFee(order, 475);
assert.equal(awarded.clientFee, 600, "Awarding a bid must preserve client fee.");
assert.equal(awarded.vendorFee, 475, "Awarding a bid should update vendor fee.");
assert.equal(awarded.appraiserPayout, 475, "Awarding a bid should align appraiser payout with vendor fee.");
assert.equal(awarded.companyMargin, 125, "Awarding a bid should recalculate margin without changing client charge.");

const orderDetailSource = fs.readFileSync(path.join(root, "src", "components", "cas", "order-detail.tsx"), "utf8");
const ordersSource = fs.readFileSync(path.join(root, "src", "components", "cas", "orders.tsx"), "utf8");
assert(orderDetailSource.includes("getAuthorizedOrderFees"), "Order detail should render only authorized fee fields.");
assert(orderDetailSource.includes("Proposed Vendor Fee") && orderDetailSource.includes("Vendor fee"), "Bid and assignment UI should use vendor-fee labels.");
assert(!orderDetailSource.includes('label="Order fee"'), "Order detail accounting should not use ambiguous Order fee label.");
assert(ordersSource.includes("Authorized fees"), "Orders table and drawer should use authorized fee terminology.");
assert(!ordersSource.includes("<th className=\"px-4 py-3 font-semibold\">Fee</th>"), "Orders table should not expose a generic Fee column.");
assert(ordersSource.includes("getAuthorizedOrderFees"), "Orders table should use fee visibility policy.");

console.log("Phase 10.3C.1 fee visibility and bid-award fee checks passed.");
