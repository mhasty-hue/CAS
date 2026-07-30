import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  History,
  ListChecks,
  MousePointer2,
  ShieldAlert,
  Sparkles,
  Target,
  Users2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "../config";
import { SectionHeader, StatusChip } from "../shared";
import type {
  CapacityInsight,
  CommandAction,
  MissionItem,
  MissionPriority,
  OperationsCenterModel,
  RiskLevel,
  SnapshotItem
} from "./command-center-data";

export function CommandCenterView({
  model,
  actionMap
}: {
  model: OperationsCenterModel;
  actionMap: Record<CommandAction, () => void>;
}) {
  return (
    <section className="grid gap-5">
      <CommandCenterHero model={model} actionMap={actionMap} />
      <ExecutiveSnapshot snapshots={model.snapshots} />

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <MissionPanel items={model.missionItems} actionMap={actionMap} emptyDetail={model.emptyState} />
        <RiskPanel model={model} actionMap={actionMap} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <UpcomingPanel model={model} actionMap={actionMap} />
        <QuickActionPanel model={model} actionMap={actionMap} />
      </section>

      <RoleAwareOperations model={model} actionMap={actionMap} />
    </section>
  );
}

function CommandCenterHero({ model, actionMap }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void> }) {
  const alerts = model.missionItems.slice(0, 5);
  const urgentCount = alerts.filter((alert) => alert.priority === "Critical" || alert.priority === "High").length;

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr] lg:p-6">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
              <Target className="h-4 w-4" />
              <span>{model.dateLabel}</span>
              <span className="text-slate-300">/</span>
              <span>{model.organizationName}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{model.greeting}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {roleLabelFromPersona(model)} operations center: {model.roleSummary}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat icon={AlertTriangle} label="Urgent" value={String(urgentCount)} tone={urgentCount ? "bad" : "neutral"} />
            <HeroStat icon={CalendarClock} label="Visible files" value={String(model.scope.orderCount)} tone="neutral" />
            <HeroStat icon={BadgeCheck} label="Data scope" value={model.scope.financialPolicy.length ? "Authorized" : "Operational"} tone="neutral" />
          </div>
        </div>

        <div className="grid gap-2">
          {alerts.length ? (
            alerts.map((item) => (
              <button
                key={item.id}
                className="group flex items-start justify-between gap-3 rounded-md border border-line bg-slate-50 px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
                onClick={actionMap[item.action]}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={item.priority} />
                    <span className="text-xs font-medium uppercase tracking-normal text-slate-500">{item.category}</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-slate-500">{item.nextAction}</div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-brand-700" />
              </button>
            ))
          ) : (
            <EmptyState title="You're caught up" detail={model.emptyState} />
          )}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: "neutral" | "warn" | "bad" }) {
  const toneClass = {
    neutral: "border-slate-200 bg-white text-slate-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-rose-200 bg-rose-50 text-rose-700"
  }[tone];

  return (
    <div className={cn("rounded-md border px-3 py-3", toneClass)}>
      <div className="flex items-center gap-2 text-xs font-medium"><Icon className="h-4 w-4" />{label}</div>
      <div className="mt-2 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function ExecutiveSnapshot({ snapshots }: { snapshots: SnapshotItem[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {snapshots.map((snapshot) => {
        const toneClass = {
          neutral: "border-line bg-white",
          good: "border-emerald-200 bg-emerald-50",
          warn: "border-amber-200 bg-amber-50",
          bad: "border-rose-200 bg-rose-50"
        }[snapshot.tone];
        return (
          <div key={snapshot.id} className={cn("rounded-md border px-4 py-3 shadow-sm", toneClass)}>
            <div className="text-xs font-medium uppercase tracking-normal text-slate-500">{snapshot.label}</div>
            <div className="mt-2 truncate text-xl font-semibold text-slate-950">{snapshot.value}</div>
            <div className="mt-1 text-xs text-slate-500">{snapshot.detail}</div>
          </div>
        );
      })}
    </section>
  );
}

function MissionPanel({
  items,
  actionMap,
  emptyDetail
}: {
  items: MissionItem[];
  actionMap: Record<CommandAction, () => void>;
  emptyDetail: string;
}) {
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={ListChecks} title="Today's Mission" className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[170px_1fr_auto] md:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={item.priority} />
                <span className="text-xs font-medium text-slate-500">{item.count} item{item.count === 1 ? "" : "s"}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">{item.title}</div>
                <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Next: {item.nextAction}</div>
              </div>
              <button className="secondary-button h-9 justify-center px-3" onClick={actionMap[item.action]}>
                {item.actionLabel}
              </button>
            </div>
          ))
        ) : (
          <div className="p-5"><EmptyState title="No mission items" detail={emptyDetail} /></div>
        )}
      </div>
    </section>
  );
}

function RiskPanel({ model, actionMap }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void> }) {
  const risks = model.riskQueue.slice(0, 7);

  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={ShieldAlert} title="At-Risk Work" action="Open orders" onAction={actionMap.orders} className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {risks.length ? risks.map((risk) => (
          <button key={risk.id} className="block w-full p-4 text-left transition hover:bg-slate-50" onClick={actionMap.orders}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">{risk.fileNumber}</span>
                  <StatusChip status={risk.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">{risk.primaryLabel}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Next: {risk.recommendedAction}</div>
              </div>
              <RiskBadge level={risk.level} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {risk.factors.map((factor) => <span key={factor} className="chip border-slate-200 bg-slate-50 text-slate-700">{factor}</span>)}
            </div>
          </button>
        )) : <div className="p-5"><EmptyState title="No at-risk work" detail={model.emptyState} /></div>}
      </div>
    </section>
  );
}

function UpcomingPanel({ model, actionMap }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void> }) {
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={CalendarClock} title="Upcoming Work" className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {model.upcoming.length ? model.upcoming.map((item) => (
          <button key={item.id} className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center" onClick={actionMap[item.action]}>
            <div>
              <div className="font-semibold text-slate-950">{item.title}</div>
              <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
            </div>
            <span className={cn("chip", upcomingTone(item.tone))}>{item.dueLabel}</span>
          </button>
        )) : <div className="p-5"><EmptyState title="No upcoming deadlines" detail="No visible inspections, due dates, revisions, or deliveries need attention." /></div>}
      </div>
    </section>
  );
}

function QuickActionPanel({ model, actionMap }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void> }) {
  return (
    <aside className="panel p-5">
      <SectionHeader icon={MousePointer2} title="Quick Actions" />
      <div className="mt-4 grid gap-2">
        {model.quickActions.map((action) => (
          <button key={action.id} className="group rounded-md border border-line bg-white px-3 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50" onClick={actionMap[action.action]}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-950">{action.label}</span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-brand-700" />
            </div>
            <div className="mt-1 text-xs text-slate-500">{action.detail}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function RoleAwareOperations({ model, actionMap }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void> }) {
  if (model.persona === "property_owner") {
    return <ActivityPanel model={model} actionMap={actionMap} title="Your Recent Updates" />;
  }

  if (model.persona === "reviewer") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <ActivityPanel model={model} actionMap={actionMap} title="Review Activity" />
        <ReviewFocusPanel model={model} />
      </section>
    );
  }

  if (model.persona === "individual_appraiser") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <ActivityPanel model={model} actionMap={actionMap} title="My Activity" />
        <CapacityPanel insights={model.capacityInsights} title="My Capacity" />
      </section>
    );
  }

  if (model.vendorScorecards.length) {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <VendorScorecardPanel model={model} actionMap={actionMap} />
        <ActivityPanel model={model} actionMap={actionMap} title="Recent Activity" />
      </section>
    );
  }

  if (model.capacityInsights.length) {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <CapacityPanel insights={model.capacityInsights} title="Capacity Foundation" />
        <RecommendationPanel model={model} />
      </section>
    );
  }

  return <ActivityPanel model={model} actionMap={actionMap} title="Recent Activity" />;
}

function CapacityPanel({ insights, title }: { insights: CapacityInsight[]; title: string }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Gauge} title={title} />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {insights.length ? insights.map((insight) => (
          <div key={insight.appraiser.id} className="rounded-md border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-950">{insight.appraiser.name}</div>
                <div className="mt-1 text-xs text-slate-500">{insight.appraiser.counties.join(", ")}</div>
              </div>
              <CapacityBadge status={insight.status} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <MiniStat label="Active" value={String(insight.activeOrders)} />
              <MiniStat label="Due week" value={String(insight.dueThisWeek)} />
              <MiniStat label="Inspections" value={String(insight.inspectionsScheduled)} />
              <MiniStat label="Revisions" value={String(insight.revisionsPending)} />
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Workload score</span>
                <span>{insight.workloadScore}/100</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className={cn("h-2 rounded-full", insight.workloadScore >= 86 ? "bg-rose-500" : insight.workloadScore >= 68 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${insight.workloadScore}%` }} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {insight.specialties.map((specialty) => <span key={specialty} className="chip border-slate-200 bg-slate-50 text-slate-700">{specialty}</span>)}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {insight.explanation} Sample size: {insight.sampleSize}.
            </div>
          </div>
        )) : <EmptyState title="No capacity visible" detail="Capacity appears only for authorized manager or personal appraiser views." />}
      </div>
    </section>
  );
}

function RecommendationPanel({ model }: { model: OperationsCenterModel }) {
  const recommendation = model.recommendation;

  return (
    <aside className="panel p-5">
      <SectionHeader icon={Sparkles} title="Assignment Fit" />
      {recommendation.appraiser && recommendation.order ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md border border-brand-200 bg-brand-50 p-4">
            <div className="text-xs font-medium uppercase tracking-normal text-brand-700">Best explainable match</div>
            <div className="mt-2 text-xl font-semibold text-slate-950">{recommendation.appraiser.name}</div>
            <div className="mt-1 text-sm text-slate-600">{recommendation.order.fileNumber} - {recommendation.order.county} - {recommendation.order.productType}</div>
          </div>
          <div className="grid gap-2">
            {recommendation.reasons.map((reason) => (
              <div key={reason} className="flex gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-line px-3 py-2 text-sm text-slate-600">Recommendation score: <span className="font-semibold text-slate-950">{recommendation.score}</span></div>
        </div>
      ) : (
        <div className="mt-4"><EmptyState title="No assignment needed" detail={recommendation.reasons[0]} /></div>
      )}
    </aside>
  );
}

function VendorScorecardPanel({ model, actionMap }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void> }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Users2} title="Vendor Scorecard Foundation" action="Vendors" onAction={actionMap.vendors} />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {model.vendorScorecards.map((scorecard) => (
          <div key={scorecard.id} className="rounded-md border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-950">{scorecard.vendorName}</div>
                <div className="mt-1 text-xs text-slate-500">{scorecard.coverage}</div>
              </div>
              <span className="chip border-slate-200 bg-slate-50 text-slate-700">{scorecard.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniStat label="Acceptance" value={scorecard.acceptanceRate} />
              <MiniStat label="Turn time" value={scorecard.averageTurnTime} />
              <MiniStat label="On time" value={scorecard.onTimeRate} />
              <MiniStat label="Due soon" value={String(scorecard.dueSoon)} />
            </div>
            <div className="mt-3 text-xs text-slate-500">{scorecard.compliance}</div>
            <div className="mt-1 text-xs text-slate-500">{scorecard.caveat}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewFocusPanel({ model }: { model: OperationsCenterModel }) {
  const reviewItems = model.riskQueue.filter((risk) => risk.status === "Submitted" || risk.status === "In Review" || risk.status.includes("Revision")).slice(0, 5);

  return (
    <aside className="panel p-5">
      <SectionHeader icon={ClipboardCheck} title="Review Focus" />
      <div className="mt-4 grid gap-2">
        {reviewItems.length ? reviewItems.map((risk) => (
          <div key={risk.id} className="rounded-md border border-line px-3 py-2 text-sm">
            <div className="font-semibold text-slate-950">{risk.fileNumber}</div>
            <div className="mt-1 text-xs text-slate-500">{risk.recommendedAction}</div>
          </div>
        )) : <EmptyState title="No review blockers" detail="No visible submitted or revision work is at risk." />}
      </div>
    </aside>
  );
}

function ActivityPanel({ model, actionMap, title }: { model: OperationsCenterModel; actionMap: Record<CommandAction, () => void>; title: string }) {
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={History} title={title} className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {model.activity.length ? model.activity.map((item) => (
          <button key={item.id} className="block w-full p-4 text-left transition hover:bg-slate-50" onClick={actionMap[item.action]}>
            <div className="font-semibold text-slate-950">{item.title}</div>
            <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
            <div className="mt-2 text-xs text-slate-400">{item.at}</div>
          </button>
        )) : <div className="p-5"><EmptyState title="No recent activity" detail="Visible activity will appear after the next order update." /></div>}
      </div>
    </section>
  );
}

function PriorityBadge({ priority }: { priority: MissionPriority }) {
  const tone = {
    Critical: "border-rose-200 bg-rose-50 text-rose-700",
    High: "border-amber-200 bg-amber-50 text-amber-800",
    Medium: "border-sky-200 bg-sky-50 text-sky-800",
    Low: "border-slate-200 bg-slate-50 text-slate-700"
  }[priority];
  return <span className={cn("chip", tone)}>{priority}</span>;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = {
    Critical: "border-rose-200 bg-rose-50 text-rose-700",
    "High Risk": "border-orange-200 bg-orange-50 text-orange-800",
    "Medium Risk": "border-amber-200 bg-amber-50 text-amber-800",
    "Low Risk": "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[level];
  return <span className={cn("chip", tone)}>{level}</span>;
}

function CapacityBadge({ status }: { status: CapacityInsight["status"] }) {
  const tone = {
    Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Moderate: "border-sky-200 bg-sky-50 text-sky-800",
    "Near Capacity": "border-amber-200 bg-amber-50 text-amber-800",
    "At Capacity": "border-rose-200 bg-rose-50 text-rose-700",
    Unavailable: "border-slate-300 bg-slate-100 text-slate-600",
    Unknown: "border-slate-200 bg-white text-slate-600"
  }[status];
  return <span className={cn("chip", tone)}>{status}</span>;
}

function upcomingTone(tone: "neutral" | "warn" | "bad" | "good") {
  return {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-rose-200 bg-rose-50 text-rose-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }[tone];
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-white px-4 py-5 text-center">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function roleLabelFromPersona(model: OperationsCenterModel) {
  const personaLabels: Record<OperationsCenterModel["persona"], string> = {
    amc_admin: "AMC Admin",
    amc_staff: "AMC Staff",
    lender_amc: "Lender Client",
    internal_lender: "Internal Lender",
    hybrid_lender: "Hybrid Lender",
    appraisal_owner: "Company Owner",
    appraisal_staff: "Office Staff",
    individual_appraiser: "Appraiser",
    reviewer: "Reviewer",
    private_professional_client: "Professional Client",
    property_owner: "Private Customer"
  };

  return personaLabels[model.persona] ?? roleLabel("client_user");
}
