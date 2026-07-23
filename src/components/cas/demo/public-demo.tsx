import { ArrowRight, RotateCcw, ShieldCheck, Sparkles, UserRoundCog } from "lucide-react";
import { publicDemoRoleCards, publicDemoShortcuts, type PublicDemoRoleCard } from "@/lib/demo/public-demo";
import type { Organization, PortalUser } from "@/types/domain";

type DemoStartOptions = {
  view?: PublicDemoRoleCard["recommendedView"];
  orderId?: string;
};

export function PublicDemoLandingPage({
  onStart
}: {
  onStart: (userId: string, options?: DemoStartOptions) => void;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe,_transparent_32%),linear-gradient(180deg,_#f8fafc,_#eef2ff)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">CAS Demo</div>
              <div className="text-xs text-slate-600">Sample data only</div>
            </div>
          </div>
          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            Actions are simulated and may reset
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.86fr_1.14fr] lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              Public no-login product tour
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              Modern Appraisal Management
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Choose a role and explore how CAS helps lenders, AMCs, appraisal companies, appraisers, reviewers, and private clients keep appraisal work moving.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Order status is easy to track", "Fees stay role-aware", "Assignments and bids are realistic"].map((item) => (
                <div key={item} className="rounded-md border border-white/80 bg-white/75 p-3 text-sm font-medium text-slate-700 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur">
            <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Choose a Role to Explore</h2>
                <p className="mt-1 text-sm text-slate-600">Each role opens with the right dashboard, navigation, order access, and fee visibility.</p>
              </div>
            </div>
            <div className="mt-4 grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {publicDemoRoleCards.map((role) => (
                <button
                  key={role.id}
                  className="group rounded-md border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400"
                  onClick={() => onStart(role.userId, { view: role.recommendedView, orderId: role.recommendedOrderId })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{role.title}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">{role.organizationName}</div>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{role.description}</p>
                </button>
              ))}
            </div>
          </section>
        </section>

        <section className="pb-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserRoundCog className="h-4 w-4 text-brand-600" />
            Helpful Review Shortcuts
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {publicDemoShortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                className="rounded-md border border-white/80 bg-white/75 p-3 text-left shadow-sm transition hover:border-brand-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                onClick={() => onStart(shortcut.userId, { view: shortcut.view, orderId: shortcut.orderId })}
              >
                <div className="text-sm font-semibold text-slate-950">{shortcut.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">{shortcut.description}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PublicDemoBanner({
  user,
  organization,
  notice,
  onSelectRole,
  onSwitchHome,
  onReset
}: {
  user: PortalUser;
  organization: Organization;
  notice?: string;
  onSelectRole: (userId: string) => void;
  onSwitchHome: () => void;
  onReset: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50/95 px-4 py-2 text-amber-950 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span>CAS Public Demo</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-amber-900">Sample data only</span>
          </div>
          <div className="mt-0.5 text-xs text-amber-900">
            {notice ?? "Actions are simulated and may reset."} Active role: {user.title} at {organization.name}.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="control h-9 w-full min-w-[220px] bg-white md:w-72" value={user.id} onChange={(event) => onSelectRole(event.target.value)} aria-label="Switch demo role">
            {publicDemoRoleCards.map((role) => (
              <option key={role.id} value={role.userId}>{role.title}</option>
            ))}
          </select>
          <button className="secondary-button h-9 bg-white px-3 text-xs" onClick={onSwitchHome}>Switch Demo Role</button>
          <button className="secondary-button h-9 bg-white px-3 text-xs" onClick={onReset}><RotateCcw className="h-4 w-4" /> Reset Demo</button>
        </div>
      </div>
    </div>
  );
}

export type { DemoStartOptions };
