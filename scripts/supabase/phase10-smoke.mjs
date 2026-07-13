import { existsSync, readFileSync } from "node:fs";
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
    throw new Error(`Missing ${name}. Set it in .env.local or the shell environment.`);
  }
  return value;
}

async function runCheck(results, name, check) {
  try {
    const detail = await check();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

function failOnRelationMissing(error) {
  if (error?.code === "42P01") {
    throw new Error("CAS tables are missing. Apply migrations before running the smoke test.");
  }
}

loadLocalEnv();

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const publishableKey = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const results = [];

await runCheck(results, "anonymous users cannot read organizations", async () => {
  const { data, error } = await supabase.from("organizations").select("id").limit(1);
  failOnRelationMissing(error);
  if (error && error.code !== "42501") throw new Error(error.message);
  if ((data ?? []).length > 0) throw new Error("Anonymous request returned organization rows.");
  return "No tenant organization rows exposed anonymously.";
});

await runCheck(results, "public order settings endpoint is reachable", async () => {
  const { error } = await supabase.from("public_order_settings").select("public_slug").eq("enabled", true).limit(1);
  failOnRelationMissing(error);
  if (error) throw new Error(error.message);
  return "Public order settings can be queried through RLS.";
});

await runCheck(results, "private document storage is not openly listable", async () => {
  const { data, error } = await supabase.storage.from("cas-private-documents").list("", { limit: 1 });
  if (!error && (data ?? []).length > 0) throw new Error("Anonymous request listed private storage objects.");
  return "Anonymous request did not expose private document objects.";
});

if (process.env.CAS_TEST_USER_EMAIL && process.env.CAS_TEST_USER_PASSWORD) {
  await runCheck(results, "signed-in user can load tenant orders", async () => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.CAS_TEST_USER_EMAIL,
      password: process.env.CAS_TEST_USER_PASSWORD
    });
    if (signInError) throw new Error(signInError.message);

    const { data: memberships, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("status", "active").limit(1);
    if (membershipError) throw new Error(membershipError.message);
    const organizationId = memberships?.[0]?.organization_id;
    if (!organizationId) throw new Error("Signed-in user has no active CAS organization membership.");

    const { error: ordersError } = await supabase.from("orders").select("id").eq("organization_id", organizationId).limit(1);
    if (ordersError) throw new Error(ordersError.message);
    return "Signed-in user can query orders inside their active organization.";
  });
} else {
  results.push({
    name: "signed-in tenant workflow",
    ok: true,
    detail: "Skipped. Set CAS_TEST_USER_EMAIL and CAS_TEST_USER_PASSWORD to test authenticated tenant reads."
  });
}

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
}

if (results.some((result) => !result.ok)) {
  process.exit(1);
}
