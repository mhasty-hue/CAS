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

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig {
  const requestedDataSource = process.env.NEXT_PUBLIC_CAS_DATA_SOURCE === "supabase" ? "supabase" : "demo";

  return {
    dataSource: requestedDataSource,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
