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
const statusConfig = require("../src/lib/orders/status-config.ts");
const { orders } = require("../src/data/demo.ts");
const { organizations, portalUsers } = require("../src/data/platform.ts");
const { vendorCountyCoverage } = require("../src/data/connected.ts");

const companyOrg = organizations.find((organization) => organization.id === "org-firm-1");
const amcOrg = organizations.find((organization) => organization.id === "org-amc-1");
const clientOrg = organizations.find((organization) => organization.id === "org-client-1");
const admin = portalUsers.find((user) => user.id === "user-admin");
const amcAdmin = portalUsers.find((user) => user.id === "user-amc");
const claire = portalUsers.find((user) => user.id === "user-client");
assert(companyOrg && amcOrg && clientOrg && admin && amcAdmin && claire, "Expected demo users and organizations.");

const statuses = organizations.flatMap((organization) => statusConfig.createDemoOrderStatuses(organization.id));
const cobbOrder = orders.find((order) => order.id === "ord-1001");
assert(cobbOrder, "Expected Cobb demo order.");

assert(statusConfig.canUseCustomerTrackingView(claire, clientOrg), "Client/lender users without operational permissions should get simplified tracking.");
assert(!statusConfig.canUseCustomerTrackingView(admin, companyOrg), "Company admins should keep operational order detail.");
assert(detail.getOrderDetailSections(cobbOrder, admin, companyOrg).includes("assignment"), "Operational users should retain detailed tabs.");
assert(detail.getOrderDetailSections(cobbOrder, amcAdmin, amcOrg).includes("assignment"), "AMC admins should retain operational assignment tabs.");

const qcOrder = { ...cobbOrder, status: "In Review", organizationStatusId: "org-firm-1-status-qc-review" };
assert.equal(statusConfig.getOrganizationStatusLabel(qcOrder, statuses, companyOrg, admin), "QC Review", "Operational users should see the organization-facing status label.");
assert.equal(statusConfig.getClientTrackingStage(qcOrder, statuses, companyOrg), "Report Under Review", "Client tracking should stay simplified even when custom labels exist.");
assert(workflow.queueMatchesOrder(qcOrder, "in-review"), "Queues should continue using the canonical status.");

const orderDetailSource = fs.readFileSync(path.join(root, "src", "components", "cas", "order-detail.tsx"), "utf8");
const customerTrackerSource = orderDetailSource.slice(orderDetailSource.indexOf("function CustomerOrderTracker"), orderDetailSource.indexOf("export function OrderDetailPage"));
assert(customerTrackerSource.includes("Order Progress"), "Customer tracker should render a visual progress section.");
assert(!customerTrackerSource.includes("AssignmentWorkspace"), "Customer tracker must not render the operational assignment workspace.");
assert(!customerTrackerSource.includes("BidComparisonTable"), "Customer tracker must not expose bid comparison.");
assert(!customerTrackerSource.includes("auditTrail"), "Customer tracker must not expose operational audit trail.");
assert(orderDetailSource.includes("canUseCustomerTrackingView"), "Order detail should choose customer tracking through shared policy.");

const needsAssignment = {
  ...cobbOrder,
  id: "ord-needs-assignment-c1",
  status: "Unassigned",
  appraiser: "Unassigned",
  county: "Cobb",
  state: "GA",
  productType: "1004 URAR",
  loanType: "Conventional",
  nextAction: "Find an appraiser"
};
const eligibility = detail.getOrderBidEligibility(needsAssignment, vendorCountyCoverage);
assert(eligibility.eligible.length >= 2, "Demo data should include at least two eligible vendors.");
assert(eligibility.eligible.some((coverage) => coverage.vendorProfileId), "At least one eligible appraisal company should be selectable.");
assert(eligibility.eligible.some((coverage) => coverage.appraiserProfileId), "At least one eligible individual appraiser should be selectable.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("Does not cover the subject county")), "County coverage exclusion should be represented.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("License is not current")), "Expired license exclusion should be represented.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("E&O is not current")), "Expired E&O exclusion should be represented.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("W-9 is not on file")), "Missing W-9 exclusion should be represented.");
assert(eligibility.excluded.some((coverage) => coverage.exclusionReasons.includes("Does not support this product type")), "Unsupported product exclusion should be represented.");

const directDraft = detail.buildDirectAssignmentDraft(needsAssignment, eligibility.eligible[0]);
assert.equal(directDraft.duplicateOrderCreated, false, "Direct assignment should not create duplicate orders.");
assert.equal(directDraft.statusAfterSend, "Assigned", "Direct assignment should move the same order into assignment workflow.");
const bidDraft = detail.buildBidRequestDraft(needsAssignment, eligibility.eligible.slice(0, 2));
assert.equal(bidDraft.recipientCount, 2, "Bid request should support multiple eligible recipients.");
assert.equal(bidDraft.duplicateOrderCreated, false, "Bid request should not create duplicate orders.");

const nearbyOrder = { ...needsAssignment, county: "Pickens", productType: "VA 1004", loanType: "VA" };
const nearby = detail.getOrderBidEligibility(nearbyOrder, vendorCountyCoverage);
assert.equal(nearby.eligible.length, 0, "Nearby candidates must not be treated as direct coverage.");
assert(nearby.nearby.some((coverage) => coverage.id === "cov-cherokee-nearby-va"), "Nearby county candidate should appear when no direct vendor qualifies.");

const ordersSource = fs.readFileSync(path.join(root, "src", "components", "cas", "orders.tsx"), "utf8");
assert(!ordersSource.includes("Bulk update"), "Orders page should remove redundant top bulk action button.");
assert(!ordersSource.includes("<Download"), "Orders page should remove redundant top export button.");
assert(ordersSource.includes("getStatusFilterOptions") && ordersSource.includes("statusFilterMatches"), "Orders filter should use centralized organization status policy.");
assert(ordersSource.includes("getStatusDropdownOptions"), "Table and drawer status dropdowns should use configured status policy.");
assert(ordersSource.includes("All statuses"), "Status filter should be a clear aligned dropdown.");
assert(orderDetailSource.includes("<details") && orderDetailSource.includes("Excluded vendors"), "Excluded vendors should remain collapsed by default.");

const customNames = statuses.map((status) => status.name);
assert(customNames.includes("Waiting on Engagement Letter"), "Demo custom intake status should exist.");
assert(customNames.includes("Searching Panel"), "Demo custom assignment status should exist.");
assert(customNames.includes("QC Review"), "Demo custom review status should exist.");
const searchPanel = statuses.find((status) => status.id === "org-firm-1-status-searching-panel");
assert(searchPanel, "Expected Searching Panel status.");
assert.equal(searchPanel.canonicalStatus, "Unassigned", "Custom status should map to canonical workflow stage.");
assert.equal(searchPanel.clientFacingStage, "Appraiser Being Assigned", "Custom status should map to client-facing simplified stage.");

const dropdownOptions = statusConfig.getStatusDropdownOptions({ ...cobbOrder, status: "New" }, statuses, companyOrg, admin);
assert(dropdownOptions.some((option) => option.label === "Searching Panel"), "Custom active status should appear in dropdown when transition is allowed.");
const hiddenStatuses = statuses.map((status) => status.id === searchPanel.id ? { ...status, active: false, appearsInDropdown: false, appearsAsFilter: false, archivedAt: "Just now" } : status);
assert(!statusConfig.getStatusFilterOptions(hiddenStatuses, companyOrg, admin).some((option) => option.label === "Searching Panel"), "Hidden archived custom status should not appear as a new filter option.");
assert.equal(statusConfig.getOrganizationStatusLabel({ ...needsAssignment, organizationStatusId: searchPanel.id }, hiddenStatuses, companyOrg, admin), "Searching Panel", "Archived status should remain visible on historical orders.");
assert.equal(statusConfig.canDeleteStatus(searchPanel, [{ ...needsAssignment, organizationStatusId: searchPanel.id }]), false, "Used status must not be destructively deletable.");
assert.equal(statusConfig.canArchiveStatus(searchPanel, [{ ...needsAssignment, organizationStatusId: searchPanel.id }]), true, "Used custom status may be archived while preserving history.");
assert.equal(workflow.canTransitionOrderStatus(cobbOrder, "Submitted", claire), false, "Invalid or unauthorized transitions must remain guarded.");

const usersSource = fs.readFileSync(path.join(root, "src", "components", "cas", "users.tsx"), "utf8");
assert(usersSource.includes("Orders / Statuses"), "Settings should expose Orders / Statuses for authorized admins.");
assert(usersSource.includes("Permanent delete is unavailable"), "Settings should warn that destructive status deletion is unavailable.");

console.log("Phase 10.3C.1 status, customer tracking, orders controls, and vendor eligibility checks passed.");
