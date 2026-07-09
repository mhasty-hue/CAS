import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Gauge,
  Landmark,
  ListChecks,
  ReceiptText,
  ShieldAlert,
  Sparkles,
  Target,
  UserCheck,
  Users2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountingEntry, AppraiserProfile, Invoice, Order, Organization, PortalUser, VendorDocument, VendorProfile } from "@/types/domain";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { roleLabel } from "../config";
import { DueChip, SectionHeader, StatusChip } from "../shared";
import {
  buildCapacityInsights,
  buildMissionItems,
  buildRiskQueue,
  buildSnapshotItems,
  commandCenterDateLabel,
  recommendAppraiser,
  roleSummary,
  type AppraiserRecommendation,
  type CapacityInsight,
  type CommandAction,
  type MissionItem,
  type MissionPriority,
  type RiskInsight,
  type RiskLevel,
  type SnapshotItem
} from "./command-center-data";

export function CommandCenterView({
  orderList,
  appraisers,
  user,
  organization,
  vendors,
  vendorDocuments,
  accountingEntries,
  invoices,
  onOpenOrders,
  onPlaceOrder,
  onInviteVendor,
  onOpenReview,
  onOpenAccounting,
  onOpenClients,
  onOpenVendors,
  onOpenMessages,
  onOpenDocuments,
  onOpenCalendar
}: {
  orderList: Order[];
  appraisers: AppraiserProfile[];
  user: PortalUser;
  organization: Organization;
  vendors: VendorProfile[];
  vendorDocuments: VendorDocument[];
  accountingEntries: AccountingEntry[];
  invoices: Invoice[];
  onOpenOrders: () => void;
  onPlaceOrder: () => void;
  onInviteVendor: () => void;
  onOpenReview: () => void;
  onOpenAccounting: () => void;
  onOpenClients: () => void;
  onOpenVendors: () => void;
  onOpenMessages: () => void;
  onOpenDocuments: () => void;
  onOpenCalendar: () => void;
}) {
  const capacityInsights = buildCapacityInsights(orderList, appraisers);
  const missionItems = buildMissionItems({ orderList, accountingEntries, invoices, vendors, vendorDocuments, user });
  const riskQueue = buildRiskQueue(orderList, capacityInsights);
  const snapshots = buildSnapshotItems(orderList, accountingEntries, invoices, user);
  const recommendation = recommendAppraiser(orderList, capacityInsights);
  const criticalCount = missionItems.filter((item) => item.priority === "Critical" || item.priority === "High").length;
  const actionMap: Record<CommandAction, () => void> = {
    orders: onOpenOrders,
    "new-order": onPlaceOrder,
    review: onOpenReview,
    accounting: onOpenAccounting,
    clients: onOpenClients,
    vendors: onOpenVendors,
    messages: onOpenMessages,
    documents: onOpenDocuments,
    pay: onOpenAccounting,
    calendar: onOpenCalendar
  };

  return (
    <section className="grid gap-5">
      <CommandCenterHero
        organization={organization}
        user={user}
        missionItems={missionItems}
        summary={roleSummary(user, criticalCount, capacityInsights)}
        actionMap={actionMap}
      />

      <ExecutiveSnapshot snapshots={snapshots} />

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <MissionPanel items={missionItems} actionMap={actionMap} />
        <RiskPanel risks={riskQueue} onOpenOrders={onOpenOrders} />
      </section>

      <RoleAwareOperations
        user={user}
        orderList={orderList}
        capacityInsights={capacityInsights}
        recommendation={recommendation}
        vendors={vendors}
        vendorDocuments={vendorDocuments}
        accountingEntries={accountingEntries}
        onOpenOrders={onOpenOrders}
        onInviteVendor={onInviteVendor}
        onOpenVendors={onOpenVendors}
        onOpenCalendar={onOpenCalendar}
      />
    </section>
  );
}

function CommandCenterHero({
  organization,
  user,
  missionItems,
  summary,
  actionMap
}: {
  organization: Organization;
  user: PortalUser;
  missionItems: MissionItem[];
  summary: string;
  actionMap: Record<CommandAction, () => void>;
}) {
  const alerts = missionItems.slice(0, 5);

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr] lg:p-6">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
              <Target className="h-4 w-4" />
              <span>{commandCenterDateLabel()}</span>
              <span className="text-slate-300">/</span>
              <span>{organization.name}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">Good morning, Matt</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{roleLabel(user.role)} command center: {summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat icon={AlertTriangle} label="Urgent" value={String(alerts.filter((alert) => alert.priority === "Critical" || alert.priority === "High").length)} tone="bad" />
            <HeroStat icon={CalendarClock} label="Due watch" value={String(alerts.filter((alert) => alert.category.includes("Due") || alert.category.includes("Past")).length)} tone="warn" />
            <HeroStat icon={BadgeCheck} label="Role" value={roleLabel(user.role)} tone="neutral" />
          </div>
        </div>

        <div className="grid gap-2">
          {alerts.length ? (
            alerts.map((item) => (
              <button
                key={item.id}
                className="group flex items-start justify-between gap-3 rounded-md border border-line bg-slate-50 px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
                onClick={actionMap[item.action]}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={item.priority} />
                    <span className="text-xs font-medium uppercase tracking-normal text-slate-500">{item.category}</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-950">{item.target}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-slate-500">{item.nextAction}</div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-brand-700" />
              </button>
            ))
          ) : (
            <EmptyState title="No urgent alerts" detail="The command center is clear for this role." />
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
          <div key={snapshot.label} className={cn("rounded-md border px-4 py-3 shadow-sm", toneClass)}>
            <div className="text-xs font-medium uppercase tracking-normal text-slate-500">{snapshot.label}</div>
            <div className="mt-2 truncate text-xl font-semibold text-slate-950">{snapshot.value}</div>
            <div className="mt-1 text-xs text-slate-500">{snapshot.detail}</div>
          </div>
        );
      })}
    </section>
  );
}

function MissionPanel({ items, actionMap }: { items: MissionItem[]; actionMap: Record<CommandAction, () => void> }) {
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={ListChecks} title="Today's Mission" className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={item.priority} />
                <span className="text-xs font-medium text-slate-500">{item.category}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">{item.target}</div>
                <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Next: {item.nextAction}</div>
              </div>
              <button className="secondary-button h-9 justify-center px-3" onClick={actionMap[item.action]}>
                {item.actionLabel}
              </button>
            </div>
          ))
        ) : (
          <div className="p-5"><EmptyState title="No mission items" detail="There are no urgent operational actions for this role." /></div>
        )}
      </div>
    </section>
  );
}

function RiskPanel({ risks, onOpenOrders }: { risks: RiskInsight[]; onOpenOrders: () => void }) {
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={ShieldAlert} title="Order Risk Detection" action="Open orders" onAction={onOpenOrders} className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {risks.slice(0, 7).map((risk) => (
          <div key={risk.order.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">{risk.order.fileNumber}</span>
                  <StatusChip status={risk.order.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">{risk.order.borrower} · {risk.order.county} · {risk.order.appraiser}</div>
              </div>
              <RiskBadge level={risk.level} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {risk.factors.map((factor) => <span key={factor} className="chip border-slate-200 bg-slate-50 text-slate-700">{factor}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoleAwareOperations({
  user,
  orderList,
  capacityInsights,
  recommendation,
  vendors,
  vendorDocuments,
  accountingEntries,
  onOpenOrders,
  onInviteVendor,
  onOpenVendors,
  onOpenCalendar
}: {
  user: PortalUser;
  orderList: Order[];
  capacityInsights: CapacityInsight[];
  recommendation: AppraiserRecommendation;
  vendors: VendorProfile[];
  vendorDocuments: VendorDocument[];
  accountingEntries: AccountingEntry[];
  onOpenOrders: () => void;
  onInviteVendor: () => void;
  onOpenVendors: () => void;
  onOpenCalendar: () => void;
}) {
  if (user.role === "client_user") return <ClientCommandPanel orderList={orderList} onOpenOrders={onOpenOrders} />;
  if (user.role === "reviewer") return <ReviewerCommandPanel orderList={orderList} onOpenOrders={onOpenOrders} />;
  if (user.role === "appraiser" || user.role === "solo_appraiser") return <AppraiserCommandPanel orderList={orderList} accountingEntries={accountingEntries} onOpenCalendar={onOpenCalendar} />;
  if (user.role === "amc_admin" || user.role === "amc_staff") return <VendorCommandPanel vendors={vendors} vendorDocuments={vendorDocuments} onInviteVendor={onInviteVendor} onOpenVendors={onOpenVendors} />;

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <CapacityPanel insights={capacityInsights} />
      <RecommendationPanel recommendation={recommendation} />
    </section>
  );
}

function CapacityPanel({ insights }: { insights: CapacityInsight[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Gauge} title="Capacity Intelligence" />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {insights.map((insight) => (
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
              {insight.capacityRemaining} capacity slots remaining · {insight.appraiser.avgTurnDays}d average turn · {insight.appraiser.revisionRate}% revision placeholder
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationPanel({ recommendation }: { recommendation: AppraiserRecommendation }) {
  return (
    <aside className="panel p-5">
      <SectionHeader icon={Sparkles} title="Recommended Assignment" />
      {recommendation.appraiser && recommendation.order ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md border border-brand-200 bg-brand-50 p-4">
            <div className="text-xs font-medium uppercase tracking-normal text-brand-700">Best match</div>
            <div className="mt-2 text-xl font-semibold text-slate-950">{recommendation.appraiser.name}</div>
            <div className="mt-1 text-sm text-slate-600">{recommendation.order.fileNumber} · {recommendation.order.county} · {recommendation.order.productType}</div>
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

function ClientCommandPanel({ orderList, onOpenOrders }: { orderList: Order[]; onOpenOrders: () => void }) {
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={Landmark} title="Client Order Status" action="Track orders" onAction={onOpenOrders} className="border-b border-line p-5" />
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {orderList.slice(0, 4).map((order) => (
          <div key={order.id} className="rounded-md border border-line p-4">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-950">{order.fileNumber}</span><StatusChip status={order.status} /></div>
            <div className="mt-2 text-sm text-slate-600">{order.borrower}</div>
            <div className="mt-3"><DueChip date={order.dueDate} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewerCommandPanel({ orderList, onOpenOrders }: { orderList: Order[]; onOpenOrders: () => void }) {
  const reviewOrders = orderList.filter((order) => order.status === "Submitted" || order.status === "In Review" || order.status.includes("Revision"));
  return (
    <section className="panel overflow-hidden">
      <SectionHeader icon={ClipboardCheck} title="Review Command Queue" action="Open queue" onAction={onOpenOrders} className="border-b border-line p-5" />
      <div className="divide-y divide-line">
        {reviewOrders.slice(0, 6).map((order) => (
          <div key={order.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-950">{order.fileNumber}</span><StatusChip status={order.status} /></div>
              <div className="mt-1 text-sm text-slate-500">{order.reviewItems.filter((item) => !item.complete).length} checklist items open · {order.productType}</div>
            </div>
            <RiskBadge level={order.status.includes("Revision") ? "High Risk" : "Medium Risk"} />
          </div>
        ))}
      </div>
    </section>
  );
}

function AppraiserCommandPanel({ orderList, accountingEntries, onOpenCalendar }: { orderList: Order[]; accountingEntries: AccountingEntry[]; onOpenCalendar: () => void }) {
  const inspections = orderList.filter((order) => order.inspectionDate);
  const payout = accountingEntries.reduce((total, entry) => total + entry.appraiserSplit, 0);
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="panel overflow-hidden">
        <SectionHeader icon={CalendarClock} title="My Inspection and Due Lane" action="Calendar" onAction={onOpenCalendar} className="border-b border-line p-5" />
        <div className="divide-y divide-line">
          {orderList.slice(0, 6).map((order) => (
            <div key={order.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-950">{order.fileNumber}</span><StatusChip status={order.status} /></div>
                <div className="mt-1 text-sm text-slate-500">{order.address}, {order.city} · {order.nextAction}</div>
              </div>
              <DueChip date={order.dueDate} />
            </div>
          ))}
        </div>
      </section>
      <aside className="panel p-5">
        <SectionHeader icon={ReceiptText} title="Pay and Calendar" />
        <div className="mt-4 grid gap-3">
          <MiniStat label="Projected pay" value={formatCurrency(payout)} />
          <MiniStat label="Inspections scheduled" value={String(inspections.length)} />
          <MiniStat label="Revisions pending" value={String(orderList.filter((order) => order.status.includes("Revision")).length)} />
        </div>
      </aside>
    </section>
  );
}

function VendorCommandPanel({ vendors, vendorDocuments, onInviteVendor, onOpenVendors }: { vendors: VendorProfile[]; vendorDocuments: VendorDocument[]; onInviteVendor: () => void; onOpenVendors: () => void }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="panel p-5">
        <SectionHeader icon={Users2} title="Vendor Capacity and Compliance" action="Vendors" onAction={onOpenVendors} />
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="rounded-md border border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-semibold text-slate-950">{vendor.company}</div><div className="mt-1 text-xs text-slate-500">{vendor.coverage.join(", ")}</div></div>
                <span className={cn("chip", vendor.status === "Approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{vendor.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Turn" value={`${vendor.turnTime}d`} />
                <MiniStat label="Capacity" value={String(vendor.capacity)} />
                <MiniStat label="Workload" value={String(vendor.workload ?? 0)} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="panel p-5">
        <SectionHeader icon={FileWarning} title="Document Watch" />
        <div className="mt-4 grid gap-2">
          {vendorDocuments.filter((document) => document.status !== "Approved").map((document) => (
            <div key={document.id} className="rounded-md border border-line px-3 py-2 text-sm">
              <div className="font-medium text-slate-900">{document.type} · {document.status}</div>
              <div className="mt-1 text-xs text-slate-500">{document.expiresAt ? `Expires ${formatDate(document.expiresAt)}` : "No expiration date"}</div>
            </div>
          ))}
        </div>
        <button className="primary-button mt-4 w-full justify-center" onClick={onInviteVendor}><UserCheck className="h-4 w-4" /> Invite vendor</button>
      </aside>
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
    Balanced: "border-sky-200 bg-sky-50 text-sky-800",
    Busy: "border-amber-200 bg-amber-50 text-amber-800",
    Overloaded: "border-rose-200 bg-rose-50 text-rose-700"
  }[status];
  return <span className={cn("chip", tone)}>{status}</span>;
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
