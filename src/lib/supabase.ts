import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type CasSupabaseClient = SupabaseClient<Database>;
export type CasDataSource = "demo" | "supabase";

export type SupabaseRuntimeConfig = {
  dataSource: CasDataSource;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

let browserClient: CasSupabaseClient | null | undefined;

function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig {
  const requestedDataSource = process.env.NEXT_PUBLIC_CAS_DATA_SOURCE === "supabase" ? "supabase" : "demo";

  return {
    dataSource: requestedDataSource,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: getSupabasePublishableKey()
  };
}

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseRuntimeConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function shouldUseSupabaseDataSource() {
  const { dataSource } = getSupabaseRuntimeConfig();
  return dataSource === "supabase" && isSupabaseConfigured();
}

export function createSupabaseBrowserClient(): CasSupabaseClient | null {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    browserClient = null;
    return null;
  }

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return browserClient;
}

export function createSupabaseServerClient(accessToken?: string): CasSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });
}

export function createSupabaseServiceRoleClient(): CasSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
