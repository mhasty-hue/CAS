import { useState } from "react";
import { AlertTriangle, BarChart3, Building2, CheckCircle2, CircleDollarSign, Download, Gauge, ReceiptText, UserCog, WalletCards } from "lucide-react";
import { revenueChart, volumeChart } from "@/data/demo";
import type { AccountingEntry, AppraiserProfile, Invoice, Order, PortalUser } from "@/types/domain";
import { canManageAccounting } from "@/lib/permissions";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { Field, LineChart, MetricTile, SectionHeader, SimpleFoundationView, TableHeader } from "./shared";

export function AccountingView({
  user,
  entries,
  invoices,
  appraisers,
  onMarkInvoiceSent,
  onUpdateDefaultSplit,
  onOverrideCommission,
  onMarkPaid,
  onExportCsv
}: {
  user: PortalUser;
  entries: AccountingEntry[];
  invoices: Invoice[];
  appraisers: AppraiserProfile[];
  onMarkInvoiceSent: (invoiceId: string) => void;
  onUpdateDefaultSplit: (appraiserName: string, split: number) => void;
  onOverrideCommission: (orderId: string, split: number) => void;
  onMarkPaid: (entryIds: string[]) => void;
  onExportCsv: (entries: AccountingEntry[]) => void;
}) {
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-07-31");
  const [paidFilter, setPaidFilter] = useState<"All" | "Paid" | "Unpaid">("All");
  const [appraiserFilter, setAppraiserFilter] = useState("All appraisers");
  const [clientFilter, setClientFilter] = useState("All clients");
  const [productFilter, setProductFilter] = useState("All products");
  const [countyFilter, setCountyFilter] = useState("All counties");
  const [statusFilter, setStatusFilter] = useState<"All" | AccountingEntry["status"]>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const scopedEntries = user.appraiserName ? entries.filter((entry) => entry.appraiser === user.appraiserName) : entries;
  const appraiserOptions = Array.from(new Set(scopedEntries.map((entry) => entry.appraiser)));
  const clientOptions = Array.from(new Set(scopedEntries.map((entry) => entry.client)));
  const productOptions = Array.from(new Set(scopedEntries.map((entry) => entry.productType)));
  const countyOptions = Array.from(new Set(scopedEntries.map((entry) => entry.county)));

  const filteredEntries = scopedEntries.filter((entry) => {
    const completed = new Date(`${entry.completedAt}T12:00:00`);
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T23:59:59`);
    const paidState = entry.status === "Paid" ? "Paid" : "Unpaid";
    return (
      completed >= from &&
      completed <= to &&
      (paidFilter === "All" || paidFilter === paidState) &&
      (appraiserFilter === "All appraisers" || entry.appraiser === appraiserFilter) &&
      (clientFilter === "All clients" || entry.client === clientFilter) &&
      (productFilter === "All products" || entry.productType === productFilter) &&
      (countyFilter === "All counties" || entry.county === countyFilter) &&
      (statusFilter === "All" || entry.status === statusFilter)
    );
  });

  const selectedEntries = filteredEntries.filter((entry) => selectedIds.includes(entry.id));
  const grossFees = filteredEntries.reduce((total, entry) => total + entry.fee, 0);
  const techFees = filteredEntries.reduce((total, entry) => total + entry.techFee, 0);
  const payoutDue = filteredEntries.filter((entry) => entry.status !== "Paid").reduce((total, entry) => total + entry.appraiserSplit, 0);
  const paidTotal = filteredEntries.filter((entry) => entry.status === "Paid").reduce((total, entry) => total + entry.appraiserSplit, 0);
  const companyRevenue = filteredEntries.reduce((total, entry) => total + entry.companyRevenue, 0);
  const canManage = canManageAccounting(user);

  return (
    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <div className="panel p-5">
          <SectionHeader icon={CircleDollarSign} title={user.appraiserName ? "My Pay" : "Accounting and Payroll"} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricTile label="Gross fees" value={formatCurrency(grossFees)} />
            <MetricTile label="Tech fees" value={formatCurrency(techFees)} />
            {!user.appraiserName && <MetricTile label="Company revenue" value={formatCurrency(companyRevenue)} />}
            <MetricTile label="Unpaid payout" value={formatCurrency(payoutDue)} />
            <MetricTile label="Paid history" value={formatCurrency(paidTotal)} />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-4 xl:grid-cols-7">
            <Field label="Completed from"><input className="control w-full" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
            <Field label="Completed to"><input className="control w-full" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
            <Field label="Paid status">
              <select className="control w-full" value={paidFilter} onChange={(event) => setPaidFilter(event.target.value as "All" | "Paid" | "Unpaid")}>
                <option>All</option>
                <option>Paid</option>
                <option>Unpaid</option>
              </select>
            </Field>
            <Field label="Appraiser">
              <select className="control w-full" value={appraiserFilter} onChange={(event) => setAppraiserFilter(event.target.value)}>
                <option>All appraisers</option>
                {appraiserOptions.map((appraiser) => <option key={appraiser}>{appraiser}</option>)}
              </select>
            </Field>
            <Field label="Client">
              <select className="control w-full" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                <option>All clients</option>
                {clientOptions.map((client) => <option key={client}>{client}</option>)}
              </select>
            </Field>
            <Field label="Product">
              <select className="control w-full" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option>All products</option>
                {productOptions.map((product) => <option key={product}>{product}</option>)}
              </select>
            </Field>
            <Field label="County">
              <select className="control w-full" value={countyFilter} onChange={(event) => setCountyFilter(event.target.value)}>
                <option>All counties</option>
                {countyOptions.map((county) => <option key={county}>{county}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className="control h-9 w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | AccountingEntry["status"])}>
              <option>All</option>
              <option>Paid</option>
              <option>Unpaid</option>
              <option>Ready to invoice</option>
              <option>Payout pending</option>
            </select>
            <button className="secondary-button" onClick={() => onExportCsv(filteredEntries)}><Download className="h-4 w-4" /> Export CSV</button>
            <button
              className="primary-button disabled:opacity-50"
              disabled={!canManage || selectedEntries.length === 0}
              onClick={() => {
                onMarkPaid(selectedEntries.map((entry) => entry.id));
                setSelectedIds([]);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark paid
            </button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <TableHeader title="Completed Order Payroll" icon={WalletCards} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Appraiser</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">County</th>
                  <th className="px-4 py-3">Gross / tech</th>
                  <th className="px-4 py-3">Split</th>
                  <th className="px-4 py-3">Payout</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-line text-brand-600"
                        checked={selectedIds.includes(entry.id)}
                        onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, entry.id] : ids.filter((id) => id !== entry.id))}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.orderId}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(entry.completedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.client}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.appraiser}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.productType}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.county}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(entry.fee)} / {formatCurrency(entry.techFee)}</td>
                    <td className="px-4 py-3">
                      <input
                        className="h-8 w-20 rounded-md border border-line bg-white px-2 text-sm"
                        type="number"
                        min="0"
                        max="100"
                        value={entry.commissionSplit}
                        disabled={!canManage}
                        onChange={(event) => onOverrideCommission(entry.orderId, Number(event.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(entry.appraiserSplit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("chip", entry.status === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{entry.status}</span>
                      {entry.paidAt && <div className="mt-1 text-xs text-slate-500">Paid {formatDate(entry.paidAt)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3 text-sm text-slate-500">{filteredEntries.length} completed orders in payroll view</div>
        </div>
      </div>

      <aside className="grid content-start gap-5">
        <div className="panel p-5">
          <SectionHeader icon={UserCog} title="Commission Defaults" />
          <div className="mt-4 space-y-3">
            {appraisers.map((appraiser) => (
              <div key={appraiser.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{appraiser.name}</div>
                    <div className="text-xs text-slate-500">{appraiser.role} - {appraiser.counties.slice(0, 2).join(", ")}</div>
                  </div>
                  <input
                    className="h-9 w-20 rounded-md border border-line px-2 text-right text-sm"
                    type="number"
                    min="0"
                    max="100"
                    value={appraiser.defaultCommissionSplit ?? 60}
                    disabled={!canManage}
                    onChange={(event) => onUpdateDefaultSplit(appraiser.name, Number(event.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={ReceiptText} title={user.appraiserName ? "Pay History" : "Client Invoices"} />
          <div className="mt-4 space-y-3">
            {user.appraiserName ? filteredEntries.filter((entry) => entry.status === "Paid").map((entry) => (
              <div key={entry.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-800">{entry.orderId}</span><span>{formatCurrency(entry.appraiserSplit)}</span></div>
                <div className="mt-1 text-xs text-slate-500">Paid {entry.paidAt ? formatDate(entry.paidAt) : "date pending"}</div>
              </div>
            )) : invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">{invoice.client}</span>
                  <span className="text-slate-600">{formatCurrency(invoice.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{invoice.status} - due {formatDate(invoice.dueDate)}</span>
                  {invoice.status === "Draft" && <button className="secondary-button h-7 px-2 text-xs" onClick={() => onMarkInvoiceSent(invoice.id)}>Send</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}



export function AnalyticsView({ entries, orderList }: { entries: AccountingEntry[]; orderList: Order[] }) {
  const byProduct = summarizeAccounting(entries, "productType");
  const byClient = summarizeAccounting(entries, "client");
  const byAppraiser = summarizeAccounting(entries, "appraiser");
  const byCounty = summarizeAccounting(entries, "county");
  const topProduct = byProduct[0]?.label ?? "No product";
  const lastMonth = entries.filter((entry) => entry.month === "2026-06").reduce((total, entry) => total + entry.fee, 0);
  const thisMonth = entries.filter((entry) => entry.month === "2026-07").reduce((total, entry) => total + entry.fee, 0);
  const thisYear = entries.reduce((total, entry) => total + entry.fee, 0);
  const lastYear = Math.round(thisYear * 0.84);
  const averageFee = byProduct.map((product) => {
    const matching = entries.filter((entry) => entry.productType === product.label);
    return `${product.label}: ${formatCurrency(Math.round(product.revenue / Math.max(1, matching.length)))}`;
  });

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Most sold report" value={topProduct} />
        <MetricTile label="This year" value={formatCurrency(thisYear)} />
        <MetricTile label="Last year" value={formatCurrency(lastYear)} />
        <MetricTile label="Month over month" value={`${lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0}%`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="panel p-5"><SectionHeader icon={BarChart3} title="Order Volume" /><LineChart data={volumeChart} suffix=" orders" /></div>
        <div className="panel p-5"><SectionHeader icon={CircleDollarSign} title="Revenue Trend" /><LineChart data={revenueChart} prefix="$" suffix="k" /></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-4">
        <AnalyticsList title="Revenue by Product" items={byProduct.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
        <AnalyticsList title="Revenue by Client" items={byClient.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
        <AnalyticsList title="Revenue by Appraiser" items={byAppraiser.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
        <AnalyticsList title="Revenue by County" items={byCounty.map((item) => `${item.label}: ${formatCurrency(item.revenue)} (${item.count})`)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <SimpleFoundationView icon={Gauge} title="Average Fee by Product" items={averageFee} compact />
        <SimpleFoundationView icon={Building2} title="Best Clients" items={byClient.slice(0, 3).map((item) => `${item.label}: ${item.count} orders, ${formatCurrency(item.revenue)}`)} compact />
        <SimpleFoundationView icon={AlertTriangle} title="Watch Clients" items={orderList.filter((order) => daysUntil(order.dueDate) < 0).map((order) => `${order.client}: ${order.fileNumber} past due`).slice(0, 4)} compact />
      </div>
    </section>
  );
}



export function summarizeAccounting(entries: AccountingEntry[], key: "productType" | "client" | "appraiser" | "county") {
  const grouped = entries.reduce<Record<string, { label: string; revenue: number; count: number }>>((accumulator, entry) => {
    const label = entry[key];
    accumulator[label] = accumulator[label] ?? { label, revenue: 0, count: 0 };
    accumulator[label].revenue += entry.fee;
    accumulator[label].count += 1;
    return accumulator;
  }, {});

  return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
}



export function AnalyticsList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => <div key={item} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{item}</div>)}
      </div>
    </div>
  );
}


