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
    throw new Error(`Missing ${name}. Set it in ignored .env.local or the shell environment.`);
  }
  return value;
}

loadLocalEnv();

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const publishableKey = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const roles = [
  ["Company Admin", "CAS_STAGE_COMPANY_ADMIN_EMAIL", "CAS_STAGE_COMPANY_ADMIN_PASSWORD"],
  ["Office Staff", "CAS_STAGE_OFFICE_STAFF_EMAIL", "CAS_STAGE_OFFICE_STAFF_PASSWORD"],
  ["Appraiser", "CAS_STAGE_APPRAISER_EMAIL", "CAS_STAGE_APPRAISER_PASSWORD"],
  ["Reviewer", "CAS_STAGE_REVIEWER_EMAIL", "CAS_STAGE_REVIEWER_PASSWORD"],
  ["AMC Admin", "CAS_STAGE_AMC_ADMIN_EMAIL", "CAS_STAGE_AMC_ADMIN_PASSWORD"],
  ["Lender/Client User", "CAS_STAGE_CLIENT_USER_EMAIL", "CAS_STAGE_CLIENT_USER_PASSWORD"]
];

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

let failed = false;

for (const [label, emailEnv, passwordEnv] of roles) {
  const email = requiredEnv(emailEnv, process.env[emailEnv]);
  const password = requiredEnv(`${passwordEnv} or CAS_STAGE_TEST_PASSWORD`, process.env[passwordEnv] ?? process.env.CAS_STAGE_TEST_PASSWORD);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `CAS Stage ${label}`
      }
    }
  });

  if (error && !/already|registered|exists/i.test(error.message)) {
    failed = true;
    console.log(`FAIL ${label}: ${error.message}`);
    continue;
  }

  const createdOrExisting = error ? "already exists" : data.user?.identities?.length === 0 ? "already exists" : "created";
  console.log(`PASS ${label}: auth user ${createdOrExisting}.`);
}

if (failed) {
  process.exit(1);
}
