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

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const { orders } = require("../src/data/demo.ts");
const platform = require("../src/data/platform.ts");
const catalog = require("../src/lib/notifications/catalog.ts");
const privacy = require("../src/lib/notifications/privacy.ts");
const service = require("../src/lib/notifications/service.ts");
const reminders = require("../src/lib/notifications/reminders.ts");
const history = require("../src/lib/notifications/communication-history.ts");

const organization = platform.organizations.find((item) => item.id === "org-firm-1");
const order = orders.find((item) => item.id === "ord-1001");
const appraiserUser = platform.portalUsers.find((item) => item.role === "appraiser");
const reviewerUser = platform.portalUsers.find((item) => item.role === "reviewer");
const clientUser = platform.portalUsers.find((item) => item.role === "client_user");
const adminUser = platform.portalUsers.find((item) => item.role === "company_admin");
assert(organization && order && appraiserUser && reviewerUser && clientUser && adminUser, "Expected demo organization, users, and order.");

const requiredEvents = [
  "new_order_received",
  "bid_request_sent",
  "bid_submitted",
  "direct_assignment_sent",
  "inspection_scheduled",
  "report_due_soon",
  "report_overdue",
  "report_uploaded",
  "revision_requested",
  "final_report_delivered",
  "invoice_overdue",
  "license_expiring",
  "new_client_message",
  "password_security_notification"
];
for (const eventKey of requiredEvents) {
  assert(catalog.notificationEventCatalog[eventKey], `Event catalog should include ${eventKey}.`);
}

const appraiserRecipient = {
  id: appraiserUser.id,
  name: appraiserUser.name,
  email: appraiserUser.email,
  role: appraiserUser.role,
  organizationId: organization.id,
  relationship: "assigned_appraiser"
};
const clientRecipient = {
  id: clientUser.id,
  name: clientUser.name,
  email: clientUser.email,
  role: clientUser.role,
  organizationId: clientUser.organizationId,
  relationship: "lender_client"
};

const bidRender = privacy.renderRoleAwareNotification({
  eventKey: "bid_request_sent",
  order,
  organization,
  actor: adminUser,
  recipient: appraiserRecipient,
  settings: platform.organizationNotificationSettings[0]
});
assert.equal(bidRender.subject, "New appraisal bid opportunity in CAS");
assert(!/client fee|margin|other bidders|payroll|storage/i.test(`${bidRender.sanitizedMessage} ${bidRender.text}`), "Appraiser bid notification must omit private financial/bid/storage data.");

const deliveryRender = privacy.renderRoleAwareNotification({
  eventKey: "final_report_delivered",
  order,
  organization,
  actor: reviewerUser,
  recipient: clientRecipient,
  settings: platform.organizationNotificationSettings[0]
});
assert.equal(deliveryRender.visibilityClassification, "client_safe");
assert(!/storage|signed url|payroll|commission|internal review/i.test(`${deliveryRender.sanitizedMessage} ${deliveryRender.text}`), "Client delivery notification must be safe.");

const disabledEmailArtifacts = service.createNotificationArtifacts({
  eventKey: "final_report_delivered",
  organization,
  order,
  actor: reviewerUser,
  recipients: [clientRecipient],
  settings: { ...platform.organizationNotificationSettings[0], emailEnabled: false },
  channels: ["In-app", "Email"],
  now: new Date("2026-07-09T18:12:00Z")
});
assert(disabledEmailArtifacts.queueItems.some((item) => item.channel === "Email" && item.status === "Configuration required"), "Missing provider should create configuration-required email queue.");
assert.equal(disabledEmailArtifacts.emailMessages.length, 0, "Missing provider must not produce sendable email messages.");

const enabledEmailArtifacts = service.createNotificationArtifacts({
  eventKey: "final_report_delivered",
  organization,
  order,
  actor: reviewerUser,
  recipients: [clientRecipient],
  settings: { ...platform.organizationNotificationSettings[0], emailEnabled: true },
  channels: ["Email"],
  now: new Date("2026-07-09T18:12:00Z")
});
assert.equal(enabledEmailArtifacts.emailMessages.length, 1, "Enabled provider settings should create a sendable email message.");
assert(!enabledEmailArtifacts.emailMessages[0].text.includes("/api/storage/signed-url"), "Delivery email must not embed a permanent signed file URL.");

const resolvedRecipients = service.resolveOrderNotificationRecipients({
  eventKey: "order_assigned",
  order: { ...order, appraiser: appraiserUser.name },
  organization,
  users: platform.portalUsers
});
assert(resolvedRecipients.some((recipient) => recipient.relationship === "assigned_appraiser"), "Assignment events should include the assigned appraiser.");
assert(resolvedRecipients.some((recipient) => recipient.relationship === "requesting_org_internal"), "Assignment events should include internal assignment staff.");

const reminderInput = {
  organization,
  orders: [{ ...order, id: "order-due-today", status: "Accepted", dueDate: "2026-07-09", appraiser: appraiserUser.name }],
  invoices: [],
  appraisers: platform.appraisers ?? [],
  vendorDocuments: [],
  users: platform.portalUsers,
  currentUser: adminUser,
  settings: platform.organizationNotificationSettings[0],
  reminderState: [],
  now: new Date("2026-07-09T12:00:00-04:00")
};
const reminderConditions = reminders.detectReminderConditions(reminderInput);
assert(reminderConditions.some((condition) => condition.eventKey === "report_due_today"), "Reminder engine should detect due-today reports.");
const dedupedConditions = reminders.detectReminderConditions({
  ...reminderInput,
  reminderState: [{ id: "state", organizationId: organization.id, reminderKey: "order:order-due-today:report_due_today:0", eventType: "report_due_today", firstTriggeredAt: "now", lastTriggeredAt: "now", triggerCount: 1 }]
});
assert(!dedupedConditions.some((condition) => condition.eventKey === "report_due_today"), "Reminder state should dedupe due-today notifications.");

const clientHistory = history.buildCommunicationHistory({
  orderId: "ord-1001",
  user: clientUser,
  communicationEvents: [
    ...platform.communicationEvents,
    {
      id: "comm-internal-test",
      organizationId: organization.id,
      orderId: "ord-1001",
      eventType: "critical_review_finding_created",
      channel: "email",
      recipient: "Reviewer",
      recipientRole: "reviewer",
      visibilityClassification: "reviewer_only",
      subject: "Internal review note",
      sanitizedMessage: "Reviewer-only finding.",
      deliveryStatus: "created",
      retryCount: 0,
      occurredAt: "2026-07-09T18:00:00Z"
    }
  ],
  notificationQueue: platform.notificationQueue,
  emailDeliveries: platform.emailDeliveryRecords,
  messages: platform.orderMessages,
  deliveries: platform.deliveryRecords,
  documentAuditEvents: platform.documentAuditEvents
});
assert(clientHistory.every((item) => item.visibleToClient), "Client communication history must hide internal/reviewer-only events.");

const migration = read("supabase/migrations/20260807182734_phase10_9_production_notifications.sql");
assert(migration.includes("create table if not exists public.communication_events"), "Migration should create communication history.");
assert(migration.includes("notification_reminder_state"), "Migration should create reminder dedupe state.");
assert(migration.includes("organization_notification_settings"), "Migration should create organization notification settings.");
assert(migration.includes("grant select, insert, update on public.communication_events to authenticated"), "Migration should explicitly grant authenticated communication access behind RLS.");

const deliveryRoute = read("app/api/storage/deliver/route.ts");
assert(deliveryRoute.includes("final_report_delivered"), "Delivery route should create delivery notification events.");
assert(deliveryRoute.includes("permanentSignedUrl: false"), "Delivery route should record that no permanent signed URL is embedded.");
assert(deliveryRoute.includes("Configuration required"), "Delivery route should mark unavailable email honestly.");

const processorRoute = read("app/api/notifications/process/route.ts");
assert(processorRoute.includes("CAS_NOTIFICATION_PROCESSOR_SECRET"), "Notification processor should require a cron secret.");
assert(processorRoute.includes("createSupabaseServiceRoleClient"), "Notification processor should remain server-side with service role.");

const notificationUi = read("src/components/cas/automation.tsx");
assert(notificationUi.includes("Notification center and delivery queue"), "Notification UI should use production wording.");
assert(notificationUi.includes("notificationCenterCategories"), "Notification UI should expose category filters.");
assert(notificationUi.includes("Mark all read"), "Notification UI should support mark-all-read.");

const orderDetail = read("src/components/cas/order-detail.tsx");
assert(orderDetail.includes("Communication History"), "Order detail should show communication history.");
assert(orderDetail.includes("Signed file URLs are generated only after the recipient is authorized"), "Order detail should explain secure delivery links.");

const docs = [
  "docs/notification-architecture.md",
  "docs/notification-event-catalog.md",
  "docs/email-delivery.md",
  "docs/notification-privacy.md",
  "docs/reminder-escalation-engine.md",
  "docs/email-template-system.md",
  "docs/email-production-setup.md",
  "docs/communication-history.md"
];
for (const doc of docs) {
  assert(fs.existsSync(path.join(root, doc)), `${doc} should exist.`);
}

console.log("Phase 10.9 notification, privacy, reminder, email, communication-history, and delivery integration regressions passed.");
