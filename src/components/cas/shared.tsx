import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Download, Filter, Search, UploadCloud } from "lucide-react";
import type { ChartPoint, Kpi, Order, OrderFormTemplate, OrderStatus } from "@/types/domain";
import { cn, daysUntil, dueTone, formatDate, priorityTone, statusTone } from "@/lib/utils";

export function PortalHero({ icon: Icon, title, eyebrow, body, actions }: { icon: LucideIcon; title: string; eyebrow: string; body: string; actions: Array<{ label: string; icon: LucideIcon; onClick: () => void; primary?: boolean }> }) {
  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700"><Icon className="h-4 w-4" />{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <button key={action.label} className={action.primary ? "primary-button" : "secondary-button"} onClick={action.onClick}>
                <ActionIcon className="h-4 w-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}



export function DetailSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}



export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-line px-3 py-2">
      <span className="shrink-0 font-medium text-slate-600">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}



export function ListOrEmpty({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) {
    return <div className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-slate-500">{empty}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>
      ))}
    </div>
  );
}



export function DocumentStatusChip({ status }: { status: Order["documentsList"][number]["status"] }) {
  const tone = {
    Ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Missing: "border-rose-200 bg-rose-50 text-rose-700",
    "Needs review": "border-amber-200 bg-amber-50 text-amber-800",
    Expired: "border-red-200 bg-red-50 text-red-700"
  }[status];

  return <span className={cn("chip shrink-0", tone)}>{status}</span>;
}



export function KpiCard({ kpi }: { kpi: Kpi }) {
  const tone = {
    neutral: "border-slate-200 bg-white text-slate-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-rose-200 bg-rose-50 text-rose-700"
  }[kpi.tone];
  return (
    <div className="panel p-4">
      <div className="text-sm text-slate-500">{kpi.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{kpi.value}</div>
      <div className={cn("mt-3 inline-flex rounded-full border px-2 py-1 text-xs font-medium", tone)}>{kpi.change}</div>
    </div>
  );
}



export function LineChart({ data, prefix = "", suffix = "" }: { data: ChartPoint[]; prefix?: string; suffix?: string }) {
  const max = Math.max(...data.flatMap((point) => [point.current, point.previous ?? 0]));
  const currentPoints = data.map((point, index) => `${(index / (data.length - 1)) * 100},${100 - (point.current / max) * 86}`).join(" ");
  const previousPoints = data.map((point, index) => `${(index / (data.length - 1)) * 100},${100 - ((point.previous ?? 0) / max) * 86}`).join(" ");
  return (
    <div className="mt-5">
      <svg viewBox="0 0 100 110" className="h-56 w-full overflow-visible" preserveAspectRatio="none">
        {[20, 40, 60, 80, 100].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e5eaf1" strokeWidth="0.4" />)}
        <polyline points={previousPoints} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <polyline points={currentPoints} fill="none" stroke="#2276d2" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 grid grid-cols-6 text-xs text-slate-500">
        {data.map((point) => <div key={point.label}>{point.label}</div>)}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {data.slice(-3).map((point) => <MetricTile key={point.label} label={point.label} value={`${prefix}${point.current}${suffix}`} />)}
      </div>
    </div>
  );
}



export function SimpleFoundationView({ icon: Icon, title, items, compact = false }: { icon: LucideIcon; title: string; items: string[]; compact?: boolean }) {
  return (
    <section className={cn("panel p-5", compact && "xl:col-span-2")}>
      <SectionHeader icon={Icon} title={title} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <div key={item} className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-700">{item}</div>)}
      </div>
    </section>
  );
}



export function SectionHeader({ icon: Icon, title, action, onAction, className }: { icon: LucideIcon; title: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" /><h2 className="text-base font-semibold text-slate-950">{title}</h2></div>
      {action && <button onClick={onAction} className="secondary-button h-9 px-3">{action}</button>}
    </div>
  );
}



export function TableHeader({ icon, title }: { icon: LucideIcon; title: string }) {
  const Icon = icon;
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
      <SectionHeader icon={Icon} title={title} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="control w-56 pl-9" placeholder="Search" /></div>
        <button className="secondary-button"><Filter className="h-4 w-4" /> Filter</button>
        <button className="secondary-button"><Download className="h-4 w-4" /> Export</button>
      </div>
    </div>
  );
}



export function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <label className={cn("grid gap-1.5 text-sm font-medium text-slate-700", span && "md:col-span-2")}><span>{label}</span>{children}</label>;
}



export function TemplateFieldPreview({ field }: { field: OrderFormTemplate["sections"][number]["fields"][number] }) {
  if (field.type === "textarea") {
    return <textarea className="control min-h-20 w-full py-3" placeholder={field.label} />;
  }

  if (field.type === "select") {
    return (
      <select className="control w-full">
        {(field.options ?? ["Option 1", "Option 2"]).map((option) => <option key={option}>{option}</option>)}
      </select>
    );
  }

  if (field.type === "date") {
    return <input className="control w-full" type="date" defaultValue="2026-07-08" />;
  }

  if (field.type === "currency") {
    return <input className="control w-full" inputMode="numeric" placeholder="$0" />;
  }

  if (field.type === "upload") {
    return (
      <button type="button" className="secondary-button justify-center">
        <UploadCloud className="h-4 w-4" />
        Add files
      </button>
    );
  }

  return <input className="control w-full" placeholder={field.label} />;
}



export function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line px-3 py-2"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</div></div>;
}



export function MetricTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line bg-white px-3 py-2"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold text-slate-900">{value}</div></div>;
}



export function StatusChip({ status }: { status: OrderStatus }) {
  return <span className={cn("chip", statusTone(status))}>{status}</span>;
}



export function PriorityChip({ priority }: { priority: Order["priority"] }) {
  return <span className={cn("chip border-transparent", priorityTone(priority))}>{priority}</span>;
}



export function DueChip({ date }: { date: string }) {
  const days = daysUntil(date);
  const label = days < 0 ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`;
  return <span className={cn("chip", dueTone(date))}>{formatDate(date)} - {label}</span>;
}

