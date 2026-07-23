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

const detail = require("../src/lib/orders/detail.ts");
const workflow = require("../src/lib/orders/workflow.ts");
const { orders } = require("../src/data/demo.ts");
const { organizations, portalUsers } = require("../src/data/platform.ts");
const { bidAwards, bidRecipients, bidRequests, bidResponses, connectedParticipants, vendorCountyCoverage } = require("../src/data/connected.ts");

const companyOrg = organizations.find((organization) => organization.id === "org-firm-1");
const amcOrg = organizations.find((organization) => organization.id === "org-amc-1");
const clientOrg = organizations.find((organization) => organization.id === "org-client-1");
const soloOrg = organizations.find((organization) => organization.id === "org-solo-1");
const admin = portalUsers.find((user) => user.id === "user-admin");
const amcAdmin = portalUsers.find((user) => user.id === "user-amc");
const jordan = portalUsers.find((user) => user.id === "user-appraiser");
const claire = portalUsers.find((user) => user.id === "user-client");
const talia = portalUsers.find((user) => user.id === "user-solo");
assert(companyOrg && amcOrg && clientOrg && soloOrg && admin && amcAdmin && jordan && claire && talia, "Expected demo organizations and users to exist.");

const connected = { participants: connectedParticipants };
const bidContext = { requests: bidRequests, recipients: bidRecipients, responses: bidResponses, awards: bidAwards };
const cobbOrder = orders.find((order) => order.id === "ord-1001");
const amcManagedOrder = orders.find((order) => order.amc === "Pioneer AMC");
assert(cobbOrder && amcManagedOrder, "Expected relationship demo orders.");

function summaryValue(items, label) {
  return items.find((item) => item.label === label)?.value;
}

const amcRelationship = detail.buildOrderRelationshipSummary({ order: amcManagedOrder, user: amcAdmin, organization: amcOrg, connected });
assert.equal(summaryValue(amcRelationship, "Ordered by"), amcManagedOrder.client, "AMC-managed summary should show the ordering lender/client.");
assert.equal(summaryValue(amcRelationship, "Managed by"), "Pioneer AMC", "AMC-managed summary should show the managing AMC.");
assert.equal(summaryValue(amcRelationship, "Assigned appraiser"), amcManagedOrder.appraiser, "AMC-managed summary should show the assigned appraiser.");
assert(!amcRelationship.some((item) => /org-|ord-|participant-/.test(item.value)), "Relationship summary must not expose internal identifiers.");

const directLenderOrder = { ...cobbOrder, id: "relationship-direct-lender", amc: "Direct Lender", client: "HarborPoint Lending", appraiser: "Jordan Lee" };
const directRelationship = detail.buildOrderRelationshipSummary({ order: directLenderOrder, user: claire, organization: clientOrg, connected: { participants: [] } });
assert.equal(summaryValue(directRelationship, "Ordered by"), "HarborPoint Lending", "Direct lender summary should show the lender as orderer.");
assert.equal(summaryValue(directRelationship, "Managed by"), "HarborPoint Lending", "Direct lender summary should not invent an AMC.");

const publicOrder = { ...cobbOrder, id: "relationship-public-order", amc: "Direct private client", client: "Private Client", appraiser: "Jordan Lee" };
const publicRelationship = detail.buildOrderRelationshipSummary({ order: publicOrder, user: admin, organization: companyOrg, connected: { participants: [] } });
assert.equal(summaryValue(publicRelationship, "Ordered by"), "Private Client", "Public order summary should show private client orderer.");
assert.equal(summaryValue(publicRelationship, "Managed by"), "CAA Valuation Group", "Public order summary should show managing appraisal company.");

const clientRelationship = detail.buildOrderRelationshipSummary({ order: cobbOrder, user: claire, organization: clientOrg, connected });
assert(!clientRelationship.some((item) => item.label === "Billing party"), "Client users should not see private billing relationship details by default.");
assert(!clientRelationship.some((item) => item.label === "Assigned company"), "Client users should not see private assigned-company relationship details.");

const clientSections = detail.getOrderDetailSections(cobbOrder, claire, clientOrg);
assert(!clientSections.includes("assignment"), "Lender/client users should not see the internal Assignment tab.");
assert(!clientSections.includes("accounting"), "Accounting tab must be hidden without financial permission.");
assert(!clientSections.includes("review"), "Internal review notes must stay private from client-facing users.");
assert(clientSections.includes("documents") && clientSections.includes("messages") && clientSections.includes("delivery"), "Client-facing users should retain permitted order status, documents, messages, and delivery access.");

const appraiserSections = detail.getOrderDetailSections(cobbOrder, jordan, companyOrg);
assert(appraiserSections.includes("assignment") && appraiserSections.includes("schedule") && appraiserSections.includes("documents"), "Assigned appraiser should see assignment, schedule, and document work.");
assert(detail.canViewOrderAccounting(cobbOrder, jordan), "Assigned appraiser should see own pay summary.");
assert(!detail.canViewOrderAccounting({ ...cobbOrder, appraiser: "Priya Shah" }, jordan), "Appraiser must not see another appraiser's pay summary.");

const needsAssignment = {
  ...cobbOrder,
  id: "ord-needs-assignment-regression",
  status: "Unassigned",
  appraiser: "Unassigned",
  county: "Cobb",
  productType: "1004 URAR",
  loanType: "Conventional",
  nextAction: "Find an appraiser"
};
const assignmentAction = detail.getPrimaryOrderAction(needsAssignment, admin, companyOrg);
assert.equal(assignmentAction.label, "Find an Appraiser", "Needs Assignment order should show Find an Appraiser as the primary action.");

const cobbEligibility = detail.getOrderBidEligibility(needsAssignment, vendorCountyCoverage);
assert(cobbEligibility.eligible.some((coverage) => coverage.displayName === "North Metro Valuation"), "Direct county vendor should appear as eligible.");
assert(cobbEligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("Does not cover the subject county")), "Non-covering vendor should be excluded.");
assert(cobbEligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("E&O is not current")), "Expired E&O vendor should be excluded.");
assert(cobbEligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("W-9 is not on file")), "Missing W-9 vendor should be excluded.");

const expiredLicenseCoverage = { ...vendorCountyCoverage[0], id: "cov-expired-license-test", displayName: "Expired License Test", licenseStatus: "expired" };
const expiredLicenseEligibility = detail.getOrderBidEligibility(needsAssignment, [expiredLicenseCoverage]);
assert(expiredLicenseEligibility.excluded[0].exclusionReasons.includes("License is not current"), "Expired license vendor should be excluded.");

const unsupportedProductCoverage = { ...vendorCountyCoverage[0], id: "cov-unsupported-product-test", displayName: "Unsupported Product Test", productTypes: ["Desktop Review"], specialties: ["Review"] };
const unsupportedProductEligibility = detail.getOrderBidEligibility(needsAssignment, [unsupportedProductCoverage]);
assert(unsupportedProductEligibility.excluded[0].exclusionReasons.includes("Does not support this product type"), "Unsupported product vendor should be excluded.");

const directDraft = detail.buildDirectAssignmentDraft(needsAssignment, cobbEligibility.eligible[0]);
assert.equal(directDraft.orderId, needsAssignment.id, "Direct assignment should use the current order.");
assert.equal(directDraft.duplicateOrderCreated, false, "Direct assignment must not create a duplicate order.");
assert.equal(directDraft.statusAfterSend, "Assigned", "Direct assignment should move to awaiting vendor acceptance using existing Assigned status.");
assert(workflow.queueMatchesOrder({ ...needsAssignment, status: "Assigned", appraiser: directDraft.selectedVendorNames[0] }, "awaiting-acceptance"), "Assigned order should enter Awaiting Acceptance queue.");
assert(workflow.queueMatchesOrder({ ...needsAssignment, status: "Accepted", appraiser: directDraft.selectedVendorNames[0] }, "active"), "Accepted assignment should enter Active queue.");
assert(workflow.requiresStatusReason("Assigned", "Unassigned"), "Declining or withdrawing an assignment should require a reason.");

const nearbyOrder = { ...needsAssignment, id: "ord-nearby-regression", county: "Pickens", productType: "VA 1004", loanType: "VA" };
const nearbyCoverage = {
  ...vendorCountyCoverage[0],
  id: "cov-nearby-qualified-test",
  displayName: "Nearby Qualified Appraiser",
  county: "Cherokee",
  productTypes: ["VA 1004"],
  specialties: ["VA"],
  currentWorkload: 2,
  capacityLimit: 8,
  capacityStatus: "available"
};
const nearbyEligibility = detail.getOrderBidEligibility(nearbyOrder, [nearbyCoverage]);
assert.equal(nearbyEligibility.eligible.length, 0, "Nearby candidates must not be treated as direct county coverage.");
assert.equal(nearbyEligibility.nearby.length, 1, "Nearby candidates should appear only when no direct vendor qualifies.");
const nearbyDraft = detail.buildBidRequestDraft(nearbyOrder, nearbyEligibility.nearby);
assert.equal(nearbyDraft.requiresCoverageConfirmation, true, "Nearby bid recipients should require coverage confirmation.");

const biddableOrder = { ...cobbOrder, status: "Unassigned", appraiser: "Unassigned" };
const bidAction = detail.getPrimaryOrderAction(biddableOrder, admin, companyOrg, bidContext);
assert.equal(bidAction.label, "Review Bid Responses", "Orders with submitted bid responses should prompt authorized users to review responses.");
assert.equal(bidRequests.filter((request) => request.orderId === cobbOrder.id).length, 1, "One master bid request should be tied to one order.");
assert(bidRecipients.filter((recipient) => recipient.bidRequestId === bidRequests[0].id).length > 1, "Bid request should create multiple private recipient invitations.");
assert.equal(orders.filter((order) => order.id === cobbOrder.id).length, 1, "Bidding must not create duplicate order records.");
const bidDraft = detail.buildBidRequestDraft(biddableOrder, cobbEligibility.eligible.slice(0, 2));
assert.equal(bidDraft.orderId, cobbOrder.id, "Bid request draft should use the current order ID.");
assert.equal(bidDraft.statusAfterSend, "Bidding", "Bid request draft should express the Bidding assignment state.");
assert.equal(bidDraft.recipientCount, 2, "Bid request draft should create one invitation per selected recipient.");
assert.equal(bidDraft.duplicateOrderCreated, false, "Bid request must not create duplicate orders.");
assert.equal(bidAwards[0].orderId, cobbOrder.id, "Award should convert a winning response into assignment on the same order.");

const soloVisibleRecipients = detail.getVisibleBidRecipientsForUser(cobbOrder, bidContext, talia, soloOrg);
assert.equal(soloVisibleRecipients.length, 1, "Bidder should see only their own invitation.");
assert.equal(soloVisibleRecipients[0].recipientName, "Talia Morris Appraisals", "Solo bidder should not see other bidders.");
assert.equal(detail.getVisibleBidRecipientsForUser(cobbOrder, bidContext, claire, clientOrg).length, 0, "Lender using AMC must not see bid recipients.");
assert.equal(detail.canViewBidComparison(cobbOrder, claire, clientOrg), false, "Lender using AMC must not see bid responses or vendor fee comparison.");

const clientHistory = detail.buildPlainOrderHistory(cobbOrder, claire, clientRelationship);
assert(clientHistory.every((item) => !/org-|ord-|participant-|^\{/.test(item)), "History should be plain language without internal IDs or raw JSON.");

const orderDetailSource = fs.readFileSync(path.join(root, "src", "components", "cas", "order-detail.tsx"), "utf8");
const ordersSource = fs.readFileSync(path.join(root, "src", "components", "cas", "orders.tsx"), "utf8");
assert(orderDetailSource.includes("<details") && orderDetailSource.includes("Excluded vendors"), "Excluded vendors should be collapsed by default.");
assert(orderDetailSource.includes("Nearby candidates are not contacted unless manually selected"), "Nearby candidates must not be contacted automatically.");
assert(orderDetailSource.includes("Coverage confirmation required"), "Nearby coverage confirmation should be required in the UI.");
assert(orderDetailSource.includes("Non-winners receive"), "Award flow should include professional non-winner notification copy.");
assert(orderDetailSource.includes("getPrimaryOrderAction") && ordersSource.includes("getPrimaryOrderAction"), "Drawer and full order page should share order-detail policy helpers.");

console.log("Phase 10.3C order detail, assignment, bidding, visibility, and eligibility regression checks passed.");
