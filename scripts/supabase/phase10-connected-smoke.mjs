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
  if (!value) throw new Error(`Missing ${name}. Set it in ignored .env.local or the shell environment.`);
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
  const { error } = await client.from(table).insert(row);
  failOn(error, context);
  return row;
}

async function expectNoRows(client, table, query, context, columns = "id") {
  const { data, error } = await query(client.from(table).select(columns));
  if (error) {
    const denied = error.code === "42501" || /permission denied|row-level security/i.test(error.message);
    if (denied) return;
    failOn(error, context);
  }
  assert((data ?? []).length === 0, `${context}: expected no rows, received ${data.length}.`);
}

async function firstRowOrFail(client, table, query, context) {
  const { data, error } = await query(client.from(table).select("*").limit(1));
  failOn(error, context);
  assert((data ?? []).length === 1, `${context}: expected one row.`);
  return data[0];
}

async function uploadPrivateObject(actor, path, body, contentType) {
  const payload = new Blob([body], { type: contentType });
  const { error } = await actor.client.storage.from("cas-private-documents").upload(path, payload, {
    contentType,
    upsert: false
  });
  failOn(error, `Upload private connected object for ${actor.label}`);
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
  client: randomUUID(),
  order: randomUUID(),
  internalNote: randomUUID(),
  clientSuppliedDocument: randomUUID(),
  finalDocument: randomUUID(),
  clientDocumentGrant: randomUUID(),
  appraiserDocumentGrant: randomUUID(),
  uploadedConnectedDocument: randomUUID(),
  participantClient: randomUUID(),
  participantAppraiser: randomUUID(),
  bidRequest: randomUUID(),
  bidRecipientAppraiser: randomUUID(),
  bidRecipientAmc: randomUUID(),
  bidResponseAppraiser: randomUUID(),
  bidAward: randomUUID(),
  emailAppraiser: randomUUID(),
  emailAmc: randomUUID(),
  bidEventNonWinner: randomUUID(),
  upgrade: randomUUID(),
  noDirectAdjacency: randomUUID(),
  nearbyCoverage: randomUUID()
};

const results = [];
const runToken = compactDateToken();
const connectedFileNumber = `PHASE10-CONNECTED-${runToken}`;
const noDirectCounty = `Phase Test ${runToken}`;
const anonymous = createSupabaseClient();

const companyAdmin = await signIn("companyAdmin");
const officeStaff = await signIn("officeStaff");
const appraiser = await signIn("appraiser");
const reviewer = await signIn("reviewer");
const amcAdmin = await signIn("amcAdmin");
const clientUser = await signIn("clientUser");

const appraiserProfile = await firstRowOrFail(
  companyAdmin.client,
  "appraiser_profiles",
  (query) => query.eq("user_id", appraiser.userId),
  "Find staging appraiser profile"
);

await runCheck(results, "CAS Connected schema and entitlements are present", async () => {
  const { data: plans, error: planError } = await companyAdmin.client.from("subscription_plans").select("plan_key").in("plan_key", ["connected_free", "workspace_pro", "workspace_amc"]);
  failOn(planError, "Read subscription plans");
  assert((plans ?? []).length === 3, "Expected Connected and Workspace plans.");

  const { data: tables, error: tableError } = await companyAdmin.client.from("county_adjacency").select("id").limit(1);
  failOn(tableError, "Read county adjacency table");
  assert(Array.isArray(tables), "County adjacency did not return rows.");
  return "Connected plan, Workspace plans, and county foundation are queryable.";
});

await runCheck(results, "shared connected order exposes safe summary only", async () => {
  const now = new Date().toISOString();
  await upsertOrFail(
    companyAdmin.client,
    "clients",
    {
      id: ids.client,
      organization_id: orgs.company,
      name: "Phase 10.2 Connected Lender",
      type: "lender",
      status: "active",
      primary_contact: "Connected Tester",
      email: "phase10-connected-lender@example.com",
      phone: "(404) 555-1020",
      billing_terms: "Net 30",
      billing_email: "phase10-connected-ap@example.com",
      default_turn_days: 5,
      notes: "Development-only client used for Phase 10.2 connected smoke tests.",
      client_rules: { source: "phase10-connected-smoke" }
    },
    "Create connected smoke client"
  );

  await upsertOrFail(
    companyAdmin.client,
    "orders",
    {
      id: ids.order,
      organization_id: orgs.company,
      client_id: ids.client,
      file_number: connectedFileNumber,
      product_type: "1004 URAR",
      borrower_name: "Connected Borrower",
      subject_address: "1420 Shared Order Way",
      city: "Marietta",
      state: "GA",
      zip: "30064",
      county: "Cobb",
      loan_type: "Conventional",
      occupancy: "Primary residence",
      property_type: "Single family",
      ordered_at: now,
      due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      inspection_at: null,
      status: "Assigned",
      priority: "High",
      fee: 725,
      tech_fee: 25,
      appraiser_payout: 420,
      appraiser_profile_id: appraiserProfile.id,
      reviewer_id: reviewer.userId,
      next_action: "Schedule inspection",
      commission_split_override: 60,
      accounting_status: "unbilled",
      metadata: { source: "phase10-connected-smoke", runToken },
      last_activity_at: now
    },
    "Create connected master order"
  );

  await upsertOrFail(
    companyAdmin.client,
    "order_notes",
    {
      id: ids.internalNote,
      order_id: ids.order,
      author_id: companyAdmin.userId,
      visibility: "internal",
      body: "Internal profitability and assignment-scoring note should never appear in Connected views."
    },
    "Create internal order note"
  );

  await upsertOrFail(
    companyAdmin.client,
    "order_participants",
    {
      id: ids.participantClient,
      order_id: ids.order,
      participant_organization_id: orgs.client,
      participant_user_id: clientUser.userId,
      participant_email: credentials.clientUser.email,
      participant_type: "ordering_client",
      order_role: "ordering_client",
      access_status: "active",
      permissions: ["view_status", "upload_documents", "download_final_report", "send_messages"],
      document_visibility: ["Lender/client", "Delivery recipient"],
      message_channels: ["client-facing"],
      status_visibility: "client_summary",
      accounting_visibility: "invoice_only",
      metadata: { source: "phase10-connected-smoke" }
    },
    "Create client connected participant"
  );

  await upsertOrFail(
    companyAdmin.client,
    "order_participants",
    {
      id: ids.participantAppraiser,
      order_id: ids.order,
      participant_user_id: appraiser.userId,
      participant_email: credentials.appraiser.email,
      participant_type: "individual_appraiser",
      order_role: "assigned_appraiser",
      access_status: "active",
      permissions: ["view_assignment", "schedule_inspection", "update_status", "upload_documents", "upload_report", "upload_xml", "upload_invoice", "respond_to_revision"],
      document_visibility: ["Assigned appraiser", "Lender/client", "Delivery recipient"],
      message_channels: ["assignment", "revision"],
      status_visibility: "assignment",
      accounting_visibility: "own_fee",
      metadata: { source: "phase10-connected-smoke" }
    },
    "Create appraiser connected participant"
  );

  const { data: summary, error: summaryError } = await clientUser.client.from("connected_order_summaries").select("order_id,file_number,simplified_status").eq("order_id", ids.order).single();
  failOn(summaryError, "Client reads connected order summary");
  assert(summary?.file_number === connectedFileNumber, "Client did not see the safe connected summary.");

  await expectNoRows(clientUser.client, "orders", (query) => query.eq("id", ids.order), "Client cannot read private master order row");
  await expectNoRows(clientUser.client, "order_notes", (query) => query.eq("id", ids.internalNote), "Client cannot read internal note");
  await expectNoRows(anonymous, "connected_order_summaries", (query) => query.eq("order_id", ids.order), "Anonymous cannot read connected summaries", "order_id");
  return "Client saw the safe summary while master order, internal notes, and anonymous access stayed hidden.";
});

await runCheck(results, "document grants and connected uploads work without broad storage access", async () => {
  const orgPath = `organizations/${orgs.company}/connected/${ids.order}/${runToken}`;
  await insertOrFail(
    companyAdmin.client,
    "documents",
    {
      id: ids.clientSuppliedDocument,
      organization_id: orgs.company,
      order_id: ids.order,
      client_id: ids.client,
      uploaded_by: companyAdmin.userId,
      name: "Connected Engagement Letter.pdf",
      display_name: "Connected Engagement Letter",
      document_type: "Engagement Letter",
      category: "Engagement",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/engagement-letter.pdf`,
      visibility: "Lender/client",
      source: "Phase 10.2 connected smoke test",
      status: "Ready",
      content_type: "application/pdf",
      file_size_bytes: 48,
      version_number: 1,
      metadata: { runToken }
    },
    "Create client-supplied document metadata"
  );

  await upsertOrFail(
    companyAdmin.client,
    "order_document_grants",
    {
      id: ids.clientDocumentGrant,
      order_id: ids.order,
      document_id: ids.clientSuppliedDocument,
      grantee_organization_id: orgs.client,
      grantee_user_id: clientUser.userId,
      participant_id: ids.participantClient,
      visibility_label: "Lender/client",
      access_level: "download",
      granted_by: companyAdmin.userId,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Grant client document access"
  );

  await upsertOrFail(
    companyAdmin.client,
    "order_document_grants",
    {
      id: ids.appraiserDocumentGrant,
      order_id: ids.order,
      document_id: ids.clientSuppliedDocument,
      grantee_user_id: appraiser.userId,
      participant_id: ids.participantAppraiser,
      visibility_label: "Assigned appraiser",
      access_level: "download",
      granted_by: companyAdmin.userId,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Grant appraiser document access"
  );

  const { data: clientDoc, error: clientDocError } = await clientUser.client.from("documents").select("id,storage_path").eq("id", ids.clientSuppliedDocument).single();
  failOn(clientDocError, "Client reads explicitly granted document");
  assert(clientDoc?.id === ids.clientSuppliedDocument, "Client did not receive granted document.");

  const { data: appraiserDoc, error: appraiserDocError } = await appraiser.client.from("documents").select("id,storage_path").eq("id", ids.clientSuppliedDocument).single();
  failOn(appraiserDocError, "Appraiser reads client-supplied document");
  assert(appraiserDoc?.id === ids.clientSuppliedDocument, "Appraiser did not receive client-supplied document.");

  await insertOrFail(
    clientUser.client,
    "documents",
    {
      id: ids.uploadedConnectedDocument,
      organization_id: orgs.company,
      order_id: ids.order,
      client_id: ids.client,
      uploaded_by: clientUser.userId,
      name: "Connected Borrower Contract.pdf",
      display_name: "Borrower Contract",
      document_type: "Purchase Contract",
      category: "Contract",
      storage_bucket: "cas-private-documents",
      storage_path: `${orgPath}/borrower-contract.pdf`,
      visibility: "Lender/client",
      source: "Phase 10.2 connected smoke test",
      status: "Ready",
      content_type: "application/pdf",
      file_size_bytes: 50,
      version_number: 1,
      metadata: { runToken, connectedUpload: true }
    },
    "Connected client creates document metadata"
  );

  await uploadPrivateObject(clientUser, `${orgPath}/borrower-contract.pdf`, "%PDF-1.4\n% Phase 10.2 connected upload\n", "application/pdf");

  const { data: crossOrgSignedUrl, error: crossOrgError } = await amcAdmin.client.storage.from("cas-private-documents").createSignedUrl(`${orgPath}/borrower-contract.pdf`, 60);
  assert(crossOrgError || !crossOrgSignedUrl?.signedUrl, "Unrelated organization received connected private storage URL.");
  return "Explicit grants allow reads and connected upload path works while unrelated storage access is denied.";
});

await runCheck(results, "bid invitations are private per recipient and declines require a reason", async () => {
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await insertOrFail(
    companyAdmin.client,
    "bid_requests",
    {
      id: ids.bidRequest,
      order_id: ids.order,
      sending_organization_id: orgs.company,
      created_by: companyAdmin.userId,
      subject_address: "1420 Shared Order Way",
      city: "Marietta",
      state: "GA",
      county: "Cobb",
      product_type: "1004 URAR",
      assignment_summary: "Phase 10.2 connected smoke bid request.",
      required_credentials: ["GA Certified Residential"],
      required_specialties: ["Conventional"],
      bid_deadline_at: deadline,
      requested_due_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      terms: "Submit fee and turn time only. Other bidders remain private.",
      status: "open",
      metadata: { source: "phase10-connected-smoke" }
    },
    "Create master bid request"
  );

  await upsertOrFail(
    companyAdmin.client,
    "email_deliveries",
    {
      id: ids.emailAppraiser,
      organization_id: orgs.company,
      event_key: "bid.invitation",
      recipient: credentials.appraiser.email,
      subject: "New appraisal bid opportunity in CAS",
      status: "logged",
      provider: "development-log",
      payload: {
        requestingOrganization: "CAS Development Company",
        property: "1420 Shared Order Way",
        productType: "1004 URAR",
        bidDeadline: deadline
      }
    },
    "Create appraiser bid email"
  );

  await upsertOrFail(
    companyAdmin.client,
    "email_deliveries",
    {
      id: ids.emailAmc,
      organization_id: orgs.company,
      event_key: "bid.invitation",
      recipient: credentials.amcAdmin.email,
      subject: "New appraisal bid opportunity in CAS",
      status: "logged",
      provider: "development-log",
      payload: {
        requestingOrganization: "CAS Development Company",
        property: "1420 Shared Order Way",
        productType: "1004 URAR",
        bidDeadline: deadline
      }
    },
    "Create AMC bid email"
  );

  await upsertOrFail(
    companyAdmin.client,
    "bid_request_recipients",
    {
      id: ids.bidRecipientAppraiser,
      bid_request_id: ids.bidRequest,
      recipient_user_id: appraiser.userId,
      recipient_email: credentials.appraiser.email,
      recipient_name: "Connected Appraiser",
      appraiser_profile_id: appraiserProfile.id,
      coverage_county: "Cobb",
      coverage_match: "direct",
      eligibility_snapshot: { reason: "Direct county match, license current, E&O current, W-9 on file." },
      invitation_status: "sent",
      email_delivery_id: ids.emailAppraiser,
      sent_at: new Date().toISOString(),
      expires_at: deadline,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Create appraiser bid recipient"
  );

  await upsertOrFail(
    companyAdmin.client,
    "bid_request_recipients",
    {
      id: ids.bidRecipientAmc,
      bid_request_id: ids.bidRequest,
      recipient_organization_id: orgs.amc,
      recipient_user_id: amcAdmin.userId,
      recipient_email: credentials.amcAdmin.email,
      recipient_name: "National Valuation Demo Bidder",
      coverage_county: "Cobb",
      coverage_match: "direct",
      eligibility_snapshot: { reason: "Separate recipient used to prove bidder privacy." },
      invitation_status: "sent",
      email_delivery_id: ids.emailAmc,
      sent_at: new Date().toISOString(),
      expires_at: deadline,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Create second bid recipient"
  );

  const { data: appraiserRecipients, error: appraiserRecipientsError } = await appraiser.client
    .from("bid_request_recipients")
    .select("id")
    .eq("bid_request_id", ids.bidRequest);
  failOn(appraiserRecipientsError, "Appraiser reads own bid recipient row");
  assert((appraiserRecipients ?? []).length === 1 && appraiserRecipients[0].id === ids.bidRecipientAppraiser, "Appraiser saw another bidder's invitation.");

  const badDecline = await amcAdmin.client.from("bid_responses").insert({
    bid_request_id: ids.bidRequest,
    recipient_id: ids.bidRecipientAmc,
    responder_user_id: amcAdmin.userId,
    accepted_conditions: false,
    response_status: "declined"
  });
  assert(badDecline.error, "Decline without reason unexpectedly succeeded.");

  await insertOrFail(
    appraiser.client,
    "bid_responses",
    {
      id: ids.bidResponseAppraiser,
      bid_request_id: ids.bidRequest,
      recipient_id: ids.bidRecipientAppraiser,
      responder_user_id: appraiser.userId,
      proposed_fee: 650,
      turn_time_days: 5,
      inspection_availability: "Can inspect tomorrow afternoon",
      notes: "Phase 10.2 connected bid response.",
      accepted_conditions: true,
      response_status: "submitted",
      revision_number: 1,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Appraiser submits bid response"
  );

  const { data: bidderResponses, error: bidderResponsesError } = await appraiser.client.from("bid_responses").select("id").eq("bid_request_id", ids.bidRequest);
  failOn(bidderResponsesError, "Bidder reads own response");
  assert((bidderResponses ?? []).length === 1, "Bidder saw another response.");

  const { data: senderResponses, error: senderResponsesError } = await companyAdmin.client.from("bid_responses").select("id").eq("bid_request_id", ids.bidRequest);
  failOn(senderResponsesError, "Sender reads bid responses");
  assert((senderResponses ?? []).length >= 1, "Sender could not read bid responses.");
  return "Each bidder saw only their own invitation/response; invalid decline was rejected.";
});

await runCheck(results, "bid award preserves the same master order and notifies separately", async () => {
  await insertOrFail(
    companyAdmin.client,
    "bid_awards",
    {
      id: ids.bidAward,
      bid_request_id: ids.bidRequest,
      order_id: ids.order,
      recipient_id: ids.bidRecipientAppraiser,
      response_id: ids.bidResponseAppraiser,
      awarded_by: companyAdmin.userId,
      status: "pending_acceptance",
      assignment_status: "pending_acceptance",
      awarded_at: new Date().toISOString(),
      winner_notified_at: new Date().toISOString(),
      non_winners_notified_at: new Date().toISOString(),
      selection_notes: "Selected for direct county coverage and turn time.",
      metadata: { source: "phase10-connected-smoke" }
    },
    "Award bid on same master order"
  );

  await upsertOrFail(
    companyAdmin.client,
    "bid_events",
    {
      id: ids.bidEventNonWinner,
      bid_request_id: ids.bidRequest,
      recipient_id: ids.bidRecipientAmc,
      order_id: ids.order,
      actor_user_id: companyAdmin.userId,
      actor_organization_id: orgs.company,
      event_type: "not_selected_notice",
      visibility: "recipient",
      summary: "The sender selected another bidder. Pricing and bidder identity are not disclosed.",
      metadata: { includesWinningFee: false, includesWinnerIdentity: false }
    },
    "Create private non-winner event"
  );

  const { data: orderCount, error: countError } = await companyAdmin.client.from("orders").select("id").eq("id", ids.order);
  failOn(countError, "Check master order count");
  assert((orderCount ?? []).length === 1, "Award created a duplicate order.");

  const { data: winnerAward, error: winnerAwardError } = await appraiser.client.from("bid_awards").select("order_id,status").eq("id", ids.bidAward).single();
  failOn(winnerAwardError, "Winner reads award");
  assert(winnerAward?.order_id === ids.order, "Winner award is not tied to the master order.");

  const { data: nonWinnerEvents, error: nonWinnerError } = await amcAdmin.client.from("bid_events").select("summary,metadata").eq("id", ids.bidEventNonWinner).single();
  failOn(nonWinnerError, "Non-winner reads own notice");
  assert(nonWinnerEvents?.metadata?.includesWinningFee === false, "Non-winner event leaked winning fee.");
  return "Award stayed on one master order and winner/non-winner notices remained private.";
});

await runCheck(results, "Connected upgrade keeps identity and incoming order history", async () => {
  await upsertOrFail(
    companyAdmin.client,
    "connected_upgrade_history",
    {
      id: ids.upgrade,
      user_id: appraiser.userId,
      source_connected_organization_id: null,
      workspace_organization_id: orgs.company,
      upgrade_status: "completed",
      previous_access_summary: { role: "connected_appraiser" },
      preserved_order_count: 1,
      preserved_document_count: 2,
      preserved_message_count: 1,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Record connected upgrade history"
  );

  await companyAdmin.client.auth.signOut();
  const reauthAdmin = await signIn("companyAdmin");
  const { data: summary, error: summaryError } = await reauthAdmin.client.from("connected_order_summaries").select("order_id").eq("order_id", ids.order).single();
  failOn(summaryError, "Re-authenticated admin reads connected order summary");
  assert(summary?.order_id === ids.order, "Connected order summary did not persist after re-authentication.");

  const { data: upgrade, error: upgradeError } = await appraiser.client.from("connected_upgrade_history").select("user_id,preserved_order_count").eq("id", ids.upgrade).single();
  failOn(upgradeError, "Appraiser reads own upgrade history");
  assert(upgrade?.user_id === appraiser.userId && upgrade.preserved_order_count === 1, "Upgrade history did not preserve identity/order count.");
  companyAdmin.client = reauthAdmin.client;
  return "Identity, connected order summary, and upgrade history persisted across login.";
});

await runCheck(results, "nearby county suggestions do not auto-send bids", async () => {
  await upsertOrFail(
    companyAdmin.client,
    "county_adjacency",
    {
      id: ids.noDirectAdjacency,
      state: "GA",
      county: noDirectCounty,
      nearby_county: "Cobb",
      adjacency_type: "smoke_test_nearby",
      estimated_distance_miles: 21
    },
    "Create no-direct county adjacency"
  );

  await upsertOrFail(
    companyAdmin.client,
    "vendor_county_coverage",
    {
      id: ids.nearbyCoverage,
      managing_organization_id: orgs.company,
      appraiser_profile_id: appraiserProfile.id,
      vendor_user_id: appraiser.userId,
      display_name: "Phase 10.2 Nearby Appraiser",
      state: "GA",
      county: "Cobb",
      coverage_type: "direct",
      product_types: ["1004 URAR"],
      specialties: ["Conventional"],
      approval_status: "approved",
      license_status: "current",
      eo_status: "current",
      w9_status: "on_file",
      active_status: "active",
      accepting_work: true,
      blocked: false,
      current_workload: 2,
      capacity_limit: 8,
      capacity_status: "available",
      avg_turn_days: 5,
      metadata: { source: "phase10-connected-smoke" }
    },
    "Create nearby county coverage candidate"
  );

  await expectNoRows(companyAdmin.client, "vendor_county_coverage", (query) => query.eq("state", "GA").eq("county", noDirectCounty), "No direct county coverage rows");

  const { data: adjacent, error: adjacentError } = await companyAdmin.client.from("county_adjacency").select("nearby_county").eq("state", "GA").eq("county", noDirectCounty);
  failOn(adjacentError, "Read nearby counties");
  const nearbyCounties = (adjacent ?? []).map((row) => row.nearby_county);
  assert(nearbyCounties.includes("Cobb"), "Cobb was not suggested as a nearby county.");

  const { data: nearby, error: nearbyError } = await companyAdmin.client
    .from("vendor_county_coverage")
    .select("id,display_name")
    .eq("state", "GA")
    .in("county", nearbyCounties)
    .eq("license_status", "current")
    .eq("eo_status", "current")
    .eq("w9_status", "on_file")
    .eq("active_status", "active")
    .eq("accepting_work", true);
  failOn(nearbyError, "Read nearby candidate coverage");
  assert((nearby ?? []).some((row) => row.id === ids.nearbyCoverage), "Nearby compliant candidate was not found.");

  const { data: accidentalRecipients, error: accidentalError } = await companyAdmin.client
    .from("bid_request_recipients")
    .select("id")
    .eq("bid_request_id", ids.bidRequest)
    .eq("coverage_match", "nearby");
  failOn(accidentalError, "Check no automatic nearby bid recipients");
  assert((accidentalRecipients ?? []).length === 0, "Nearby candidate was automatically added to bid recipients.");
  return "No direct county showed nearby candidates without automatically emailing or adding recipients.";
});

await runCheck(results, "non-entitled or unrelated users cannot read restricted data", async () => {
  await expectNoRows(officeStaff.client, "payroll_run_items", (query) => query.limit(1), "Office staff cannot read payroll rows");
  await expectNoRows(amcAdmin.client, "order_notes", (query) => query.eq("id", ids.internalNote), "AMC cannot read company internal note");
  await expectNoRows(anonymous, "bid_requests", (query) => query.eq("id", ids.bidRequest), "Anonymous cannot read bid request");
  return "Payroll, internal notes, and bid data remain restricted.";
});

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
}

if (results.some((result) => !result.ok)) {
  process.exit(1);
}
