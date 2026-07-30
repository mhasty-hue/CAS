import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { loadOperationsCenterModelFromRepository } from "@/lib/operations-center/repository";
import { SupabaseCasRepository } from "@/lib/repositories";
import { createSupabaseServerClient, shouldUseSupabaseDataSource } from "@/lib/supabase";

function bearerTokenFromHeader(value: string | null) {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

export async function GET() {
  if (!shouldUseSupabaseDataSource()) {
    return NextResponse.json({ error: "Operations Center production endpoint is available only in Supabase mode." }, { status: 404 });
  }

  const requestHeaders = await headers();
  const accessToken = bearerTokenFromHeader(requestHeaders.get("authorization"));
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in before loading the Operations Center." }, { status: 401 });
  }

  const client = createSupabaseServerClient(accessToken);
  if (!client) {
    return NextResponse.json({ error: "Supabase is not configured for this environment." }, { status: 500 });
  }

  try {
    const repository = new SupabaseCasRepository(client);
    const context = await repository.loadAuthContext();

    if (!context.user || !context.organization) {
      return NextResponse.json({ error: "Active organization and role could not be resolved." }, { status: 403 });
    }

    const model = await loadOperationsCenterModelFromRepository({
      repository,
      user: context.user,
      organization: context.organization,
      source: "supabase"
    });

    return NextResponse.json({ model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operations Center access failed." },
      { status: 403 }
    );
  }
}
