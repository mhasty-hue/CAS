import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <section className="panel w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-950">Loading CAS</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Preparing the appraisal workspace.</p>
      </section>
    </main>
  );
}
