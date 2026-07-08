import type { LucideIcon } from "lucide-react";
import { Activity, BriefcaseBusiness, Building2, CalendarDays, CircleDollarSign, ClipboardCheck, Clock3, FileText, FileUp, Gauge, LayoutDashboard, ListChecks, MessageSquare, Plus, Search, ShieldCheck, UserCheck, UserCog, Users2 } from "lucide-react";
import { appraisers, dashboardKpis, revenueChart, volumeChart } from "@/data/demo";
import { reviewQueue, reviewTemplates } from "@/data/platform";
import type { AccountingEntry, Order, Organization, PortalUser, VendorProfile } from "@/types/domain";
import { canViewAccounting } from "@/lib/permissions";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { roleLabel } from "./config";
import { DueChip, KpiCard, LineChart, MetricTile, PortalHero, SectionHeader, StatusChip, TableHeader } from "./shared";

export function DashboardView({
  orderList,
  user,
  organization,
  vendors,
  accountingEntries,
  onOpenOrders,
  onPlaceOrder,
  onInviteVendor
}: {
  orderList: Order[];
  user: PortalUser;
  organization: Organization;
  vendors: VendorProfile[];
  accountingEntries: AccountingEntry[];
  onOpenOrders: () => void;
  onPlaceOrder: () => void;
  onInviteVendor: () => void;
}) {
  const pastDue = orderList.filter((order) => daysUntil(order.dueDate) < 0 && order.status !== "Completed");
  const dueToday = orderList.filter((order) => daysUntil(order.dueDate) === 0);
  const revisionOrders = orderList.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser");
  const payoutTotal = accountingEntries
    .filter((entry) => !user.appraiserName || entry.appraiser === user.appraiserName)
    .reduce((total, entry) => total + entry.appraiserSplit, 0);

  if (user.role === "amc_admin" || user.role === "amc_staff") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={BriefcaseBusiness}
            title="AMC Operations"
            eyebrow={organization.name}
            body="Place orders, track due dates, manage vendor compliance, and keep completed reports visible without internal firm accounting."
            actions={[
              { label: "Place order", icon: Plus, onClick: onPlaceOrder, primary: true },
              { label: "Invite vendor", icon: UserCheck, onClick: onInviteVendor }
            ]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Open orders" value={String(orderList.filter((order) => order.status !== "Completed").length)} />
            <MetricTile label="Due today" value={String(dueToday.length)} />
            <MetricTile label="Revision requests" value={String(revisionOrders.length)} />
            <MetricTile label="Approved vendors" value={String(vendors.filter((vendor) => vendor.status === "Approved").length)} />
          </section>
          <OperationalList title="Orders by Status" icon={ListChecks} items={["New", "Assigned", "In Review", "Revisions Needed", "Completed"].map((status) => `${status}: ${orderList.filter((order) => order.status === status).length}`)} />
        </div>
        <VendorSearchCard vendors={vendors} onInviteVendor={onInviteVendor} />
      </section>
    );
  }

  if (user.role === "client_user") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={Building2}
            title="Client Order Portal"
            eyebrow={organization.name}
            body="Submit appraisal orders, upload documents, track status, send messages, and download delivered reports with limited client visibility."
            actions={[{ label: "Place order", icon: Plus, onClick: onPlaceOrder, primary: true }, { label: "Track orders", icon: ListChecks, onClick: onOpenOrders }]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(orderList.length)} />
            <MetricTile label="In progress" value={String(orderList.filter((order) => !["Delivered", "Completed"].includes(order.status)).length)} />
            <MetricTile label="Due soon" value={String(orderList.filter((order) => daysUntil(order.dueDate) <= 7).length)} />
            <MetricTile label="Ready reports" value={String(orderList.filter((order) => ["Delivered", "Completed"].includes(order.status)).length)} />
          </section>
          <ClientTimeline orderList={orderList} />
        </div>
        <OperationalList title="Client Actions" icon={MessageSquare} items={["Upload engagement documents", "Send revision request", "Message operations", "Download completed reports"]} />
      </section>
    );
  }

  if (user.role === "appraiser" || user.role === "solo_appraiser") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={UserCog}
            title={user.role === "solo_appraiser" ? "Solo Appraiser Workspace" : "Appraiser Workspace"}
            eyebrow={organization.name}
            body="See assigned orders, due dates, revisions, inspection work, document upload tasks, and personal pay without firm-wide accounting."
            actions={[{ label: "My orders", icon: ListChecks, onClick: onOpenOrders, primary: true }, { label: "Place order", icon: Plus, onClick: onPlaceOrder }]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Assigned" value={String(orderList.length)} />
            <MetricTile label="Due today" value={String(dueToday.length)} />
            <MetricTile label="Due week" value={String(orderList.filter((order) => daysUntil(order.dueDate) <= 7).length)} />
            <MetricTile label="Pay summary" value={formatCurrency(payoutTotal)} />
          </section>
          <AppraiserPortalView orderList={orderList} />
        </div>
        <OperationalList title="Profile and Docs" icon={FileUp} items={["License current", "E&O current", "W-9 on file", "Upload report/document placeholder"]} />
      </section>
    );
  }

  if (user.role === "reviewer") {
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PortalHero
            icon={ClipboardCheck}
            title="Reviewer Queue"
            eyebrow={organization.name}
            body="Review submitted reports, complete checklists, return comments, approve reports, and mark orders ready for delivery."
            actions={[{ label: "Open queue", icon: ClipboardCheck, onClick: onOpenOrders, primary: true }]}
          />
          <section className="grid gap-3 md:grid-cols-4">
            <MetricTile label="Submitted" value={String(orderList.filter((order) => order.status === "Submitted").length)} />
            <MetricTile label="In review" value={String(orderList.filter((order) => order.status === "In Review").length)} />
            <MetricTile label="Revisions" value={String(revisionOrders.length)} />
            <MetricTile label="Ready" value={String(orderList.filter((order) => order.status === "Ready for Delivery").length)} />
          </section>
          <ReviewQueueSummary orderList={orderList} />
        </div>
        <OperationalList title="Review Templates" icon={FileText} items={reviewTemplates} />
      </section>
    );
  }

  return (
    <>
      <PortalHero
        icon={LayoutDashboard}
        title="Firm Operations"
        eyebrow={`${organization.name} - ${roleLabel(user.role)}`}
        body="Manage orders, assignment, review, appraisers, clients, accounting, analytics, and administrative workflows from the firm portal."
        actions={[
          { label: "Open orders", icon: ListChecks, onClick: onOpenOrders, primary: true },
          { label: "Create order", icon: Plus, onClick: onPlaceOrder }
        ]}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(canViewAccounting(user) ? dashboardKpis : dashboardKpis.filter((kpi) => !kpi.label.toLowerCase().includes("revenue"))).map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="panel p-5">
          <SectionHeader icon={Activity} title="Order Volume" action="Open orders" onAction={onOpenOrders} />
          <LineChart data={volumeChart} suffix=" orders" />
        </div>
        <div className="panel p-5">
          <SectionHeader icon={CircleDollarSign} title="Revenue" action="Accounting" />
          <LineChart data={revenueChart} prefix="$" suffix="k" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          <SectionHeader icon={Clock3} title="Next Actions" className="p-5 pb-2" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">File</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Due</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orderList.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{order.fileNumber}</td>
                    <td className="px-5 py-4"><StatusChip status={order.status} /></td>
                    <td className="px-5 py-4"><DueChip date={order.dueDate} /></td>
                    <td className="px-5 py-4 text-slate-600">{order.appraiser}</td>
                    <td className="px-5 py-4 text-slate-700">{order.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={Gauge} title="Appraiser Workload" />
          <div className="mt-4 space-y-4">
            {appraisers.map((appraiser) => (
              <div key={appraiser.id}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-800">{appraiser.name}</span>
                  <span className="text-slate-500">{appraiser.activeOrders}/{appraiser.capacity}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, (appraiser.activeOrders / appraiser.capacity) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {pastDue.length} orders need same-day escalation.
          </div>
        </div>
      </section>
    </>
  );
}



export function AppraiserPortalView({ orderList }: { orderList: Order[] }) {
  const assignedOrders = orderList.filter((order) => !["New", "Unassigned", "Completed", "Cancelled"].includes(order.status));
  const dueToday = assignedOrders.filter((order) => daysUntil(order.dueDate) === 0);
  const revisions = assignedOrders.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser");
  const payoutPending = assignedOrders.reduce((total, order) => total + order.appraiserPayout, 0);

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="panel overflow-hidden">
        <TableHeader title="Appraiser Workbench" icon={Users2} />
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-4">
          {[
            ["Assigned", String(assignedOrders.length)],
            ["Due today", String(dueToday.length)],
            ["Revisions", String(revisions.length)],
            ["Payout pending", formatCurrency(payoutPending)]
          ].map(([label, value]) => <MetricTile key={label} label={label} value={value} />)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">Appraiser</th><th className="px-5 py-3">Coverage</th><th className="px-5 py-3">Workload</th><th className="px-5 py-3">Turn time</th><th className="px-5 py-3">Revision rate</th><th className="px-5 py-3">License</th></tr></thead>
            <tbody className="divide-y divide-line">
              {appraisers.map((appraiser) => (
                <tr key={appraiser.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-950">{appraiser.name}</td>
                  <td className="px-5 py-4 text-slate-600">{appraiser.counties.join(", ")}</td>
                  <td className="px-5 py-4 text-slate-700">{appraiser.activeOrders}/{appraiser.capacity}</td>
                  <td className="px-5 py-4 text-slate-700">{appraiser.avgTurnDays}d</td>
                  <td className="px-5 py-4 text-slate-700">{appraiser.revisionRate}%</td>
                  <td className="px-5 py-4"><span className={cn("chip", appraiser.licenseStatus === "Current" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{appraiser.licenseStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={CalendarDays} title="Inspection Calendar" />
        <div className="mt-4 space-y-3">
          {orderList.filter((order) => order.inspectionDate).map((order) => (
            <div key={order.id} className="rounded-md border border-line p-3 text-sm">
              <div className="font-semibold text-slate-900">{formatDate(order.inspectionDate ?? order.dueDate)} - {order.fileNumber}</div>
              <div className="mt-1 text-slate-500">{order.address}, {order.city}</div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}



export function OperationalList({ title, icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  const Icon = icon;
  return (
    <section className="panel p-5">
      <SectionHeader icon={Icon} title={title} />
      <div className="mt-4 grid gap-2">
        {items.map((item) => <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>)}
      </div>
    </section>
  );
}



export function VendorSearchCard({ vendors, onInviteVendor }: { vendors: VendorProfile[]; onInviteVendor: () => void }) {
  const approved = vendors.filter((vendor) => vendor.status === "Approved");
  return (
    <aside className="panel p-5">
      <SectionHeader icon={ShieldCheck} title="Vendor Search" />
      <div className="mt-4 grid gap-3">
        <input className="control" defaultValue="1840 Magnolia Trace, Marietta GA" />
        <select className="control"><option>Cobb County</option><option>Fulton County</option><option>Cherokee County</option></select>
        <select className="control"><option>1004 URAR</option><option>FHA 1004</option><option>VA 1004</option><option>Review</option></select>
        <button className="primary-button justify-center"><Search className="h-4 w-4" /> Find approved vendors</button>
        <button className="secondary-button justify-center" onClick={onInviteVendor}><UserCheck className="h-4 w-4" /> Invite vendor</button>
      </div>
      <div className="mt-4 space-y-2">
        {approved.slice(0, 3).map((vendor) => (
          <div key={vendor.id} className="rounded-md border border-line px-3 py-2 text-sm">
            <div className="font-medium text-slate-900">{vendor.company}</div>
            <div className="mt-1 text-xs text-slate-500">{vendor.distance} mi - {vendor.turnTime}d turn - {vendor.capacity} capacity</div>
          </div>
        ))}
      </div>
    </aside>
  );
}



export function ClientTimeline({ orderList }: { orderList: Order[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Clock3} title="Status Timeline" />
      <div className="mt-4 grid gap-3">
        {orderList.slice(0, 4).map((order) => (
          <div key={order.id} className="rounded-md border border-line px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{order.fileNumber}</span><StatusChip status={order.status} /></div>
            <div className="mt-1 text-slate-500">{order.borrower} - due {formatDate(order.dueDate)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}



export function ReviewQueueSummary({ orderList }: { orderList: Order[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={ClipboardCheck} title="Review Queue" />
      <div className="mt-4 grid gap-3">
        {reviewQueue.map((item) => {
          const order = orderList.find((candidate) => candidate.id === item.orderId);
          return (
            <div key={item.id} className="rounded-md border border-line px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{order?.fileNumber ?? item.orderId}</span>
                <span className="chip border-slate-200 bg-slate-50 text-slate-700">{item.status}</span>
              </div>
              <div className="mt-1 text-slate-500">{item.reviewer} - {item.checklistOpen} open checklist items</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
