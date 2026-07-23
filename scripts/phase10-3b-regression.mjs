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

const workflow = require("../src/lib/orders/workflow.ts");
const { orders } = require("../src/data/demo.ts");
const { organizations, portalUsers } = require("../src/data/platform.ts");
const { bidAwards, bidRecipients, bidRequests, bidResponses, connectedOrderSummaries, connectedParticipants } = require("../src/data/connected.ts");

const companyOrg = organizations.find((organization) => organization.id === "org-firm-1");
const clientOrg = organizations.find((organization) => organization.id === "org-client-1");
const jordan = portalUsers.find((user) => user.id === "user-appraiser");
const claire = portalUsers.find((user) => user.id === "user-client");
const admin = portalUsers.find((user) => user.id === "user-admin");
assert(companyOrg && clientOrg && jordan && claire && admin, "Expected demo users and organizations to exist.");

const appraiserOrders = workflow.filterOrdersForWorkflow(orders, jordan, companyOrg);
assert(appraiserOrders.length > 0, "Appraiser should have assigned demo orders.");
assert(!appraiserOrders.some((order) => order.appraiser === "Unassigned"), "Appraisers must not see unassigned orders.");
assert(appraiserOrders.every((order) => order.appraiser === jordan.appraiserName), "Appraisers must not see other appraisers' assignments.");

const baseOrder = orders[0];
const withStatus = (status) => ({ ...baseOrder, id: `test-${status}`, status, dueDate: "2026-07-24" });

assert(!workflow.queueMatchesOrder(withStatus("Ready for Delivery"), "in-review"), "Ready for Delivery must not appear in Review.");
assert(workflow.queueMatchesOrder(withStatus("Ready for Delivery"), "ready-for-delivery"), "Ready for Delivery must appear in its own queue.");
assert(workflow.queueMatchesOrder(withStatus("Delivered"), "delivered"), "Delivered must appear in Delivered.");
assert(!workflow.queueMatchesOrder(withStatus("Delivered"), "completed"), "Delivered must be distinct from Completed.");
assert(workflow.queueMatchesOrder(withStatus("Completed"), "completed"), "Completed must appear in Completed.");
assert(!workflow.queueMatchesOrder(withStatus("Completed"), "active"), "Completed must not remain Active.");
assert(!workflow.queueMatchesOrder(withStatus("Cancelled"), "active"), "Cancelled must not remain Active.");
assert(!workflow.queueMatchesOrder(withStatus("Accepted"), "incoming-assignments"), "Accepted assignments must leave Incoming.");
assert(workflow.queueMatchesOrder(withStatus("Revisions Needed"), "revisions"), "Revision-requested orders must appear in Revisions.");
assert(workflow.queueMatchesOrder(withStatus("Revision Sent to Appraiser"), "revisions"), "Revision responses must appear in Revisions.");

const bidContext = { requests: bidRequests, recipients: bidRecipients, responses: bidResponses, awards: bidAwards };
const openBids = workflow.getOpenBidRequestsForUser(bidContext, admin, companyOrg);
const acceptedAwardRequestIds = new Set(bidAwards.filter((award) => award.status === "accepted" || award.assignmentStatus === "assigned").map((award) => award.bidRequestId));
assert(openBids.every((request) => !acceptedAwardRequestIds.has(request.id)), "Awarded and accepted bids must leave open Bid Requests.");

const connectedContext = { summaries: connectedOrderSummaries, participants: connectedParticipants };
const incoming = workflow.getIncomingAssignmentsForUser(connectedContext, jordan, companyOrg);
assert(incoming.every((order) => !["Accepted", "Delivered", "Completed", "Cancelled"].includes(order.status)), "Accepted or closed assignments must not remain Incoming.");

const clientTabs = workflow.getOrderQueueTabs(claire, clientOrg);
assert(!clientTabs.includes("needs-assignment") && !clientTabs.includes("bid-requests"), "Client users should not see internal AMC/vendor queues.");
const appraiserTabs = workflow.getOrderQueueTabs(jordan, companyOrg);
assert(!appraiserTabs.includes("needs-assignment") && appraiserTabs.includes("bid-requests"), "Appraisers should see assignment/bid work but not unassigned queues.");

assert.equal(workflow.resolveLegacyOrderQueue("completed-orders", admin, companyOrg), "completed", "Completed route should map to Orders completed tab.");
assert.equal(workflow.resolveLegacyOrderQueue("cancelled-orders", admin, companyOrg), "cancelled", "Cancelled route should map to Orders cancelled tab.");
assert.equal(workflow.resolveLegacyOrderQueue("all-orders", admin, companyOrg), "all", "All Orders route should map to Orders all tab.");
assert.equal(workflow.resolveLegacyOrderQueue("incoming-orders", jordan, companyOrg), "incoming-assignments", "Incoming route should map to Incoming Assignments.");
assert.equal(workflow.resolveLegacyOrderQueue("bids", admin, companyOrg), "bid-requests", "Bids route should map to Bid Requests.");

const ordersSource = fs.readFileSync(path.join(root, "src", "components", "cas", "orders.tsx"), "utf8");
const transitionSelectUses = ordersSource.match(/<StatusTransitionSelect order=\{order\} user=\{user\}/g) ?? [];
assert(transitionSelectUses.length >= 2, "Table and drawer must both use the shared status-transition control.");

console.log("Phase 10.3B queue/navigation/status regression checks passed.");
