import type { AccountingEntry, AppraiserProfile, Invoice, Order, PortalUser, VendorDocument, VendorProfile } from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

export type CommandAction = "orders" | "new-order" | "review" | "accounting" | "clients" | "vendors" | "messages" | "documents" | "pay" | "calendar";
export type MissionPriority = "Critical" | "High" | "Medium" | "Low";
export type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk" | "Critical";
export type CapacityStatus = "Available" | "Balanced" | "Busy" | "Overloaded";

export type MissionItem = {
  id: string;
  priority: MissionPriority;
  category: string;
  target: string;
  detail: string;
  nextAction: string;
  actionLabel: string;
  action: CommandAction;
};

export type CapacityInsight = {
  appraiser: AppraiserProfile;
  activeOrders: number;
  dueThisWeek: number;
  inspectionsScheduled: number;
  revisionsPending: number;
  workloadScore: number;
  status: CapacityStatus;
  capacityRemaining: number;
  specialties: string[];
  explanation: string;
};

export type RiskInsight = {
  order: Order;
  score: number;
  level: RiskLevel;
  factors: string[];
};

export type AppraiserRecommendation = {
  appraiser: AppraiserProfile | null;
  order: Order | null;
  score: number;
  reasons: string[];
};

export type SnapshotItem = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "good" | "warn" | "bad";
};

export const commandCenterToday = new Date("2026-07-09T09:00:00-04:00");

const closedStatuses = new Set(["Delivered", "Completed", "Cancelled"]);

export function commandCenterDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(commandCenterToday);
}

export function daysFromToday(date: string) {
  const target = new Date(`${date}T12:00:00-04:00`);
  const today = new Date(commandCenterToday);
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function isOpenOrder(order: Order) {
  return !closedStatuses.has(order.status);
}

function priorityRank(priority: MissionPriority) {
  return { Critical: 0, High: 1, Medium: 2, Low: 3 }[priority];
}

function riskRank(level: RiskLevel) {
  return { Critical: 0, "High Risk": 1, "Medium Risk": 2, "Low Risk": 3 }[level];
}

function inferSpecialties(appraiser: AppraiserProfile, assignedOrders: Order[]) {
  const productSpecialties = assignedOrders.map((order) => order.productType.replace("1004", "").trim()).filter(Boolean);
  const defaults: Record<string, string[]> = {
    Jordan: ["Conventional", "VA", "Complex"],
    Priya: ["FHA", "Conventional", "Gwinnett"],
    Marcus: ["Exterior", "Final inspections", "Cherokee"],
    Talia: ["Luxury", "Desktop", "Solo coverage"],
    Ari: ["Douglas", "Standard", "Overflow"]
  };
  const defaultKey = Object.keys(defaults).find((key) => appraiser.name.includes(key));
  return Array.from(new Set([...(defaultKey ? defaults[defaultKey] : []), ...productSpecialties])).slice(0, 4);
}

export function buildCapacityInsights(orderList: Order[], appraisers: AppraiserProfile[]) {
  return appraisers.map<CapacityInsight>((appraiser) => {
    const assignedOrders = orderList.filter((order) => order.appraiser === appraiser.name && isOpenOrder(order));
    const activeOrders = assignedOrders.length || appraiser.activeOrders;
    const dueThisWeek = assignedOrders.filter((order) => daysFromToday(order.dueDate) <= 7).length || appraiser.dueThisWeek;
    const inspectionsScheduled = assignedOrders.filter((order) => order.inspectionDate && Math.abs(daysFromToday(order.inspectionDate)) <= 7).length;
    const revisionsPending = assignedOrders.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser").length;
    const overdue = assignedOrders.filter((order) => daysFromToday(order.dueDate) < 0).length;
    const capacity = Math.max(appraiser.capacity, 1);
    const workloadScore = Math.min(100, Math.round((activeOrders / capacity) * 68 + dueThisWeek * 4 + revisionsPending * 8 + overdue * 10));
    const status: CapacityStatus = workloadScore >= 86 ? "Overloaded" : workloadScore >= 68 ? "Busy" : workloadScore >= 45 ? "Balanced" : "Available";
    const capacityRemaining = Math.max(0, capacity - activeOrders - Math.ceil(revisionsPending / 2));
    const specialties = inferSpecialties(appraiser, assignedOrders);

    return {
      appraiser,
      activeOrders,
      dueThisWeek,
      inspectionsScheduled,
      revisionsPending,
      workloadScore,
      status,
      capacityRemaining,
      specialties,
      explanation: `${capacityRemaining} practical slots remaining across ${appraiser.counties.slice(0, 3).join(", ")}.`
    };
  });
}

export function evaluateOrderRisk(order: Order, capacityByAppraiser: Map<string, CapacityInsight>): RiskInsight {
  const factors: string[] = [];
  let score = 0;
  const days = daysFromToday(order.dueDate);
  const capacity = capacityByAppraiser.get(order.appraiser);
  const missingDocuments = order.documentsList.some((document) => document.status === "Missing" || document.status === "Expired" || document.status === "Needs review");
  const needsInspection = !order.inspectionDate && !order.productType.toLowerCase().includes("desktop") && isOpenOrder(order);

  if (isOpenOrder(order) && days < 0) {
    score += 36;
    factors.push("Past due");
  }
  if (isOpenOrder(order) && days >= 0 && days <= 1) {
    score += 26;
    factors.push("Due within 24 hours");
  }
  if (needsInspection && days <= 3) {
    score += 18;
    factors.push("Inspection not confirmed");
  }
  if (order.status === "Submitted" || order.status === "In Review") {
    score += 18;
    factors.push("Stuck in review lane");
  }
  if (order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser") {
    score += 24;
    factors.push("Revision waiting");
  }
  if (order.appraiser === "Unassigned" || order.status === "New" || order.status === "Unassigned") {
    score += 28;
    factors.push("Unassigned");
  }
  if (missingDocuments) {
    score += 14;
    factors.push("Document gap");
  }
  if (capacity?.status === "Overloaded") {
    score += 14;
    factors.push("Assigned appraiser overloaded");
  }

  const level: RiskLevel = score >= 86 ? "Critical" : score >= 58 ? "High Risk" : score >= 28 ? "Medium Risk" : "Low Risk";
  return { order, score, level, factors: factors.length ? factors : ["On track"] };
}

export function buildRiskQueue(orderList: Order[], capacityInsights: CapacityInsight[]) {
  const capacityByAppraiser = new Map(capacityInsights.map((insight) => [insight.appraiser.name, insight]));
  return orderList
    .filter(isOpenOrder)
    .map((order) => evaluateOrderRisk(order, capacityByAppraiser))
    .sort((a, b) => riskRank(a.level) - riskRank(b.level) || b.score - a.score);
}

function preferredOrderForRecommendation(orderList: Order[]) {
  return [...orderList]
    .filter((order) => isOpenOrder(order) && (order.appraiser === "Unassigned" || order.status === "New" || order.status === "Unassigned"))
    .sort((a, b) => daysFromToday(a.dueDate) - daysFromToday(b.dueDate))[0] ?? null;
}

export function recommendAppraiser(orderList: Order[], capacityInsights: CapacityInsight[]): AppraiserRecommendation {
  const order = preferredOrderForRecommendation(orderList);
  if (!order) return { appraiser: null, order: null, score: 0, reasons: ["No unassigned appraisal orders need capacity matching right now."] };

  const scored = capacityInsights.map((insight) => {
    const coverageMatch = insight.appraiser.counties.includes(order.county);
    const specialtyMatch = insight.specialties.some((specialty) => order.productType.toLowerCase().includes(specialty.toLowerCase().split(" ")[0]));
    const score = (coverageMatch ? 42 : 0) + (specialtyMatch ? 18 : 0) + Math.max(0, 34 - insight.dueThisWeek * 3) + Math.max(0, 28 - insight.workloadScore / 2) + insight.capacityRemaining * 4;
    return { insight, score, coverageMatch, specialtyMatch };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner) return { appraiser: null, order, score: 0, reasons: ["No appraiser capacity data is available yet."] };

  const reasons = [
    winner.coverageMatch ? `${winner.insight.appraiser.name} covers ${order.county} County.` : `${winner.insight.appraiser.name} is the least constrained available option.`,
    `${winner.insight.status} workload at ${winner.insight.workloadScore}/100.`,
    `${winner.insight.capacityRemaining} recommended capacity slots remain.`,
    winner.specialtyMatch ? `${order.productType} matches current specialty patterns.` : `Turn time is averaging ${winner.insight.appraiser.avgTurnDays} days.`
  ];

  return { appraiser: winner.insight.appraiser, order, score: Math.round(winner.score), reasons };
}

export function buildMissionItems({
  orderList,
  accountingEntries,
  invoices,
  vendors,
  vendorDocuments,
  user
}: {
  orderList: Order[];
  accountingEntries: AccountingEntry[];
  invoices: Invoice[];
  vendors: VendorProfile[];
  vendorDocuments: VendorDocument[];
  user: PortalUser;
}) {
  const items: MissionItem[] = [];
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

  orderList.filter((order) => isOpenOrder(order) && daysFromToday(order.dueDate) < 0).slice(0, 3).forEach((order) => {
    items.push({
      id: `past-${order.id}`,
      priority: "Critical",
      category: "Past due order",
      target: `${order.fileNumber} · ${order.borrower}`,
      detail: `${Math.abs(daysFromToday(order.dueDate))} days late in ${order.county} County`,
      nextAction: order.appraiser === "Unassigned" ? "Assign appraiser now" : "Escalate owner and confirm delivery time",
      actionLabel: order.appraiser === "Unassigned" ? "Assign" : "Escalate",
      action: "orders"
    });
  });

  orderList.filter((order) => isOpenOrder(order) && daysFromToday(order.dueDate) === 0).slice(0, 2).forEach((order) => {
    items.push({
      id: `today-${order.id}`,
      priority: "High",
      category: "Due today",
      target: `${order.fileNumber} · ${order.appraiser}`,
      detail: `${order.productType} for ${order.client}`,
      nextAction: order.nextAction,
      actionLabel: "Open order",
      action: "orders"
    });
  });

  orderList.filter((order) => order.status === "Submitted" || order.status === "In Review").slice(0, 3).forEach((order) => {
    items.push({
      id: `review-${order.id}`,
      priority: daysFromToday(order.dueDate) < 0 ? "High" : "Medium",
      category: "Review lane",
      target: `${order.fileNumber} · ${order.reviewer}`,
      detail: `${order.reviewItems.filter((item) => !item.complete).length} open review checks`,
      nextAction: "Clear review blockers or return comments",
      actionLabel: "Review",
      action: "review"
    });
  });

  orderList.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser").forEach((order) => {
    items.push({
      id: `revision-${order.id}`,
      priority: "High",
      category: "Revision waiting",
      target: `${order.fileNumber} · ${order.appraiser}`,
      detail: order.revisionLog[0]?.summary ?? "Revision request is still open",
      nextAction: "Confirm appraiser ETA and client expectation",
      actionLabel: "Open revisions",
      action: "review"
    });
  });

  orderList.filter((order) => order.appraiser === "Unassigned" || order.status === "New" || order.status === "Unassigned").slice(0, 3).forEach((order) => {
    items.push({
      id: `assign-${order.id}`,
      priority: daysFromToday(order.dueDate) <= 2 ? "High" : "Medium",
      category: "Unassigned order",
      target: `${order.fileNumber} · ${order.county}`,
      detail: `${order.productType} due ${daysFromToday(order.dueDate) < 0 ? "past due" : `in ${daysFromToday(order.dueDate)} days`}`,
      nextAction: "Use capacity recommendation and assign coverage",
      actionLabel: "Assign",
      action: "orders"
    });
  });

  vendorDocuments.filter((document) => document.status === "Expired" || document.status === "Missing" || document.status === "Needs review" || (document.expiresAt ? daysFromToday(document.expiresAt) <= 30 : false)).slice(0, 3).forEach((document) => {
    const vendor = vendorById.get(document.vendorId);
    items.push({
      id: `vendor-doc-${document.id}`,
      priority: document.status === "Expired" || document.status === "Missing" ? "High" : "Medium",
      category: "Vendor document",
      target: `${vendor?.company ?? document.vendorId} · ${document.type}`,
      detail: document.expiresAt ? `Expires in ${daysFromToday(document.expiresAt)} days` : document.status,
      nextAction: "Request updated compliance document",
      actionLabel: "Compliance",
      action: "vendors"
    });
  });

  const payrollDue = accountingEntries.filter((entry) => entry.status === "Payout pending" || entry.status === "Unpaid");
  if (payrollDue.length && canSeeAccounting(user)) {
    items.push({
      id: "payroll-review",
      priority: "Medium",
      category: "Payroll",
      target: `${payrollDue.length} payouts need review`,
      detail: `${formatCurrency(payrollDue.reduce((total, entry) => total + entry.appraiserSplit, 0))} pending appraiser pay`,
      nextAction: "Review splits and mark paid when ready",
      actionLabel: "Payroll",
      action: "accounting"
    });
  }

  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
  if (unpaidInvoices.length && canSeeAccounting(user)) {
    items.push({
      id: "invoice-follow-up",
      priority: unpaidInvoices.some((invoice) => invoice.status === "Overdue") ? "High" : "Medium",
      category: "Receivables",
      target: `${unpaidInvoices.length} invoices open`,
      detail: `${formatCurrency(unpaidInvoices.reduce((total, invoice) => total + invoice.amount, 0))} outstanding`,
      nextAction: "Follow up on overdue client balances",
      actionLabel: "Accounting",
      action: "accounting"
    });
  }

  orderList.filter((order) => order.clientComments.length > 0 && isOpenOrder(order)).slice(0, 2).forEach((order) => {
    items.push({
      id: `client-message-${order.id}`,
      priority: "Medium",
      category: "Client message",
      target: `${order.client} · ${order.fileNumber}`,
      detail: order.clientComments[0]?.body ?? "Client message needs response",
      nextAction: "Respond before the next status update",
      actionLabel: "Messages",
      action: "messages"
    });
  });

  return items.filter((item) => roleAllowsItem(item, user)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 10);
}

export function buildSnapshotItems(orderList: Order[], accountingEntries: AccountingEntry[], invoices: Invoice[], user: PortalUser): SnapshotItem[] {
  const openOrders = orderList.filter(isOpenOrder);
  const completedThisMonth = orderList.filter((order) => order.status === "Completed" || accountingEntries.some((entry) => entry.orderId === order.id && entry.month === "2026-07"));
  const revenueThisMonth = accountingEntries.filter((entry) => entry.month === "2026-07").reduce((total, entry) => total + entry.fee, 0);
  const projectedPayroll = accountingEntries.filter((entry) => entry.status === "Payout pending" || entry.status === "Unpaid").reduce((total, entry) => total + entry.appraiserSplit, 0);
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid").reduce((total, invoice) => total + invoice.amount, 0);
  const topProduct = mostCommon(orderList.map((order) => order.productType));
  const topClient = mostCommon(orderList.map((order) => order.client));
  const avgTurnTime = average(orderList.map((order) => Math.max(1, daysBetween(order.orderedDate, order.dueDate))));

  if (user.role === "client_user") {
    return [
      { label: "Open orders", value: String(openOrders.length), detail: "Active files with CAS", tone: "neutral" },
      { label: "Ready reports", value: String(orderList.filter((order) => order.status === "Delivered" || order.status === "Completed").length), detail: "Available for download", tone: "good" },
      { label: "Revision requests", value: String(orderList.filter((order) => order.status.includes("Revision")).length), detail: "Awaiting response", tone: "warn" },
      { label: "Documents needed", value: String(orderList.filter((order) => order.documentsList.some((doc) => doc.status === "Missing")).length), detail: "Files with document gaps", tone: "bad" }
    ];
  }

  if (user.role === "appraiser" || user.role === "solo_appraiser") {
    return [
      { label: "My active orders", value: String(openOrders.length), detail: "Assigned or accepted files", tone: "neutral" },
      { label: "Inspections", value: String(openOrders.filter((order) => order.inspectionDate).length), detail: "Scheduled on calendar", tone: "good" },
      { label: "Revisions", value: String(openOrders.filter((order) => order.status.includes("Revision")).length), detail: "Need appraiser response", tone: "warn" },
      { label: "Pay summary", value: formatCurrency(projectedPayroll), detail: "Projected pending payout", tone: "neutral" }
    ];
  }

  if (user.role === "reviewer") {
    return [
      { label: "Review queue", value: String(openOrders.filter((order) => order.status === "Submitted" || order.status === "In Review").length), detail: "Reports in review lane", tone: "neutral" },
      { label: "Returned reports", value: String(openOrders.filter((order) => order.status.includes("Revision")).length), detail: "Revision loop active", tone: "warn" },
      { label: "Ready delivery", value: String(orderList.filter((order) => order.status === "Ready for Delivery").length), detail: "Approved reports", tone: "good" },
      { label: "Avg turn time", value: `${avgTurnTime.toFixed(1)}d`, detail: "Order-to-due benchmark", tone: "neutral" }
    ];
  }

  if (user.role === "amc_admin" || user.role === "amc_staff") {
    return [
      { label: "Open orders", value: String(openOrders.length), detail: "AMC-visible work", tone: "neutral" },
      { label: "Due week", value: String(openOrders.filter((order) => daysFromToday(order.dueDate) <= 7).length), detail: "Reports to watch", tone: "warn" },
      { label: "Revisions", value: String(openOrders.filter((order) => order.status.includes("Revision")).length), detail: "Returned by review/client", tone: "warn" },
      { label: "Top product", value: topProduct, detail: "Most common assignment", tone: "neutral" }
    ];
  }

  return [
    { label: "Revenue this month", value: formatCurrency(revenueThisMonth), detail: "Recognized from completed work", tone: "good" },
    { label: "Projected payroll", value: formatCurrency(projectedPayroll), detail: "Pending appraiser payout", tone: "warn" },
    { label: "Unpaid invoices", value: formatCurrency(unpaidInvoices), detail: "Open receivables", tone: unpaidInvoices > 0 ? "bad" : "good" },
    { label: "Completed this month", value: String(completedThisMonth.length), detail: "Completed or accounting-posted", tone: "neutral" },
    { label: "Top product", value: topProduct, detail: "Report type sold most often", tone: "neutral" },
    { label: "Top client", value: topClient, detail: "Highest order volume", tone: "neutral" },
    { label: "Average turn time", value: `${avgTurnTime.toFixed(1)}d`, detail: "Order-to-due benchmark", tone: "neutral" },
    { label: "YoY trend", value: "+8%", detail: "Placeholder until prior-year data connects", tone: "good" }
  ];
}

export function roleSummary(user: PortalUser, criticalCount: number, capacityInsights: CapacityInsight[]) {
  const available = capacityInsights.filter((insight) => insight.status === "Available" || insight.status === "Balanced").length;
  const summaries: Record<PortalUser["role"], string> = {
    super_admin: `${criticalCount} urgent operating signals and ${available} appraisers with usable capacity.`,
    company_admin: `${criticalCount} urgent operating signals and ${available} appraisers with usable capacity.`,
    office_staff: `${criticalCount} order desk items need attention before the next client update.`,
    appraiser_manager: `${available} appraisers can take work; overloaded queues need same-day review.`,
    appraiser: `${criticalCount} assigned work items need attention across inspections, revisions, and due dates.`,
    solo_appraiser: `${criticalCount} work items need attention across your orders, calendar, and pay.`,
    reviewer: `${criticalCount} review or revision items need a decision before delivery.`,
    amc_admin: `${criticalCount} AMC signals need attention across vendors, orders, and due reports.`,
    amc_staff: `${criticalCount} AMC operations items need attention across vendors and open reports.`,
    client_user: `${criticalCount} order updates need attention across active files, documents, and revisions.`
  };
  return summaries[user.role];
}

export function canSeeAccounting(user: PortalUser) {
  return ["super_admin", "company_admin", "appraiser_manager", "solo_appraiser"].includes(user.role);
}

function roleAllowsItem(item: MissionItem, user: PortalUser) {
  if (user.role === "client_user") return ["Due today", "Past due order", "Review lane", "Revision waiting", "Client message"].includes(item.category);
  if (user.role === "appraiser" || user.role === "solo_appraiser") return ["Past due order", "Due today", "Revision waiting", "Payroll"].includes(item.category);
  if (user.role === "reviewer") return ["Past due order", "Due today", "Review lane", "Revision waiting"].includes(item.category);
  if (user.role === "amc_admin" || user.role === "amc_staff") return ["Past due order", "Due today", "Review lane", "Revision waiting", "Vendor document", "Client message", "Unassigned order"].includes(item.category);
  if (user.role === "office_staff") return item.category !== "Payroll" && item.category !== "Receivables";
  return true;
}

function mostCommon(values: string[]) {
  const counts = values.reduce<Map<string, number>>((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map());
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";
}

function daysBetween(start: string, end: string) {
  return Math.ceil((new Date(`${end}T12:00:00-04:00`).getTime() - new Date(`${start}T12:00:00-04:00`).getTime()) / 86_400_000);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
