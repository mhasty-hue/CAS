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

const mode = require("../src/lib/demo/mode.ts");
const publicDemo = require("../src/lib/demo/public-demo.ts");
const workflow = require("../src/lib/orders/workflow.ts");
const detail = require("../src/lib/orders/detail.ts");
const fees = require("../src/lib/orders/fees.ts");
const statusConfig = require("../src/lib/orders/status-config.ts");
const supabase = require("../src/lib/supabase.ts");
const { orders } = require("../src/data/demo.ts");
const { organizations, portalUsers } = require("../src/data/platform.ts");
const { bidRequests, bidRecipients, bidResponses, vendorCountyCoverage } = require("../src/data/connected.ts");

delete process.env.NEXT_PUBLIC_CAS_DEMO_MODE;
delete process.env.CAS_DEMO_MODE;
process.env.NEXT_PUBLIC_CAS_DATA_SOURCE = "supabase";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_demo";

assert.equal(mode.isClientPublicDemoMode(), false, "Public demo mode should be off by default.");
assert.equal(mode.shouldBypassAuthForPublicDemo(), false, "Public auth bypass must be off unless both demo env flags are enabled.");
assert.equal(supabase.shouldUseSupabaseDataSource(), true, "Supabase mode should remain available when public demo mode is off.");

process.env.NEXT_PUBLIC_CAS_DEMO_MODE = "true";
assert.equal(mode.isClientPublicDemoMode(), true, "Client public demo flag should require an explicit true value.");
assert.equal(mode.shouldBypassAuthForPublicDemo(), false, "Client flag alone must not be treated as a server-side public auth bypass.");
process.env.CAS_DEMO_MODE = "true";
assert.equal(mode.shouldBypassAuthForPublicDemo(), true, "Public demo auth bypass should require the server-side demo flag too.");
assert.equal(publicDemo.publicDemoDataMode.storage, "static-session", "Public demo should use static session-local fixtures.");

for (const role of publicDemo.publicDemoRoleCards) {
  const user = portalUsers.find((candidate) => candidate.id === role.userId);
  assert(user, `Missing public demo user for ${role.title}.`);
  const organization = organizations.find((candidate) => candidate.id === user.organizationId);
  assert(organization, `Missing public demo organization for ${role.title}.`);
  assert.equal(organization.name, role.organizationName, `${role.title} should load the expected fictional organization.`);
}

const expectedOrganizations = [
  "National Valuation Services",
  "HarborPoint Lending",
  "First Carolina Community Bank",
  "CAA Real Property Services",
  "Upstate Appraisal Group",
  "Blue Ridge Valuation",
  "Rowan Legal Group",
  "Private Property Owner",
  "Hollis Estate Representative"
];
for (const organizationName of expectedOrganizations) {
  assert(organizations.some((organization) => organization.name === organizationName), `Missing fictional organization ${organizationName}.`);
}

const statusCoverage = {
  "New Intake": orders.some((order) => order.status === "New"),
  "Needs Assignment": orders.some((order) => order.status === "Unassigned"),
  Bidding: bidRequests.some((request) => request.orderId === "ord-1006" && request.status === "open"),
  "Awaiting Vendor Acceptance": orders.some((order) => order.status === "Assigned") || bidRequests.some((request) => request.status === "open"),
  Active: orders.some((order) => order.status === "Accepted"),
  "Inspection Scheduling": orders.some((order) => order.status === "Accepted" && !order.inspectionDate),
  "Inspection Scheduled": orders.some((order) => order.status === "Inspection Scheduled"),
  "Report in Progress": orders.some((order) => order.status === "Report In Progress"),
  "Report Submitted": orders.some((order) => order.status === "Submitted"),
  "In Review": orders.some((order) => order.status === "In Review"),
  "Revision Requested": orders.some((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser"),
  "Ready for Delivery": orders.some((order) => order.status === "Ready for Delivery"),
  Delivered: orders.some((order) => order.status === "Delivered"),
  Completed: orders.some((order) => order.status === "Completed"),
  Cancelled: orders.some((order) => order.status === "Cancelled")
};
for (const [label, present] of Object.entries(statusCoverage)) {
  assert.equal(present, true, `Missing public demo order workflow state: ${label}.`);
}

const requiredProducts = [
  "Conventional 1004",
  "FHA 1004",
  "VA 1004",
  "Listing appraisal",
  "Estate appraisal",
  "Divorce appraisal",
  "Desktop appraisal",
  "Land appraisal",
  "Small residential income property"
];
for (const product of requiredProducts) {
  assert(orders.some((order) => order.productType === product || order.productType.includes(product)), `Missing public demo product type ${product}.`);
}

const amcAdmin = portalUsers.find((user) => user.id === "user-amc");
const amcStaff = portalUsers.find((user) => user.id === "user-amc-staff");
const appraiser = portalUsers.find((user) => user.id === "user-appraiser");
const soloBidder = portalUsers.find((user) => user.id === "user-solo");
const client = portalUsers.find((user) => user.id === "user-client");
const reviewer = portalUsers.find((user) => user.id === "user-reviewer");
const privateOwner = portalUsers.find((user) => user.id === "user-property-owner");
const amcOrg = organizations.find((organization) => organization.id === "org-amc-1");
const companyOrg = organizations.find((organization) => organization.id === "org-firm-1");
const clientOrg = organizations.find((organization) => organization.id === "org-client-1");
const privateOrg = organizations.find((organization) => organization.id === "org-private-owner");
assert(amcAdmin && amcStaff && appraiser && soloBidder && client && reviewer && privateOwner && amcOrg && companyOrg && clientOrg && privateOrg, "Expected public demo users and orgs.");

const needsAssignment = orders.find((order) => order.id === "ord-1006");
assert(needsAssignment, "Missing needs-assignment demo order.");
const eligibility = detail.getOrderBidEligibility(needsAssignment, vendorCountyCoverage);
assert(eligibility.eligible.length >= 2, "Needs-assignment demo should have at least two eligible vendors.");
assert(eligibility.eligible.some((coverage) => coverage.vendorProfileId), "Needs-assignment demo should include an eligible appraisal company.");
assert(eligibility.eligible.some((coverage) => coverage.appraiserProfileId), "Needs-assignment demo should include an eligible individual appraiser.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("Does not cover the subject county")), "County coverage exclusion should appear.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("License is not current")), "Expired license exclusion should appear.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("E&O is not current")), "Expired E&O exclusion should appear.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("W-9 is not on file")), "Missing W-9 exclusion should appear.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("Does not support this product type")), "Unsupported product exclusion should appear.");

const publicBid = bidRequests.find((request) => request.id === "bid-1006");
assert(publicBid, "Missing prepopulated public demo bid request.");
const publicBidResponses = bidResponses.filter((response) => response.bidRequestId === publicBid.id).map((response) => response.proposedFee).sort((a, b) => a - b);
assert.deepEqual(publicBidResponses, [475, 500, 525], "Prepopulated demo bids should use the requested fee comparison.");
assert.equal(detail.canViewBidComparison(needsAssignment, amcAdmin, amcOrg), true, "AMC admin should compare demo bids.");
assert.equal(detail.getVisibleBidRecipientsForUser(needsAssignment, { requests: bidRequests, recipients: bidRecipients, responses: bidResponses, awards: [] }, client, clientOrg).length, 0, "Client users must not see bid recipients.");
assert.equal(detail.getVisibleBidRecipientsForUser(needsAssignment, { requests: bidRequests, recipients: bidRecipients, responses: bidResponses, awards: [] }, soloBidder, organizations.find((organization) => organization.id === soloBidder.organizationId)).length, 1, "Bidders should see only their own bid invitation.");

const feeOrder = orders.find((order) => order.id === "ord-demo-fee");
assert(feeOrder, "Missing public demo fee privacy order.");
assert.deepEqual(fees.getAuthorizedOrderFees(feeOrder, amcAdmin, amcOrg).map((item) => item.key).sort(), ["clientFee", "margin", "vendorFee"], "AMC admin should see client fee, vendor fee, and spread.");
assert.deepEqual(fees.getAuthorizedOrderFees(feeOrder, amcStaff, amcOrg).map((item) => item.key), [], "AMC staff should not see restricted fee fields by default.");
assert.deepEqual(fees.getAuthorizedOrderFees(feeOrder, client, clientOrg).map((item) => item.label), ["Appraisal Fee"], "Lender/client should see only the appraisal fee.");
const appraiserPayload = fees.sanitizeOrderFeesForUser({ ...feeOrder, appraiser: appraiser.appraiserName }, appraiser, companyOrg);
assert.equal(appraiserPayload.clientFee, undefined, "Appraiser payload must not expose client fee.");
assert.equal(appraiserPayload.companyMargin, undefined, "Appraiser payload must not expose company margin.");
assert.equal(appraiserPayload.fee, feeOrder.vendorFee, "Appraiser should only receive assignment fee as primary fee.");
assert.equal(fees.getAuthorizedOrderFees(feeOrder, reviewer, companyOrg).length, 0, "Reviewer should not see fees without accounting permission.");

const privateOrder = orders.find((order) => order.id === "ord-demo-private");
assert(privateOrder, "Missing private client tracker order.");
assert.equal(statusConfig.canUseCustomerTrackingView(privateOwner, privateOrg), true, "Private client should get simplified tracking.");
assert(workflow.filterOrdersForWorkflow(orders, privateOwner, privateOrg).every((order) => order.client === "Elena Park"), "Property owner should see only their own private-client orders.");
assert(workflow.filterOrdersForWorkflow(orders, appraiser, companyOrg).every((order) => order.appraiser === appraiser.appraiserName), "Appraiser should see only assigned orders.");

const clonedOrders = publicDemo.clonePublicDemoFixture(orders);
clonedOrders[0].status = "Cancelled";
assert.notEqual(clonedOrders[0].status, orders[0].status, "Reset fixture cloning should isolate demo mutations from original fixtures.");

const casAppSource = fs.readFileSync(path.join(root, "src", "components", "cas-app.tsx"), "utf8");
assert(casAppSource.includes("PublicDemoLandingPage"), "CAS app should render the public demo landing page only through the demo shell.");
assert(casAppSource.includes("Demo assignment invitation simulated"), "Public demo should surface simulated assignment notices.");
assert(casAppSource.includes("Demo email not sent"), "Public demo should surface simulated email notices.");
assert(casAppSource.includes("No production storage bucket was used"), "Public demo should block production storage side-effect messaging.");
const landingSource = fs.readFileSync(path.join(root, "src", "components", "cas", "demo", "public-demo.tsx"), "utf8");
assert(landingSource.includes("Sample data only"), "Public landing should clearly mark sample data.");
assert(landingSource.includes("aria-label=\"Switch demo role\""), "Demo role switcher should be accessible.");
assert(landingSource.includes("Reset Demo"), "Demo banner should include a reset action.");

console.log("Public demo isolation, role visibility, bid, fee, reset, and side-effect checks passed.");
