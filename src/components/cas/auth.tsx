"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { organizationInvitations, organizations } from "@/data/platform";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { roleLabel } from "./config";

type AuthMode = "login" | "forgot" | "reset";

function AuthShell({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-slate-950">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-line bg-slate-950 p-8 text-white lg:border-b-0 lg:border-r">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="mt-10 text-xs font-semibold uppercase tracking-normal text-blue-200">{eyebrow}</div>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{body}</p>
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            Production mode uses Supabase Auth and organization memberships. Demo mode remains available through environment settings for sales and testing.
          </div>
        </div>
        <div className="p-6 sm:p-8">{children}</div>
      </section>
    </main>
  );
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("nora@caavaluation.example");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const configured = isSupabaseConfigured();
  const title = mode === "login" ? "Sign in to CAS" : mode === "forgot" ? "Reset your password" : "Set a new password";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const client = createSupabaseBrowserClient();
    if (!client) {
      setMessage("Supabase is not configured. CAS will stay in demo mode until environment keys are added.");
      return;
    }

    if (mode === "login") {
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) setError(result.error.message);
      else window.location.assign("/");
    }

    if (mode === "forgot") {
      const result = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (result.error) setError(result.error.message);
      else setMessage("Password reset email queued. Check the configured provider or Supabase email logs.");
    }

    if (mode === "reset") {
      const result = await client.auth.updateUser({ password });
      if (result.error) setError(result.error.message);
      else setMessage("Password updated. You can return to CAS.");
    }
  }

  return (
    <AuthShell
      eyebrow={mode === "login" ? "Protected access" : "Account recovery"}
      title={title}
      body="CAS production access is tied to a verified user, an organization membership, a role, and permissions. Internal users and vendors enter by invitation."
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        {!configured && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Supabase keys are not configured. This screen is ready, but sign-in calls will stay in safe demo behavior.
          </div>
        )}
        {mode !== "reset" && (
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Email</span>
            <span className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="control w-full pl-9" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </span>
          </label>
        )}
        {mode !== "forgot" && (
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>{mode === "reset" ? "New password" : "Password"}</span>
            <span className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="control w-full pl-9" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </span>
          </label>
        )}
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        <button className="primary-button justify-center" type="submit">
          {mode === "login" ? <LogIn className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset email" : "Update password"}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          {mode === "login" ? <Link className="text-brand-700 hover:underline" href="/forgot-password">Forgot password?</Link> : <Link className="text-brand-700 hover:underline" href="/login">Back to sign in</Link>}
          <Link className="text-slate-500 hover:text-slate-900" href="/">Open demo mode</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing authentication...");

  useEffect(() => {
    async function finishCallback() {
      const client = createSupabaseBrowserClient();
      const code = new URLSearchParams(window.location.search).get("code");
      if (!client || !code) {
        setStatus("No callback code was found. Return to login and try again.");
        return;
      }

      const result = await client.auth.exchangeCodeForSession(code);
      if (result.error) {
        setStatus(result.error.message);
        return;
      }

      window.location.assign("/");
    }

    void finishCallback();
  }, []);

  return (
    <AuthShell eyebrow="Auth callback" title="Finishing sign in" body="CAS is validating the Supabase Auth callback and preparing the protected app shell.">
      <div className="rounded-md border border-line p-4 text-sm text-slate-600">{status}</div>
    </AuthShell>
  );
}

export function InviteAcceptancePage({ token }: { token: string }) {
  const invitation = organizationInvitations.find((item) => item.token === token);
  const organization = organizations.find((item) => item.id === invitation?.organizationId);
  const [accepted, setAccepted] = useState(false);

  return (
    <AuthShell
      eyebrow="Invitation onboarding"
      title={invitation ? `Join ${organization?.name ?? "CAS"}` : "Invitation unavailable"}
      body="Invite links carry organization, role, permissions, expiration, inviter, and status. Production acceptance creates the account, profile, and membership before activating access."
    >
      {invitation ? (
        <div className="grid gap-4">
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-950">{invitation.invitedName}</div>
            <div className="mt-1 text-sm text-slate-600">{invitation.email}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip border-brand-200 bg-brand-50 text-brand-700">{roleLabel(invitation.role)}</span>
              <span className="chip border-amber-200 bg-amber-50 text-amber-800">Expires {invitation.expiresAt}</span>
              <span className="chip border-slate-200 bg-white text-slate-600">{invitation.permissions.length} permissions</span>
            </div>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Create password</span>
            <input className="control" type="password" placeholder="Production signup uses Supabase Auth" />
          </label>
          <button className="primary-button justify-center" onClick={() => setAccepted(true)}>
            <UserPlus className="h-4 w-4" />
            Accept invitation
          </button>
          {accepted && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              Demo acceptance recorded. In production this marks the invite accepted and creates the organization membership.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          This invitation is missing, expired, or revoked.
        </div>
      )}
      <Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-700" href="/login">
        Continue to sign in <ArrowRight className="h-4 w-4" />
      </Link>
    </AuthShell>
  );
}

export function ProductionAccessGate({ state, detail }: { state: "loading" | "signed-out" | "error"; detail?: string }) {
  if (state === "loading") {
    return (
      <AuthShell eyebrow="Protected app shell" title="Loading your CAS workspace" body="CAS is checking your session, organization memberships, role, and permissions.">
        <div className="rounded-md border border-line p-4 text-sm text-slate-600">Loading production access...</div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Protected app shell" title={state === "error" ? "CAS could not load access" : "Sign in required"} body="Production mode only shows the app after Supabase Auth confirms the user and organization membership.">
      <div className="rounded-md border border-line p-4 text-sm text-slate-600">{detail ?? "Please sign in to continue."}</div>
      <Link className="primary-button mt-4 inline-flex" href="/login"><LogIn className="h-4 w-4" /> Sign in</Link>
    </AuthShell>
  );
}
