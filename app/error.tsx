"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <section className="panel w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700 ring-1 ring-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-950">CAS could not load this view</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The workspace hit an unexpected rendering issue. Try again, and CAS will reload the current view.
            </p>
            <button className="primary-button mt-5" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
