import type { LucideIcon } from "lucide-react";
import { Bell, Command, Home, PanelLeft, Search, Workflow, X } from "lucide-react";
import { portalUsers } from "@/data/platform";
import type { Order, Organization, PortalUser } from "@/types/domain";
import { cn } from "@/lib/utils";
import { demoMode, roleLabel, type NavId } from "./config";

function focusLabels(user: PortalUser) {
  if (user.role === "client_user") return ["Place orders", "Track status", "Documents", "Messages"];
  if (user.role === "appraiser" || user.role === "solo_appraiser") return ["Assignments", "Due soon", "Revisions", "Pay"];
  if (user.role === "reviewer") return ["Review queue", "Findings", "Revisions", "Delivery"];
  if (user.role === "amc_admin" || user.role === "amc_staff") return ["Intake", "Assignment", "Vendor coverage", "Delivery"];
  return ["Intake", "Assignment", "Review", "Delivery", "Closeout"];
}

export function Sidebar({
  activeView,
  navItems,
  user,
  organization,
  onNavigate
}: {
  activeView: NavId;
  navItems: Array<{ id: NavId; label: string; icon: LucideIcon }>;
  user: PortalUser;
  organization: Organization;
  onNavigate: (view: NavId) => void;
}) {
  return (
    <aside className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
          <Home className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">CAS</div>
          <div className="truncate text-xs text-muted">{organization.name}</div>
        </div>
      </div>
      <div className="border-b border-line px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">{roleLabel(user.role)}</div>
        <div className="mt-1 truncate text-sm font-medium text-slate-900">{user.name}</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition lg:min-w-0",
                activeView === item.id
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="hidden border-t border-line p-4 lg:block">
        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
            <Workflow className="h-4 w-4" /> Work focus
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {focusLabels(user).map((step) => (
              <span key={step} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600 ring-1 ring-line">
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}



export function Topbar({
  title,
  user,
  organization,
  onCommand,
  query,
  setQuery,
  onUserChange
}: {
  title: string;
  user: PortalUser;
  organization: Organization;
  onCommand: () => void;
  query: string;
  setQuery: (value: string) => void;
  onUserChange: (userId: string) => void;
}) {
  return (
    <header className="sticky top-[65px] z-10 border-b border-line bg-white/90 backdrop-blur lg:top-0">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="icon-button lg:hidden" aria-label="Open navigation">
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-950">{title}</h1>
          <p className="hidden text-xs text-muted sm:block">{organization.name} - {roleLabel(user.role)} portal</p>
        </div>
        <button onClick={onCommand} className="hidden h-10 min-w-[320px] items-center gap-2 rounded-md border border-line bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:border-brand-200 hover:bg-white md:flex">
          <Search className="h-4 w-4" />
          <span className="flex-1">Search orders, clients, appraisers</span>
          <Command className="h-4 w-4 text-slate-400" />
        </button>
        <div className="relative block md:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="control w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        </div>
        {demoMode && (
          <label className="hidden items-center gap-2 lg:flex">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">Demo role</span>
            <select className="control w-56" value={user.id} onChange={(event) => onUserChange(event.target.value)} aria-label="Switch demo role">
              {portalUsers.map((portalUser) => (
                <option key={portalUser.id} value={portalUser.id}>{portalUser.title} - {portalUser.name}</option>
              ))}
            </select>
          </label>
        )}
        <button className="icon-button" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="hidden h-9 items-center gap-2 rounded-md border border-line bg-white px-2 sm:flex">
          <div className="h-6 w-6 rounded-full bg-brand-600" />
          <span className="text-sm font-medium text-slate-700">{user.name.split(" ")[0]}</span>
        </div>
      </div>
    </header>
  );
}



export function CommandPalette({ query, setQuery, onClose, onNavigate, onSelectOrder, orderList, navItems }: { query: string; setQuery: (value: string) => void; onClose: () => void; onNavigate: (view: NavId) => void; onSelectOrder: (order: Order) => void; orderList: Order[]; navItems: Array<{ id: NavId; label: string; icon: LucideIcon }> }) {
  const needle = query.toLowerCase();
  const matchedOrders = orderList.filter((order) => [order.fileNumber, order.borrower, order.client, order.address, order.appraiser].join(" ").toLowerCase().includes(needle)).slice(0, 5);
  const matchedNav = navItems.filter((item) => item.label.toLowerCase().includes(needle)).slice(0, 5);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-lg border border-line bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input autoFocus className="h-11 flex-1 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CAS" />
          <button className="icon-button" onClick={onClose} aria-label="Close search"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[520px] overflow-y-auto p-2">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500">Views</div>
          {matchedNav.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => onNavigate(item.id)}><Icon className="h-4 w-4 text-slate-500" />{item.label}</button>;
          })}
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500">Orders</div>
          {matchedOrders.map((order) => <button key={order.id} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => onSelectOrder(order)}><span>{order.fileNumber} - {order.borrower}</span><span className="text-xs text-slate-500">{order.status}</span></button>)}
        </div>
      </div>
    </div>
  );
}

