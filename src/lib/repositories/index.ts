import { shouldUseSupabaseDataSource, type CasDataSource } from "@/lib/supabase";
import { demoCasRepository } from "./demo-repository";
import { SupabaseCasRepository } from "./supabase-repository";
import type { CasRepository } from "./types";

let supabaseRepository: SupabaseCasRepository | null = null;

export function getCasRepository(preferredSource?: CasDataSource): CasRepository {
  const shouldUseSupabase = preferredSource ? preferredSource === "supabase" : shouldUseSupabaseDataSource();

  if (!shouldUseSupabase) {
    return demoCasRepository;
  }

  supabaseRepository ??= new SupabaseCasRepository();
  return supabaseRepository;
}

export type { CasAuthContext, CasBootstrapData, CasDataSourceMode, CasRepository } from "./types";
export { demoCasRepository, SupabaseCasRepository };
