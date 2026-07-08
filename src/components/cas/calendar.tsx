import { CalendarDays, Clock3, Gauge, Sparkles } from "lucide-react";
import type { AppraiserProfile, CalendarPreference, Order } from "@/types/domain";
import { cn, formatDate } from "@/lib/utils";
import { workloadPercent } from "./orders";
import { DueChip, SectionHeader } from "./shared";

export function CalendarView({
  orderList,
  appraisers,
  preferences,
  onTogglePreference
}: {
  orderList: Order[];
  appraisers: AppraiserProfile[];
  preferences: CalendarPreference[];
  onTogglePreference: (preferenceId: string, key: keyof Pick<CalendarPreference, "googleConnected" | "syncInspections" | "syncDueDates">) => void;
}) {
  const inspections = orderList.filter((order) => order.inspectionDate).sort((a, b) => new Date(a.inspectionDate ?? "").getTime() - new Date(b.inspectionDate ?? "").getTime());
  const dueDates = [...orderList].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 8);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel p-5">
            <SectionHeader icon={CalendarDays} title="Inspection Calendar" />
            <div className="mt-4 space-y-3">
              {inspections.slice(0, 7).map((order) => (
                <button key={order.id} className="flex w-full items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span><span className="font-semibold text-slate-900">{formatDate(order.inspectionDate ?? order.dueDate)}</span> - {order.borrower}</span>
                  <span className="text-slate-500">{order.appraiser}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <SectionHeader icon={Clock3} title="Due Date Calendar" />
            <div className="mt-4 space-y-3">
              {dueDates.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">{order.fileNumber}</div>
                    <div className="text-xs text-slate-500">{order.client} - {order.productType}</div>
                  </div>
                  <DueChip date={order.dueDate} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={Gauge} title="Appraiser Workload Calendar" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {appraisers.map((appraiser) => (
              <div key={appraiser.id} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{appraiser.name}</span>
                  <span className="text-slate-500">{appraiser.dueThisWeek} due this week</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className={cn("h-2 rounded-full", workloadPercent(appraiser) > 85 ? "bg-rose-500" : "bg-brand-600")} style={{ width: `${Math.min(100, workloadPercent(appraiser))}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">{appraiser.activeOrders}/{appraiser.capacity} active - {appraiser.avgTurnDays}d avg turn</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={Sparkles} title="Google Calendar Foundation" />
        <button className="secondary-button mt-4 w-full justify-center"><CalendarDays className="h-4 w-4" /> Connect Google Calendar</button>
        <div className="mt-4 space-y-3">
          {preferences.map((preference) => (
            <div key={preference.id} className="rounded-md border border-line p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{preference.appraiser}</span>
                <span className={cn("chip", preference.googleConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{preference.googleConnected ? "Connected" : "Not connected"}</span>
              </div>
              <div className="mt-3 grid gap-2">
                <label className="flex items-center justify-between gap-3"><span>Google connected</span><input type="checkbox" checked={preference.googleConnected} onChange={() => onTogglePreference(preference.id, "googleConnected")} /></label>
                <label className="flex items-center justify-between gap-3"><span>Sync inspections</span><input type="checkbox" checked={preference.syncInspections} onChange={() => onTogglePreference(preference.id, "syncInspections")} /></label>
                <label className="flex items-center justify-between gap-3"><span>Sync due dates</span><input type="checkbox" checked={preference.syncDueDates} onChange={() => onTogglePreference(preference.id, "syncDueDates")} /></label>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}


