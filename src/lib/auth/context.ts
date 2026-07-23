import { getCasRepository } from "@/lib/repositories";
import type { CasAuthContext } from "@/lib/repositories";

export async function loadCasAuthContext(): Promise<CasAuthContext> {
  return getCasRepository().loadAuthContext();
}
