import type { LucideIcon } from "lucide-react";
import { CalendarDays, ClipboardCheck, Clock3, Search, ShieldCheck, UserCheck, Users2 } from "lucide-react";
import { appraisers as demoAppraisers } from "@/data/demo";
import { reviewQueue } from "@/data/platform";
import type { AccountingEntry, AppraiserProfile, Invoice, Order, Organization, PortalUser, VendorDocument, VendorProfile } from "@/types/domain";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { CommandCenterView } from "./dashboard/command-center";
import { MetricTile, SectionHeader, StatusChip, TableHeader } from "./shared";

export function DashboardView({
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
  return (
    <CommandCenterView
      orderList={orderList}
      appraisers={appraisers}
      user={user}
      organization={organization}
      vendors={vendors}
      vendorDocuments={vendorDocuments}
      accountingEntries={accountingEntries}
      invoices={invoices}
      onOpenOrders={onOpenOrders}
      onPlaceOrder={onPlaceOrder}
      onInviteVendor={onInviteVendor}
      onOpenReview={onOpenReview}
      onOpenAccounting={onOpenAccounting}
      onOpenClients={onOpenClients}
      onOpenVendors={onOpenVendors}
      onOpenMessages={onOpenMessages}
      onOpenDocuments={onOpenDocuments}
      onOpenCalendar={onOpenCalendar}
    />
  );
}



export function AppraiserPortalView({ orderList, appraiserList = demoAppraisers }: { orderList: Order[]; appraiserList?: AppraiserProfile[] }) {
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
              {appraiserList.map((appraiser) => (
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
