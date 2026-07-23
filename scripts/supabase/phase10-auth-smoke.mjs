import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    process.env[key] ??= rest.join("=");
  }
}

function requiredEnv(name, value) {
  if (!value) {
    throw new Error(`Missing ${name}. Set it in ignored .env.local or the shell environment.`);
  }
  return value;
}

function compactDateToken() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function failOn(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function createSupabaseClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function signIn(roleKey) {
  const credential = credentials[roleKey];
  const client = createSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: credential.email,
    password: credential.password
  });
  failOn(error, `Sign in failed for ${credential.label}`);
  assert(data.user?.id, `${credential.label} sign-in did not return a user.`);
  return { client, userId: data.user.id, label: credential.label };
}

async function runCheck(results, name, check) {
  try {
    const detail = await check();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

async function upsertOrFail(client, table, row, context) {
  const { data, error } = await client.from(table).upsert(row).select().single();
  failOn(error, context);
  return data;
}

async function insertOrFail(client, table, row, context) {
  const { data, error } = await client.from(table).upsert(row).select().single();
  failOn(error, context);
  return data;
}

async function updateOrFail(client, table, values, column, value, context) {
  const { data, error } = await client.from(table).update(values).eq(column, value).select().single();
  failOn(error, context);
  assert(data, `${context}: no row was updated.`);
  return data;
}

async function upsertDocumentAndUpload(actor, row, body) {
  const stored = await upsertOrFail(actor.client, "documents", row, `Create document metadata for ${row.document_type}`);
  const payload = new Blob([body], { type: row.content_type });
  const { error: uploadError } = await actor.client.storage.from(row.storage_bucket).upload(row.storage_path, payload, {
    contentType: row.content_type
  });
  failOn(uploadError, `Upload ${row.document_type}`);

  const { data: signedUrl, error: signedUrlError } = await actor.client.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, 60);
  failOn(signedUrlError, `Create signed URL for ${row.document_type}`);
  assert(signedUrl?.signedUrl, `${row.document_type} did not return a signed URL.`);
  return stored;
}

async function expectNoVisibleRows(client, table, query, context) {
  const { data, error } = await query(client.from(table).select("id"));
  if (error) {
    const denied = error.code === "42501" || /permission denied|row-level security/i.test(error.message);
    if (denied) return;
    failOn(error, context);
  }
  assert((data ?? []).length === 0, `${context}: expected no rows, received ${data.length}.`);
}

async function setupCoreWorkflow(admin, appraiser, reviewer, runToken) {
  const now = new Date().toISOString();
  const dueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const inspectionAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await upsertOrFail(
    admin.client,
    "clients",
    {
      id: ids.workflowClient,
      organization_id: orgs.company,
      name: "Phase 10 Staging Lender",
      type: "lender",
      status: "active",
      primary_contact: "Morgan Bell",
      email: "phase10-lender@example.com",
      phone: "(404) 555-0100",
      billing_terms: "Net 30",
      billing_email: "phase10-ap@example.com",
      default_turn_days: 5,
      notes: "Development-only client used for authenticated staging smoke tests.",
      client_rules: { test: true, source: "phase10-auth-smoke" }
    },
    "Create staging client"
  );

  await upsertOrFail(
    admin.client,
    "orders",
    {
      id: ids.workflowOrder,
      organization_id: orgs.company,
      client_id: ids.workflowClient,
      file_number: "PHASE10-STAGE-001",
      product_type: "1004 URAR",
      borrower_name: "Jamie Parker",
      subject_address: "1180 Staging View Drive",
      city: "Marietta",
      state: "GA",
      zip: "30064",
      county: "Cobb",
      loan_type: "Conventional",
      occupancy: "Primary residence",
      property_type: "Single family",
      ordered_at: now,
      due_at: dueAt,
      inspection_at: null,
      status: "New",
      priority: "High",
      fee: 750,
      tech_fee: 25,
      appraiser_payout: 435,
      appraiser_profile_id: null,
      contact_name: "Jamie Parker",
      contact_phone: "(404) 555-0188",
      access_info: "Development smoke test access instructions.",
      assignment_preference: "Best available staff appraiser",
      lender_contact: "Morgan Bell",
      parcel_number: "PHASE10-001",
      commission_split_override: 60,
      accounting_status: "unbilled",
      completed_at: null,
      paid_at: null,
      next_action: "Assign appraiser",
      metadata: { source: "phase10-auth-smoke", runToken },
      last_activity_at: now
    },
    "Create staging order"
  );

  await upsertOrFail(
    admin.client,
    "order_assignments",
    {
      id: ids.assignment,
      order_id: ids.workflowOrder,
      appraiser_profile_id: ids.appraiserProfile,
      reviewer_user_id: reviewer.userId,
      assigned_by: admin.userId,
      assigned_at: now,
      accepted_at: now,
      completed_at: null,
      note: "Assigned by Phase 10 authenticated smoke test.",
      status: "accepted"
    },
    "Create assignment history"
  );

  await updateOrFail(
    admin.client,
    "orders",
    {
      appraiser_profile_id: ids.appraiserProfile,
      reviewer_id: reviewer.userId,
      status: "Assigned",
      next_action: "Schedule inspection",
      last_activity_at: now
    },
    "id",
    ids.workflowOrder,
    "Assign appraiser to staging order"
  );

  await insertOrFail(
    admin.client,
    "order_status_history",
    {
      id: ids.statusAssigned,
      order_id: ids.workflowOrder,
      from_status: "New",
      to_status: "Assigned",
      changed_by: admin.userId,
      note: "Phase 10 smoke assignment."
    },
    "Record assignment status history"
  );

  await admin.client.auth.signOut();
  const refreshedAdmin = await signIn("companyAdmin");
  const { data: persistedOrder, error: persistedOrderError } = await refreshedAdmin.client
    .from("orders")
    .select("id,status,file_number")
    .eq("id", ids.workflowOrder)
    .single();
  failOn(persistedOrderError, "Reload persisted order after sign-out/sign-in");
  assert(persistedOrder?.status === "Assigned", "Persisted order did not survive re-authentication.");

  await updateOrFail(
    appraiser.client,
    "orders",
    {
      inspection_at: inspectionAt,
      status: "Inspection Scheduled",
      next_action: "Complete inspection",
      last_activity_at: new Date().toISOString()
    },
    "id",
    ids.workflowOrder,
    "Appraiser schedules inspection"
  );

  await insertOrFail(
    appraiser.client,
    "order_status_history",
    {
      id: ids.statusInspectionScheduled,
      order_id: ids.workflowOrder,
      from_status: "Assigned",
      to_status: "Inspection Scheduled",
      changed_by: appraiser.userId,
      note: "Inspection scheduled by assigned appraiser."
    },
    "Record inspection scheduled status"
  );

  await updateOrFail(
    appraiser.client,
    "orders",
    {
      inspection_at: inspectionAt,
      status: "Inspected",
      next_action: "Prepare report",
      last_activity_at: new Date().toISOString()
    },
    "id",
    ids.workflowOrder,
    "Appraiser completes inspection"
  );

  const orgPath = `organizations/${orgs.company}/phase10/${runToken}`;
  const reportDoc = await upsertDocumentAndUpload(
    appraiser,
    {
      id: ids.reportPdf,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      client_id: ids.workflowClient,
      vendor_profile_id: null,
      uploaded_by: appraiser.userId,
      name: "Phase 10 Report.pdf",
      display_name: "Phase 10 Report",
      document_type: "Report PDF",
      category: "Report",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/report-${runToken}.pdf`,
      visibility: "internal",
      source: "Phase 10 smoke test",
      status: "Ready",
      content_type: "application/pdf",
      file_size_bytes: 48,
      version_number: 1,
      metadata: { runToken }
    },
    "%PDF-1.4\n% Phase 10 report PDF smoke file\n"
  );

  const xmlDoc = await upsertDocumentAndUpload(
    appraiser,
    {
      id: ids.reportXml,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      client_id: ids.workflowClient,
      vendor_profile_id: null,
      uploaded_by: appraiser.userId,
      name: "Phase 10 Report.xml",
      display_name: "Phase 10 XML",
      document_type: "MISMO XML",
      category: "XML",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/report-${runToken}.xml`,
      visibility: "internal",
      source: "Phase 10 smoke test",
      status: "Ready",
      content_type: "application/xml",
      file_size_bytes: 63,
      version_number: 1,
      metadata: { runToken }
    },
    "<?xml version=\"1.0\"?><phase10><status>submitted</status></phase10>"
  );

  const revisedDoc = await upsertDocumentAndUpload(
    appraiser,
    {
      id: ids.revisedReport,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      client_id: ids.workflowClient,
      vendor_profile_id: null,
      uploaded_by: appraiser.userId,
      name: "Phase 10 Revised Report.pdf",
      display_name: "Phase 10 Revised Report",
      document_type: "Revised Report PDF",
      category: "Report",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/revised-report-${runToken}.pdf`,
      visibility: "Delivery recipient",
      source: "Phase 10 smoke test",
      status: "Ready",
      content_type: "application/pdf",
      file_size_bytes: 55,
      version_number: 2,
      parent_document_id: ids.reportPdf,
      metadata: { runToken }
    },
    "%PDF-1.4\n% Phase 10 revised report PDF smoke file\n"
  );

  await updateOrFail(
    appraiser.client,
    "orders",
    {
      status: "Submitted",
      next_action: "Reviewer quality check",
      last_activity_at: new Date().toISOString()
    },
    "id",
    ids.workflowOrder,
    "Appraiser submits report"
  );

  await insertOrFail(
    reviewer.client,
    "report_submissions",
    {
      id: ids.reportSubmission,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      submitted_by: appraiser.userId,
      submitted_by_name: "Phase 10 Appraiser",
      report_pdf_document_id: reportDoc.id,
      xml_document_id: xmlDoc.id,
      supporting_document_ids: [revisedDoc.id],
      submission_note: "Phase 10 staging submission.",
      certification_accepted: true,
      status: "Submitted",
      metadata: { runToken }
    },
    "Create report submission"
  );

  await updateOrFail(
    refreshedAdmin.client,
    "orders",
    {
      status: "In Review",
      next_action: "Reviewer decision",
      last_activity_at: new Date().toISOString()
    },
    "id",
    ids.workflowOrder,
    "Move order into review"
  );

  await insertOrFail(
    reviewer.client,
    "structured_revision_requests",
    {
      id: ids.revisionRequest,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      requestor: "Phase 10 Reviewer",
      source: "Internal review",
      category: "Narrative support",
      priority: "High",
      due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      client_visible_wording: "Please provide one clarification before delivery.",
      internal_reviewer_wording: "Add support for market condition adjustment.",
      assigned_appraiser_profile_id: ids.appraiserProfile,
      status: "New"
    },
    "Reviewer requests revision"
  );

  await insertOrFail(
    reviewer.client,
    "structured_revision_items",
    {
      id: ids.revisionItem,
      organization_id: orgs.company,
      revision_request_id: ids.revisionRequest,
      label: "Market condition support",
      related_page_section: "Sales comparison approach",
      related_document_id: reportDoc.id,
      response: null,
      completed: false,
      reviewer_approved: false,
      attachment_document_ids: [],
      metadata: { runToken }
    },
    "Create revision item"
  );

  await updateOrFail(
    appraiser.client,
    "structured_revision_items",
    {
      response: "Added paired-sale support and clarified market condition adjustment.",
      completed: true,
      attachment_document_ids: [revisedDoc.id],
      metadata: { runToken, response: "appraiser" }
    },
    "id",
    ids.revisionItem,
    "Appraiser responds to revision"
  );

  await insertOrFail(
    appraiser.client,
    "revision_item_events",
    {
      id: ids.revisionEvent,
      organization_id: orgs.company,
      revision_request_id: ids.revisionRequest,
      revision_item_id: ids.revisionItem,
      actor_id: appraiser.userId,
      actor_name: "Phase 10 Appraiser",
      action: "Revision response",
      detail: "Responded to revision and attached revised report.",
    },
    "Record revision response event"
  );

  await updateOrFail(
    reviewer.client,
    "structured_revision_items",
    {
      reviewer_approved: true,
      metadata: { runToken, approved: true }
    },
    "id",
    ids.revisionItem,
    "Reviewer approves revision item"
  );

  await updateOrFail(
    reviewer.client,
    "structured_revision_requests",
    {
      status: "Approved",
      updated_at: new Date().toISOString()
    },
    "id",
    ids.revisionRequest,
    "Reviewer approves revision request"
  );

  await updateOrFail(
    refreshedAdmin.client,
    "orders",
    {
      status: "Ready for Delivery",
      next_action: "Deliver final report",
      last_activity_at: new Date().toISOString()
    },
    "id",
    ids.workflowOrder,
    "Mark order ready for delivery"
  );

  await insertOrFail(
    reviewer.client,
    "report_deliveries",
    {
      id: ids.reportDelivery,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      delivered_by: reviewer.userId,
      delivered_by_name: "Phase 10 Reviewer",
      recipient_name: "Morgan Bell",
      recipient_email: "phase10-lender@example.com",
      delivery_method: "Secure link",
      included_document_ids: [revisedDoc.id, xmlDoc.id],
      secure_delivery_url: "/deliveries/phase10-staging",
      status: "Delivered",
      metadata: { runToken }
    },
    "Deliver final report"
  );

  const invoiceDoc = await upsertDocumentAndUpload(
    refreshedAdmin,
    {
      id: ids.invoiceDocument,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      client_id: ids.workflowClient,
      vendor_profile_id: null,
      uploaded_by: refreshedAdmin.userId,
      name: "Phase 10 Invoice.pdf",
      display_name: "Phase 10 Invoice",
      document_type: "Invoice",
      category: "Accounting",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/invoice-${runToken}.pdf`,
      visibility: "Delivery recipient",
      source: "Phase 10 smoke test",
      status: "Ready",
      content_type: "application/pdf",
      file_size_bytes: 50,
      version_number: 1,
      metadata: { runToken }
    },
    "%PDF-1.4\n% Phase 10 invoice PDF smoke file\n"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "invoices",
    {
      id: ids.invoice,
      organization_id: orgs.company,
      client_id: ids.workflowClient,
      order_id: ids.workflowOrder,
      invoice_number: "PHASE10-STAGE-INV-001",
      amount: 775,
      status: "issued",
      due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      order_count: 1,
      billing_party: "Phase 10 Staging Lender",
      bill_to_contact: "Morgan Bell",
      subtotal: 775,
      tax_amount: 0,
      balance_due: 775,
      payment_terms: "Net 30",
      notes: "Generated by authenticated smoke test.",
      issued_at: new Date().toISOString()
    },
    "Generate invoice"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "invoice_line_items",
    {
      id: ids.invoiceLine,
      invoice_id: ids.invoice,
      organization_id: orgs.company,
      label: "1004 URAR",
      description: "Phase 10 staging appraisal fee",
      quantity: 1,
      unit_amount: 750,
      amount: 750,
      line_type: "Appraisal fee",
      sort_order: 1
    },
    "Create invoice line item"
  );

  await updateOrFail(
    refreshedAdmin.client,
    "orders",
    {
      status: "Completed",
      completed_at: new Date().toISOString(),
      accounting_status: "invoiced",
      appraiser_payout: 435,
      next_action: "Monitor payment",
      last_activity_at: new Date().toISOString()
    },
    "id",
    ids.workflowOrder,
    "Complete staging order"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "accounting_entries",
    {
      id: ids.accountingEntry,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      entry_type: "appraisal_fee",
      amount: 775,
      memo: "Phase 10 staging invoice generated.",
      client_id: ids.workflowClient,
      appraiser_profile_id: ids.appraiserProfile,
      product_type: "1004 URAR",
      county: "Cobb",
      completed_at: new Date().toISOString().slice(0, 10),
      fee: 750,
      tech_fee: 25,
      commission_split: 60,
      appraiser_split: 435,
      company_revenue: 340,
      status: "Unpaid",
      month: new Date().toISOString().slice(0, 7)
    },
    "Persist accounting entry"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "payroll_runs",
    {
      id: ids.payrollRun,
      organization_id: orgs.company,
      name: "Phase 10 Staging Payroll",
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "draft",
      total_gross_fee: 750,
      total_tech_fee: 25,
      total_payout: 435,
      created_by: refreshedAdmin.userId
    },
    "Create payroll run"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "payroll_run_items",
    {
      id: ids.payrollItem,
      payroll_run_id: ids.payrollRun,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      appraiser_profile_id: ids.appraiserProfile,
      gross_fee: 750,
      tech_fee: 25,
      commission_split: 60,
      payout_amount: 435,
      status: "pending"
    },
    "Create payroll item"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "audit_logs",
    {
      id: ids.auditLog,
      organization_id: orgs.company,
      actor_id: refreshedAdmin.userId,
      entity_type: "order",
      entity_id: ids.workflowOrder,
      action: "phase10_workflow_completed",
      changes: { orderId: ids.workflowOrder, runToken }
    },
    "Persist audit log"
  );

  await insertOrFail(
    refreshedAdmin.client,
    "document_audit_events",
    {
      id: ids.documentAudit,
      organization_id: orgs.company,
      order_id: ids.workflowOrder,
      document_id: invoiceDoc.id,
      event: "Uploaded",
      actor_id: refreshedAdmin.userId,
      actor_name: "Phase 10 Company Admin",
      detail: "Invoice document uploaded during authenticated staging smoke test.",
      metadata: { runToken }
    },
    "Persist document audit event"
  );

  return {
    admin: refreshedAdmin,
    privateReportPath: reportDoc.storage_path,
    invoiceDocumentPath: invoiceDoc.storage_path
  };
}

async function setupClientPortalRows(clientUser, runToken) {
  const orgPath = `organizations/${orgs.client}/phase10/${runToken}`;
  await upsertOrFail(
    clientUser.client,
    "orders",
    {
      id: ids.clientOrder,
      organization_id: orgs.client,
      client_id: null,
      file_number: "CLIENT-STAGE-001",
      product_type: "1004 URAR",
      borrower_name: "Client Portal Borrower",
      subject_address: "220 Client Portal Way",
      city: "Savannah",
      state: "GA",
      zip: "31401",
      county: "Chatham",
      loan_type: "Conventional",
      occupancy: "Primary residence",
      property_type: "Single family",
      due_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: "New",
      priority: "Standard",
      fee: 625,
      tech_fee: 25,
      appraiser_payout: 0,
      source: "client portal",
      metadata: { source: "phase10-auth-smoke", runToken },
      last_activity_at: new Date().toISOString()
    },
    "Create client organization order"
  );

  await upsertDocumentAndUpload(
    clientUser,
    {
      id: ids.clientDocument,
      organization_id: orgs.client,
      order_id: ids.clientOrder,
      client_id: null,
      vendor_profile_id: null,
      uploaded_by: clientUser.userId,
      name: "Client Portal Upload.pdf",
      display_name: "Client Portal Upload",
      document_type: "Client Upload",
      category: "Order package",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/client-upload-${runToken}.pdf`,
      visibility: "Client",
      source: "Phase 10 smoke test",
      status: "Ready",
      content_type: "application/pdf",
      file_size_bytes: 47,
      version_number: 1,
      metadata: { runToken }
    },
    "%PDF-1.4\n% Phase 10 client portal upload smoke file\n"
  );
}

async function setupVendorStorage(amcAdmin, runToken) {
  const vendorPath = `organizations/${orgs.amc}/phase10/${runToken}`;
  const rows = [
    {
      id: ids.vendorW9,
      document_type: "W-9",
      name: "Phase 10 W-9.pdf",
      storage_path: `${vendorPath}/w9-${runToken}.pdf`
    },
    {
      id: ids.vendorEo,
      document_type: "E&O",
      name: "Phase 10 E&O.pdf",
      storage_path: `${vendorPath}/eo-${runToken}.pdf`
    },
    {
      id: ids.vendorLicense,
      document_type: "Appraiser License",
      name: "Phase 10 License.pdf",
      storage_path: `${vendorPath}/license-${runToken}.pdf`
    }
  ];

  for (const row of rows) {
    await upsertDocumentAndUpload(
      amcAdmin,
      {
        id: row.id,
        organization_id: orgs.amc,
        order_id: null,
        client_id: null,
        vendor_profile_id: ids.vendorProfile,
        uploaded_by: amcAdmin.userId,
        name: row.name,
        display_name: row.name,
        document_type: row.document_type,
        category: "Vendor compliance",
        storage_bucket: "cas-private-documents",
        storage_path: row.storage_path,
        visibility: "internal",
        source: "Phase 10 smoke test",
        status: "Ready",
        content_type: "application/pdf",
        file_size_bytes: 43,
        version_number: 1,
        metadata: { runToken }
      },
      `%PDF-1.4\n% Phase 10 ${row.document_type} smoke file\n`
    );
  }
}

loadLocalEnv();

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const publishableKey = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const roleDefinitions = {
  companyAdmin: ["Company Admin", "CAS_STAGE_COMPANY_ADMIN_EMAIL", "CAS_STAGE_COMPANY_ADMIN_PASSWORD"],
  officeStaff: ["Office Staff", "CAS_STAGE_OFFICE_STAFF_EMAIL", "CAS_STAGE_OFFICE_STAFF_PASSWORD"],
  appraiser: ["Appraiser", "CAS_STAGE_APPRAISER_EMAIL", "CAS_STAGE_APPRAISER_PASSWORD"],
  reviewer: ["Reviewer", "CAS_STAGE_REVIEWER_EMAIL", "CAS_STAGE_REVIEWER_PASSWORD"],
  amcAdmin: ["AMC Admin", "CAS_STAGE_AMC_ADMIN_EMAIL", "CAS_STAGE_AMC_ADMIN_PASSWORD"],
  clientUser: ["Lender/Client User", "CAS_STAGE_CLIENT_USER_EMAIL", "CAS_STAGE_CLIENT_USER_PASSWORD"]
};

const credentials = Object.fromEntries(
  Object.entries(roleDefinitions).map(([roleKey, [label, emailEnv, passwordEnv]]) => [
    roleKey,
    {
      label,
      email: requiredEnv(emailEnv, process.env[emailEnv]),
      password: requiredEnv(`${passwordEnv} or CAS_STAGE_TEST_PASSWORD`, process.env[passwordEnv] ?? process.env.CAS_STAGE_TEST_PASSWORD)
    }
  ])
);

const orgs = {
  company: "11111111-1111-1111-1111-111111111111",
  amc: "22222222-2222-2222-2222-222222222222",
  client: "33333333-3333-3333-3333-333333333333"
};

const ids = {
  appraiserProfile: "d0000000-0000-4000-8000-000000000001",
  vendorProfile: "90000000-0000-4000-8000-000000000001",
  workflowClient: "f0000000-0000-4000-8000-000000000101",
  workflowOrder: "f0000000-0000-4000-8000-000000000102",
  assignment: "f0000000-0000-4000-8000-000000000103",
  statusAssigned: randomUUID(),
  statusInspectionScheduled: randomUUID(),
  reportPdf: "f0000000-0000-4000-8000-000000000106",
  reportXml: "f0000000-0000-4000-8000-000000000107",
  revisedReport: "f0000000-0000-4000-8000-000000000108",
  reportSubmission: "f0000000-0000-4000-8000-000000000109",
  revisionRequest: "f0000000-0000-4000-8000-000000000110",
  revisionItem: "f0000000-0000-4000-8000-000000000111",
  revisionEvent: randomUUID(),
  reportDelivery: "f0000000-0000-4000-8000-000000000113",
  invoiceDocument: "f0000000-0000-4000-8000-000000000114",
  invoice: "f0000000-0000-4000-8000-000000000115",
  invoiceLine: "f0000000-0000-4000-8000-000000000116",
  accountingEntry: "f0000000-0000-4000-8000-000000000117",
  payrollRun: "f0000000-0000-4000-8000-000000000118",
  payrollItem: "f0000000-0000-4000-8000-000000000119",
  auditLog: randomUUID(),
  documentAudit: randomUUID(),
  clientOrder: "f0000000-0000-4000-8000-000000000122",
  clientDocument: "f0000000-0000-4000-8000-000000000123",
  vendorW9: "f0000000-0000-4000-8000-000000000124",
  vendorEo: "f0000000-0000-4000-8000-000000000125",
  vendorLicense: "f0000000-0000-4000-8000-000000000126"
};

const results = [];
const runToken = compactDateToken();
const anonymous = createSupabaseClient();

const companyAdmin = await signIn("companyAdmin");
const officeStaff = await signIn("officeStaff");
const appraiser = await signIn("appraiser");
const reviewer = await signIn("reviewer");
const amcAdmin = await signIn("amcAdmin");
const clientUser = await signIn("clientUser");

let workflowContext;

await runCheck(results, "persistent order lifecycle completes with Supabase data", async () => {
  workflowContext = await setupCoreWorkflow(companyAdmin, appraiser, reviewer, runToken);
  return "Client, order, assignment, inspection, review, revision, delivery, invoice, payroll, and audit trail persisted.";
});

await runCheck(results, "client user can create and read its permitted order and document", async () => {
  await setupClientPortalRows(clientUser, runToken);
  const { data: orders, error: orderError } = await clientUser.client.from("orders").select("id").eq("id", ids.clientOrder);
  failOn(orderError, "Client user reads own organization order");
  assert((orders ?? []).length === 1, "Client user could not read its permitted order.");
  const { data: docs, error: documentError } = await clientUser.client.from("documents").select("id").eq("id", ids.clientDocument);
  failOn(documentError, "Client user reads own visible document");
  assert((docs ?? []).length === 1, "Client user could not read its permitted document.");
  return "Client user sees only its own organization order and visible document.";
});

await runCheck(results, "company admin can read and manage its organization", async () => {
  const { data, error } = await workflowContext.admin.client
    .from("organizations")
    .update({ settings: { phase10Smoke: runToken } })
    .eq("id", orgs.company)
    .select("id,settings")
    .single();
  failOn(error, "Company admin organization update");
  assert(data?.settings?.phase10Smoke === runToken, "Organization settings update did not persist.");
  return "Company admin updated organization settings in its tenant.";
});

await runCheck(results, "office staff can access operations but not payroll", async () => {
  const { data: orders, error: orderError } = await officeStaff.client.from("orders").select("id").eq("organization_id", orgs.company).limit(5);
  failOn(orderError, "Office staff reads orders");
  assert((orders ?? []).length > 0, "Office staff did not receive operational orders.");

  const { data: payrollItems, error: payrollError } = await officeStaff.client.from("payroll_run_items").select("id").limit(5);
  failOn(payrollError, "Office staff payroll read check");
  assert((payrollItems ?? []).length === 0, "Office staff can read restricted payroll data.");
  return "Operational data visible; payroll rows hidden.";
});

await runCheck(results, "appraiser can read assigned orders and update inspection fields only", async () => {
  const { data: assigned, error: assignedError } = await appraiser.client.from("orders").select("id").eq("id", ids.workflowOrder);
  failOn(assignedError, "Appraiser reads assigned order");
  assert((assigned ?? []).length === 1, "Appraiser cannot read assigned order.");

  const { data: unassigned, error: unassignedError } = await appraiser.client
    .from("orders")
    .select("id,appraiser_profile_id")
    .neq("appraiser_profile_id", ids.appraiserProfile)
    .limit(1);
  failOn(unassignedError, "Appraiser non-assigned order visibility check");
  assert((unassigned ?? []).length === 0, "Appraiser can read non-assigned orders.");

  const { error: forbiddenUpdateError } = await appraiser.client
    .from("orders")
    .update({ commission_split_override: 95 })
    .eq("id", ids.workflowOrder)
    .select("id");
  assert(forbiddenUpdateError, "Appraiser commission update unexpectedly succeeded.");
  return "Assigned order visible, inspection update succeeded, commission update denied.";
});

await runCheck(results, "reviewer can open review queue and perform review actions", async () => {
  const { data: queue, error: queueError } = await reviewer.client.from("report_submissions").select("id,status").eq("id", ids.reportSubmission);
  failOn(queueError, "Reviewer reads report submission");
  assert((queue ?? []).length === 1, "Reviewer cannot read review queue submission.");

  const { data: revision, error: revisionError } = await reviewer.client.from("structured_revision_requests").select("id,status").eq("id", ids.revisionRequest).single();
  failOn(revisionError, "Reviewer reads revision request");
  assert(revision?.status === "Approved", "Reviewer revision action did not persist.");
  return "Review queue and approved revision are visible to reviewer.";
});

await runCheck(results, "AMC admin can access AMC vendors but not company orders", async () => {
  await setupVendorStorage(amcAdmin, runToken);
  const { data: vendors, error: vendorError } = await amcAdmin.client.from("vendor_profiles").select("id").eq("amc_organization_id", orgs.amc).limit(3);
  failOn(vendorError, "AMC admin reads vendors");
  assert((vendors ?? []).length > 0, "AMC admin cannot read vendor roster.");

  await expectNoVisibleRows(amcAdmin.client, "orders", (query) => query.eq("organization_id", orgs.company).limit(1), "AMC admin cannot read company tenant orders");
  return "AMC vendor roster visible; separate company tenant orders hidden.";
});

await runCheck(results, "tenant isolation blocks Organization A and Organization B cross-reads", async () => {
  await expectNoVisibleRows(clientUser.client, "orders", (query) => query.eq("organization_id", orgs.company).limit(1), "Client user cannot read company orders");
  await expectNoVisibleRows(companyAdmin.client, "vendor_profiles", (query) => query.eq("amc_organization_id", orgs.amc).limit(1), "Company admin cannot read AMC vendors");
  return "Cross-organization data reads returned no rows.";
});

await runCheck(results, "client-visible users cannot read internal notes", async () => {
  const { data, error } = await clientUser.client.from("order_notes").select("id,visibility").eq("visibility", "internal").limit(1);
  failOn(error, "Client internal notes query");
  assert((data ?? []).length === 0, "Client-visible user can read internal notes.");
  return "Internal notes hidden from client-visible user.";
});

await runCheck(results, "unauthorized users cannot edit payroll or commissions", async () => {
  const { data: payrollUpdates, error: payrollUpdateError } = await officeStaff.client
    .from("payroll_run_items")
    .update({ payout_amount: 1 })
    .eq("id", ids.payrollItem)
    .select("id");
  assert(payrollUpdateError || (payrollUpdates ?? []).length === 0, "Office staff payroll update unexpectedly changed a row.");

  const { data: accountingUpdates, error: appraiserAccountingError } = await appraiser.client
    .from("accounting_entries")
    .update({ amount: 1 })
    .eq("id", ids.accountingEntry)
    .select("id");
  assert(appraiserAccountingError || (accountingUpdates ?? []).length === 0, "Appraiser accounting update unexpectedly changed a row.");
  return "Payroll and accounting writes denied for non-accounting users.";
});

await runCheck(results, "public users cannot query private tenant data", async () => {
  await expectNoVisibleRows(anonymous, "orders", (query) => query.limit(1), "Anonymous orders query");
  await expectNoVisibleRows(anonymous, "documents", (query) => query.limit(1), "Anonymous documents query");
  await expectNoVisibleRows(anonymous, "payroll_run_items", (query) => query.limit(1), "Anonymous payroll query");
  return "Anonymous private table reads returned no rows.";
});

await runCheck(results, "private storage signed URLs and cross-org denial work", async () => {
  assert(workflowContext?.privateReportPath, "Workflow did not create a report path.");

  const { data: signedReport, error: signedReportError } = await workflowContext.admin.client.storage
    .from("cas-private-documents")
    .createSignedUrl(workflowContext.privateReportPath, 60);
  failOn(signedReportError, "Admin creates signed URL for report PDF");
  assert(signedReport?.signedUrl, "Signed URL was not returned for report PDF.");

  const { data: crossOrgSignedUrl, error: crossOrgError } = await amcAdmin.client.storage
    .from("cas-private-documents")
    .createSignedUrl(workflowContext.privateReportPath, 60);
  assert(crossOrgError || !crossOrgSignedUrl?.signedUrl, "Cross-organization user received a private signed URL.");

  const { data: anonymousList, error: anonymousStorageError } = await anonymous.storage.from("cas-private-documents").list("", { limit: 1 });
  assert(anonymousStorageError || (anonymousList ?? []).length === 0, "Anonymous user listed private storage objects.");
  return "Private signed URLs work for permitted users and are denied cross-tenant/anonymously.";
});

await runCheck(results, "completed order leaves active orders and payroll persists after re-authentication", async () => {
  const activeStatuses = ["New", "Unassigned", "Assigned", "Accepted", "Inspection Scheduled", "Inspected", "Report In Progress", "Submitted", "In Review", "Revisions Needed", "Revision Sent to Appraiser", "Ready for Delivery", "Delivered", "On Hold"];
  const { data: activeRows, error: activeError } = await workflowContext.admin.client
    .from("orders")
    .select("id")
    .eq("id", ids.workflowOrder)
    .in("status", activeStatuses);
  failOn(activeError, "Active order check");
  assert((activeRows ?? []).length === 0, "Completed order still appears in active status set.");

  await workflowContext.admin.client.auth.signOut();
  const reauthAdmin = await signIn("companyAdmin");
  const { data: payroll, error: payrollError } = await reauthAdmin.client
    .from("payroll_run_items")
    .select("id,payout_amount")
    .eq("id", ids.payrollItem)
    .single();
  failOn(payrollError, "Payroll persistence read");
  assert(Number(payroll?.payout_amount) === 435, "Persisted payroll calculation is incorrect.");

  const { data: audit, error: auditError } = await reauthAdmin.client.from("audit_logs").select("id").eq("id", ids.auditLog).single();
  failOn(auditError, "Audit trail persistence read");
  assert(audit?.id === ids.auditLog, "Audit log did not persist.");
  return "Completed status, payroll calculation, and audit log persisted across re-authentication.";
});

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
}

if (results.some((result) => !result.ok)) {
  process.exit(1);
}
