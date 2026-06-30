import type { OrderStatus, Priority } from "@/types/domain";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function daysUntil(value: string) {
  const today = new Date("2026-06-29T12:00:00-04:00");
  const target = new Date(`${value}T12:00:00-04:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function dueTone(value: string) {
  const days = daysUntil(value);
  if (days < 0) return "text-rose-700 bg-rose-50 border-rose-200";
  if (days <= 1) return "text-amber-800 bg-amber-50 border-amber-200";
  if (days <= 4) return "text-sky-800 bg-sky-50 border-sky-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export function statusTone(status: OrderStatus) {
  const tones: Record<OrderStatus, string> = {
    New: "bg-sky-50 text-sky-700 border-sky-200",
    Unassigned: "bg-amber-50 text-amber-800 border-amber-200",
    Assigned: "bg-blue-50 text-blue-700 border-blue-200",
    Accepted: "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Inspection Scheduled": "bg-indigo-50 text-indigo-700 border-indigo-200",
    Inspected: "bg-teal-50 text-teal-700 border-teal-200",
    "Report In Progress": "bg-violet-50 text-violet-700 border-violet-200",
    Submitted: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    "In Review": "bg-orange-50 text-orange-800 border-orange-200",
    "Revisions Needed": "bg-rose-50 text-rose-700 border-rose-200",
    "Revision Sent to Appraiser": "bg-red-50 text-red-700 border-red-200",
    "Ready for Delivery": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Delivered: "bg-lime-50 text-lime-800 border-lime-200",
    Completed: "bg-slate-100 text-slate-700 border-slate-200",
    "On Hold": "bg-zinc-100 text-zinc-700 border-zinc-200",
    Cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200"
  };
  return tones[status];
}

export function priorityTone(priority: Priority) {
  const tones: Record<Priority, string> = {
    Rush: "bg-rose-600 text-white",
    High: "bg-amber-500 text-white",
    Standard: "bg-slate-800 text-white",
    Watch: "bg-blue-600 text-white"
  };
  return tones[priority];
}
