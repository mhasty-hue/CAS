import type { AccountingEntry, AppraiserProfile, Invoice, NotificationQueueItem, Order, Organization, OrderStatus, PortalUser, VendorDocument, VendorProfile, WorkflowTask } from "@/types/domain";
import {
  canAssignOrders,
  canDeliverReports,
  canInviteVendors,
  canManageAccounting,
  canReviewReports,
  canViewOwnPay,
  canViewNotificationLogs,
  canViewPayrollSummary,
  canViewReceivablesSummary
} from "@/lib/permissions";
import { getAuthorizedOrderFees, sanitizeOrderFeesForUser } from "@/lib/orders/fees";
import { filterOrdersForWorkflow, queueMatchesOrder, type OrderQueueId } from "@/lib/orders/workflow";
import { formatCurrency, formatDate } from "@/lib/utils";

export type CommandAction = "orders" | "new-order" | "review" | "accounting" | "clients" | "vendors" | "messages" | "documents" | "pay" | "calendar" | "tasks" | "notifications";
export type MissionPriority = "Critical" | "High" | "Medium" | "Low";
export type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk" | "Critical";
export type CapacityStatus = "Available" | "Moderate" | "Near Capacity" | "At Capacity" | "Unavailable" | "Unknown";
export type OperationsCenterDataSource = "demo" | "supabase";
export type OperationsPersona =
  | "amc_admin"
  | "amc_staff"
  | "lender_amc"
  | "internal_lender"
  | "hybrid_lender"
  | "appraisal_owner"
  | "appraisal_staff"
  | "individual_appraiser"
  | "reviewer"
  | "private_professional_client"
  | "property_owner";

export type MissionItem = {
  id: string;
  priority: MissionPriority;
  category: string;
  title: string;
  count: number;
  target: string;
  detail: string;
  nextAction: string;
  actionLabel: string;
  action: CommandAction;
  queueId?: OrderQueueId;
  source: "orders" | "tasks" | "accounting" | "invoices" | "vendors" | "messages" | "notifications";
  permission: string;
  scopedOrderIds: string[];
};

export type CapacityInsight = {
  appraiser: Pick<AppraiserProfile, "id" | "name" | "counties" | "avgTurnDays" | "revisionRate" | "licenseStatus">;
  activeOrders: number;
  dueThisWeek: number;
  inspectionsScheduled: number;
  revisionsPending: number;
  workloadScore: number;
  status: CapacityStatus;
  capacityRemaining: number;
  specialties: string[];
  explanation: string;
  sampleSize: number;
};

export type RiskInsight = {
  id: string;
  fileNumber: string;
  status: OrderStatus;
  primaryLabel: string;
  secondaryLabel: string;
  score: number;
  level: RiskLevel;
  factors: string[];
  recommendedAction: string;
  queueId: OrderQueueId;
};

export type AppraiserRecommendation = {
  appraiser: CapacityInsight["appraiser"] | null;
  order: Pick<Order, "id" | "fileNumber" | "county" | "productType"> | null;
  score: number;
  reasons: string[];
};

export type SnapshotItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "good" | "warn" | "bad";
  source: "orders" | "finance" | "review" | "performance";
  permission: string;
};

export type UpcomingItem = {
  id: string;
  title: string;
  detail: string;
  dueLabel: string;
  action: CommandAction;
  queueId?: OrderQueueId;
  tone: "neutral" | "warn" | "bad" | "good";
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
  action: CommandAction;
  orderId?: string;
};

export type QuickAction = {
  id: string;
  label: string;
  detail: string;
  action: CommandAction;
};

export type VendorScorecard = {
  id: string;
  vendorName: string;
  status: VendorProfile["status"];
  acceptanceRate: string;
  averageTurnTime: string;
  onTimeRate: string;
  revisionRate: string;
  openOrders: number;
  dueSoon: number;
  coverage: string;
  compliance: string;
  sampleSize: number;
  caveat: string;
};

export type OperationsCenterFreshness = {
  source: OperationsCenterDataSource;
  generatedAt: string;
  capped: boolean;
  limits: {
    missionItems: number;
    riskQueue: number;
    upcoming: number;
    activity: number;
    capacityInsights: number;
    vendorScorecards: number;
  };
  note: string;
};

export type OperationsCenterModel = {
  greeting: string;
  dateLabel: string;
  organizationName: string;
  activeUser: {
    id: string;
    displayName: string;
    role: PortalUser["role"];
  };
  activeOrganization: {
    id: string;
    name: string;
    type: Organization["type"];
  };
  persona: OperationsPersona;
  roleSummary: string;
  scope: {
    visibleOrderIds: string[];
    orderCount: number;
    financialPolicy: string[];
  };
  missionItems: MissionItem[];
  snapshots: SnapshotItem[];
  riskQueue: RiskInsight[];
  upcoming: UpcomingItem[];
  activity: ActivityItem[];
  quickActions: QuickAction[];
  capacityInsights: CapacityInsight[];
  recommendation: AppraiserRecommendation;
  vendorScorecards: VendorScorecard[];
  emptyState: string;
  generatedAt: string;
  freshness: OperationsCenterFreshness;
};

export type BuildOperationsCenterInput = {
  orders: Order[];
  appraisers: AppraiserProfile[];
  user: PortalUser;
  organization: Organization;
  vendors: VendorProfile[];
  vendorDocuments: VendorDocument[];
  accountingEntries: AccountingEntry[];
  invoices: Invoice[];
  tasks: WorkflowTask[];
  notificationQueue?: NotificationQueueItem[];
  now?: Date;
  source?: OperationsCenterDataSource;
  limits?: Partial<OperationsCenterFreshness["limits"]>;
};

export const commandCenterToday = new Date("2026-07-09T09:00:00-04:00");

const closedStatuses = new Set<OrderStatus>(["Delivered", "Completed", "Cancelled"]);
const missionRank: Record<MissionPriority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const riskRank: Record<RiskLevel, number> = { Critical: 0, "High Risk": 1, "Medium Risk": 2, "Low Risk": 3 };

export function commandCenterDateLabel(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(now);
}

export function daysFromToday(date: string, now = commandCenterToday) {
  const target = new Date(`${date}T12:00:00`);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function isOpenOrder(order: Order) {
  return !closedStatuses.has(order.status);
}

export function resolveGreeting({
  user,
  organization,
  now = new Date()
}: {
  user: PortalUser;
  organization: Organization;
  now?: Date;
}) {
  const name = getDisplayFirstName(user);
  if (!name) return "Welcome back.";

  const timezone = user.timezone ?? organization.timezone ?? getBrowserTimezone();
  const hour = hourInTimezone(now, timezone);
  const prefix = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}.`;
}

export function getOperationsPersona(user: PortalUser, organization: Organization): OperationsPersona {
  if (user.role === "amc_admin") return "amc_admin";
  if (user.role === "amc_staff") return "amc_staff";
  if (user.role === "reviewer") return "reviewer";
  if (user.role === "appraiser" || user.role === "solo_appraiser") return "individual_appraiser";
  if (user.role === "company_admin" || user.role === "super_admin" || user.role === "appraiser_manager") return "appraisal_owner";
  if (user.role === "office_staff") return "appraisal_staff";

  const title = `${user.title} ${organization.name}`.toLowerCase();
  if (title.includes("property owner") || user.id.includes("property-owner")) return "property_owner";
  if (title.includes("attorney") || title.includes("legal")) return "private_professional_client";
  if (title.includes("hybrid")) return "hybrid_lender";
  if (title.includes("internal") || title.includes("department") || organization.name.includes("First Carolina")) return "internal_lender";
  return "lender_amc";
}

export function buildOperationsCenterModel(input: BuildOperationsCenterInput): OperationsCenterModel {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const limits = {
    missionItems: 8,
    riskQueue: 12,
    upcoming: 8,
    activity: 8,
    capacityInsights: 12,
    vendorScorecards: 10,
    ...input.limits
  };
  const persona = getOperationsPersona(input.user, input.organization);
  const scopedOrders = filterOrdersForWorkflow(input.orders, input.user, input.organization);
  const sanitizedOrders = scopedOrders.map((order) => sanitizeOrderFeesForUser(order, input.user, input.organization));
  const scopedOrderIds = new Set(scopedOrders.map((order) => order.id));
  const scopedAccounting = scopeAccountingEntries(input.accountingEntries, scopedOrderIds, input.user);
  const scopedInvoices = scopeInvoices(input.invoices, scopedOrderIds, scopedOrders, input.user);
  const capacityInsights = buildCapacityInsights(scopedOrders, input.appraisers, input.user, input.organization, now);
  const missionItems = buildMissionItems({
    orderList: scopedOrders,
    accountingEntries: scopedAccounting,
    invoices: scopedInvoices,
    vendors: input.vendors,
    vendorDocuments: input.vendorDocuments,
    tasks: input.tasks,
    notificationQueue: input.notificationQueue,
    user: input.user,
    organization: input.organization,
    now
  });
  const riskQueue = buildRiskQueue(scopedOrders, capacityInsights, input.user, persona, now);
  const snapshots = buildSnapshotItems(scopedOrders, scopedAccounting, scopedInvoices, input.user, input.organization, persona, now);
  const upcoming = buildUpcomingWork(scopedOrders, input.user, persona, now);
  const activity = buildActivityFeed(scopedOrders, input.user, persona);
  const quickActions = buildQuickActions(input.user, persona);
  const recommendation = recommendAppraiser(scopedOrders, capacityInsights);
  const vendorScorecards = buildVendorScorecards(scopedOrders, input.vendors, input.vendorDocuments, input.user);
  const capped =
    missionItems.length > limits.missionItems ||
    riskQueue.length > limits.riskQueue ||
    upcoming.length > limits.upcoming ||
    activity.length > limits.activity ||
    capacityInsights.length > limits.capacityInsights ||
    vendorScorecards.length > limits.vendorScorecards;

  return {
    greeting: resolveGreeting({ user: input.user, organization: input.organization, now }),
    dateLabel: commandCenterDateLabel(now),
    organizationName: input.organization.name,
    activeUser: {
      id: input.user.id,
      displayName: input.user.preferredName ?? input.user.firstName ?? input.user.name,
      role: input.user.role
    },
    activeOrganization: {
      id: input.organization.id,
      name: input.organization.name,
      type: input.organization.type
    },
    persona,
    roleSummary: roleSummary(input.user, persona, missionItems.filter((item) => item.priority === "Critical" || item.priority === "High").length, capacityInsights),
    scope: {
      visibleOrderIds: sanitizedOrders.map((order) => order.id),
      orderCount: sanitizedOrders.length,
      financialPolicy: describeFinancialPolicy(scopedOrders, input.user, input.organization)
    },
    missionItems: missionItems.slice(0, limits.missionItems),
    snapshots,
    riskQueue: riskQueue.slice(0, limits.riskQueue),
    upcoming: upcoming.slice(0, limits.upcoming),
    activity: activity.slice(0, limits.activity),
    quickActions,
    capacityInsights: capacityInsights.slice(0, limits.capacityInsights),
    recommendation,
    vendorScorecards: vendorScorecards.slice(0, limits.vendorScorecards),
    emptyState: persona === "property_owner" ? "Your appraisal is on track. No action is needed right now." : "You're caught up. No urgent items require your attention right now.",
    generatedAt,
    freshness: {
      source: input.source ?? "demo",
      generatedAt,
      capped,
      limits,
      note: capped
        ? "Preview lists are capped. Counts and scoped mission totals are calculated before capping."
        : "Model contains authorized dashboard data calculated from the active role scope."
    }
  };
}

export function buildCapacityInsights(orderList: Order[], appraisers: AppraiserProfile[], user?: PortalUser, organization?: Organization, now = commandCenterToday) {
  const visibleAppraisers = appraisers.filter((appraiser) => canSeeCapacityForAppraiser(appraiser, user, organization));

  return visibleAppraisers.map<CapacityInsight>((appraiser) => {
    const assignedOrders = orderList.filter((order) => order.appraiser === appraiser.name && isOpenOrder(order));
    const activeOrders = assignedOrders.length || appraiser.activeOrders;
    const dueThisWeek = assignedOrders.filter((order) => daysFromToday(order.dueDate, now) <= 7).length || appraiser.dueThisWeek;
    const inspectionsScheduled = assignedOrders.filter((order) => order.inspectionDate && Math.abs(daysFromToday(order.inspectionDate, now)) <= 7).length;
    const revisionsPending = assignedOrders.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser").length;
    const overdue = assignedOrders.filter((order) => daysFromToday(order.dueDate, now) < 0).length;
    const capacity = Math.max(appraiser.capacity, 1);
    const workloadScore = Math.min(100, Math.round((activeOrders / capacity) * 68 + dueThisWeek * 4 + revisionsPending * 8 + overdue * 10));
    const status: CapacityStatus =
      appraiser.licenseStatus === "Missing" ? "Unavailable" :
        workloadScore >= 92 ? "At Capacity" :
          workloadScore >= 74 ? "Near Capacity" :
            workloadScore >= 48 ? "Moderate" :
              workloadScore >= 0 ? "Available" : "Unknown";
    const capacityRemaining = Math.max(0, capacity - activeOrders - Math.ceil(revisionsPending / 2));
    const specialties = inferSpecialties(appraiser, assignedOrders);

    return {
      appraiser: {
        id: appraiser.id,
        name: appraiser.name,
        counties: appraiser.counties,
        avgTurnDays: appraiser.avgTurnDays,
        revisionRate: appraiser.revisionRate,
        licenseStatus: appraiser.licenseStatus
      },
      activeOrders,
      dueThisWeek,
      inspectionsScheduled,
      revisionsPending,
      workloadScore,
      status,
      capacityRemaining,
      specialties,
      explanation: `${capacityRemaining} practical slots remaining across ${appraiser.counties.slice(0, 3).join(", ")}.`,
      sampleSize: Math.max(assignedOrders.length, appraiser.activeOrders)
    };
  });
}

export function evaluateOrderRisk(order: Order, capacityByAppraiser: Map<string, CapacityInsight>, user?: PortalUser, persona?: OperationsPersona, now = commandCenterToday): RiskInsight {
  const factors: string[] = [];
  let score = 0;
  const days = daysFromToday(order.dueDate, now);
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
    factors.push("Waiting in review");
  }
  if (order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser") {
    score += 24;
    factors.push("Revision waiting");
  }
  if (order.appraiser === "Unassigned" || order.status === "New" || order.status === "Unassigned") {
    score += 28;
    factors.push("Assignment needed");
  }
  if (missingDocuments) {
    score += 14;
    factors.push("Document gap");
  }
  if (capacity?.status === "At Capacity") {
    score += 14;
    factors.push("Assigned appraiser at capacity");
  }

  const level: RiskLevel = score >= 86 ? "Critical" : score >= 58 ? "High Risk" : score >= 28 ? "Medium Risk" : "Low Risk";
  const safeFactors = redactRiskFactors(factors.length ? factors : ["On track"], user, persona);

  return {
    id: order.id,
    fileNumber: order.fileNumber,
    status: order.status,
    primaryLabel: primaryOrderLabel(order, user, persona),
    secondaryLabel: secondaryOrderLabel(order, user, persona),
    score,
    level,
    factors: safeFactors,
    recommendedAction: recommendedRiskAction(order, user, persona),
    queueId: riskQueueForOrder(order)
  };
}

export function buildRiskQueue(orderList: Order[], capacityInsights: CapacityInsight[], user?: PortalUser, persona?: OperationsPersona, now = commandCenterToday) {
  const capacityByAppraiser = new Map(capacityInsights.map((insight) => [insight.appraiser.name, insight]));
  return orderList
    .filter(isOpenOrder)
    .map((order) => evaluateOrderRisk(order, capacityByAppraiser, user, persona, now))
    .filter((risk) => risk.level !== "Low Risk" || shouldShowLowRisk(user, persona))
    .sort((a, b) => riskRank[a.level] - riskRank[b.level] || b.score - a.score);
}

export function recommendAppraiser(orderList: Order[], capacityInsights: CapacityInsight[]): AppraiserRecommendation {
  const order = preferredOrderForRecommendation(orderList);
  if (!order || !capacityInsights.length) {
    return { appraiser: null, order: null, score: 0, reasons: ["No assignment recommendation is needed for the visible workload right now."] };
  }

  const scored = capacityInsights.map((insight) => {
    const coverageMatch = insight.appraiser.counties.includes(order.county);
    const specialtyMatch = insight.specialties.some((specialty) => order.productType.toLowerCase().includes(specialty.toLowerCase().split(" ")[0]));
    const score = (coverageMatch ? 42 : 0) + (specialtyMatch ? 18 : 0) + Math.max(0, 34 - insight.dueThisWeek * 3) + Math.max(0, 28 - insight.workloadScore / 2) + insight.capacityRemaining * 4;
    return { insight, score, coverageMatch, specialtyMatch };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner) return { appraiser: null, order, score: 0, reasons: ["No capacity data is available yet."] };

  return {
    appraiser: winner.insight.appraiser,
    order: { id: order.id, fileNumber: order.fileNumber, county: order.county, productType: order.productType },
    score: Math.round(winner.score),
    reasons: [
      winner.coverageMatch ? `${winner.insight.appraiser.name} covers ${order.county} County.` : `${winner.insight.appraiser.name} is the least constrained available option.`,
      `${winner.insight.status} workload at ${winner.insight.workloadScore}/100.`,
      `${winner.insight.capacityRemaining} recommended capacity slots remain.`,
      winner.specialtyMatch ? `${order.productType} matches current specialty patterns.` : `Turn time is averaging ${winner.insight.appraiser.avgTurnDays} days.`
    ]
  };
}

export function buildMissionItems({
  orderList,
  accountingEntries,
  invoices,
  vendors,
  vendorDocuments,
  tasks = [],
  notificationQueue = [],
  user,
  organization,
  now = commandCenterToday
}: {
  orderList: Order[];
  accountingEntries: AccountingEntry[];
  invoices: Invoice[];
  vendors: VendorProfile[];
  vendorDocuments: VendorDocument[];
  tasks?: WorkflowTask[];
  notificationQueue?: NotificationQueueItem[];
  user: PortalUser;
  organization?: Organization;
  now?: Date;
}) {
  const persona = organization ? getOperationsPersona(user, organization) : undefined;
  const items: MissionItem[] = [];
  const openOrders = orderList.filter(isOpenOrder);
  const visibleOrderIds = new Set(orderList.map((order) => order.id));
  const visibleNotifications = notificationQueue.filter((notification) =>
    (!notification.relatedOrderId || visibleOrderIds.has(notification.relatedOrderId))
    && (canViewNotificationOperations(user) || notification.recipientUserId === user.id || notification.recipient === user.name || notification.recipientRole === user.role)
  );
  const notificationFailures = visibleNotifications.filter((notification) => notification.status === "Failed" || notification.status === "Configuration required");
  if (notificationFailures.length) {
    items.push({
      id: "notification-failures",
      priority: notificationFailures.some((notification) => notification.priority === "critical") ? "Critical" : "High",
      category: "Notifications",
      title: "Communication needs attention",
      count: notificationFailures.length,
      target: `${notificationFailures.length} failed or unconfigured notice${notificationFailures.length === 1 ? "" : "s"}`,
      detail: "One or more client, assignment, bid, or delivery notifications could not be sent.",
      nextAction: "Open Notifications and resolve provider setup or retry safely.",
      actionLabel: "Open notifications",
      action: "notifications",
      source: "notifications",
      permission: "notification_scope",
      scopedOrderIds: notificationFailures.map((notification) => notification.relatedOrderId).filter(Boolean) as string[]
    });
  }

  addMission(items, {
    id: "past-due",
    category: "Past due order",
    priority: "Critical",
    orders: openOrders.filter((order) => daysFromToday(order.dueDate, now) < 0),
    title: "Past due orders need attention",
    detail: "Visible orders have passed their due date.",
    nextAction: "Open the due queue and confirm the next responsible action.",
    actionLabel: "Open orders",
    action: "orders",
    queueId: "due-soon",
    permission: "visible_order_scope"
  });

  addMission(items, {
    id: "due-today",
    category: "Due today",
    priority: "High",
    orders: openOrders.filter((order) => daysFromToday(order.dueDate, now) === 0),
    title: "Reports are due today",
    detail: "Keep these files moving before close of business.",
    nextAction: "Open due work and check report status.",
    actionLabel: "Review due work",
    action: "orders",
    queueId: "due-soon",
    permission: "visible_order_scope"
  });

  if (canAssignOrders(user)) {
    addMission(items, {
      id: "needs-assignment",
      category: "Assignment",
      priority: "High",
      orders: openOrders.filter((order) => order.status === "New" || order.status === "Unassigned" || order.appraiser === "Unassigned"),
      title: "Orders need assignment",
      detail: "These files need an appraiser, vendor, or staff assignment decision.",
      nextAction: "Use capacity and coverage before assigning.",
      actionLabel: "Assign now",
      action: "orders",
      queueId: "needs-assignment",
      permission: "assign_orders"
    });
  }

  if (canReviewReports(user) || user.role === "reviewer" || user.role === "amc_admin" || user.role === "amc_staff") {
    addMission(items, {
      id: "review-queue",
      category: "Review",
      priority: "Medium",
      orders: openOrders.filter((order) => order.status === "Submitted" || order.status === "In Review"),
      title: "Reports are waiting for review",
      detail: "Submitted reports need reviewer attention or final approval.",
      nextAction: "Open the review queue.",
      actionLabel: "Open review",
      action: "review",
      queueId: "submitted",
      permission: "review_reports"
    });
  }

  addMission(items, {
    id: "revisions",
    category: "Revisions",
    priority: "High",
    orders: openOrders.filter((order) => order.status === "Revisions Needed" || order.status === "Revision Sent to Appraiser"),
    title: "Revisions are waiting",
    detail: persona === "lender_amc" || persona === "property_owner" ? "Visible orders need an update before completion." : "Revision loops need appraiser or reviewer action.",
    nextAction: user.role === "appraiser" || user.role === "solo_appraiser" ? "Respond to revision items." : "Review the revision queue.",
    actionLabel: "Open revisions",
    action: "review",
    queueId: "revisions",
    permission: "visible_revision_scope"
  });

  if (canDeliverReports(user)) {
    addMission(items, {
      id: "ready-delivery",
      category: "Delivery",
      priority: "Medium",
      orders: openOrders.filter((order) => order.status === "Ready for Delivery"),
      title: "Reports are ready for delivery",
      detail: "Approved files can be released to the appropriate recipient.",
      nextAction: "Open delivery queue and confirm documents.",
      actionLabel: "Deliver",
      action: "review",
      queueId: "ready-for-delivery",
      permission: "deliver_reports"
    });
  }

  const actionableTasks = tasks
    .filter((task) => task.status !== "Completed" && task.status !== "Cancelled")
    .filter((task) => userCanSeeTask(task, user))
    .filter((task) => !task.relatedOrderId || visibleOrderIds.has(task.relatedOrderId))
    .filter((task) => daysFromToday(task.dueDate, now) <= 7 || task.priority === "Rush" || task.source === "Automation");
  if (actionableTasks.length) {
    items.push({
      id: "task-follow-up",
      priority: actionableTasks.some((task) => task.priority === "Rush" || daysFromToday(task.dueDate, now) < 0) ? "Critical" : "Medium",
      category: "Tasks",
      title: "Workflow tasks need follow-up",
      count: actionableTasks.length,
      target: `${actionableTasks.length} task${actionableTasks.length === 1 ? "" : "s"}`,
      detail: "Assigned workflow tasks are due soon or blocked.",
      nextAction: "Open task center and update ownership.",
      actionLabel: "Open tasks",
      action: "tasks",
      source: "tasks",
      permission: "task_scope",
      scopedOrderIds: actionableTasks.map((task) => task.relatedOrderId).filter(Boolean) as string[]
    });
  }

  const vendorDocumentIds = new Set(vendors.map((vendor) => vendor.id));
  const vendorDocs = vendorDocuments.filter((document) => vendorDocumentIds.has(document.vendorId));
  const complianceWatch = vendorDocs.filter((document) => document.status === "Expired" || document.status === "Missing" || document.status === "Needs review" || (document.expiresAt ? daysFromToday(document.expiresAt, now) <= 30 : false));
  if (complianceWatch.length && canViewVendorOperations(user)) {
    items.push({
      id: "vendor-compliance",
      priority: complianceWatch.some((document) => document.status === "Expired" || document.status === "Missing") ? "High" : "Medium",
      category: "Vendor compliance",
      title: "Vendor documents need review",
      count: complianceWatch.length,
      target: `${complianceWatch.length} compliance item${complianceWatch.length === 1 ? "" : "s"}`,
      detail: "Vendor eligibility should be reviewed before assignment.",
      nextAction: "Request updated compliance documents.",
      actionLabel: "Compliance",
      action: "vendors",
      source: "vendors",
      permission: "view_vendor_compliance_documents",
      scopedOrderIds: []
    });
  }

  const payrollDue = accountingEntries.filter((entry) => entry.status === "Payout pending" || entry.status === "Unpaid");
  if (payrollDue.length && canViewDashboardPayroll(user)) {
    items.push({
      id: "payroll-review",
      priority: "Medium",
      category: "Payroll",
      title: "Payroll needs review",
      count: payrollDue.length,
      target: `${payrollDue.length} pending payout${payrollDue.length === 1 ? "" : "s"}`,
      detail: `${formatCurrency(payrollDue.reduce((total, entry) => total + visiblePayoutAmount(entry, user), 0))} visible pending payout.`,
      nextAction: "Review visible payouts and approvals.",
      actionLabel: user.role === "appraiser" || user.role === "solo_appraiser" ? "Pay" : "Payroll",
      action: user.role === "appraiser" || user.role === "solo_appraiser" ? "pay" : "accounting",
      source: "accounting",
      permission: user.role === "appraiser" || user.role === "solo_appraiser" ? "view_own_pay" : "view_payroll_summary",
      scopedOrderIds: payrollDue.map((entry) => entry.orderId)
    });
  }

  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid" && invoice.status !== "Void");
  if (unpaidInvoices.length && canViewReceivablesSummary(user)) {
    items.push({
      id: "invoice-follow-up",
      priority: unpaidInvoices.some((invoice) => invoice.status === "Overdue") ? "High" : "Medium",
      category: "Receivables",
      title: "Invoices require action",
      count: unpaidInvoices.length,
      target: `${unpaidInvoices.length} open invoice${unpaidInvoices.length === 1 ? "" : "s"}`,
      detail: `${formatCurrency(unpaidInvoices.reduce((total, invoice) => total + visibleInvoiceAmount(invoice, user), 0))} visible outstanding balance.`,
      nextAction: "Follow up on visible invoice balances.",
      actionLabel: "Accounting",
      action: "accounting",
      source: "invoices",
      permission: "view_receivables_summary",
      scopedOrderIds: unpaidInvoices.map((invoice) => invoice.orderId).filter(Boolean) as string[]
    });
  }

  addMission(items, {
    id: "client-messages",
    category: "Messages",
    priority: "Medium",
    orders: openOrders.filter((order) => order.clientComments.length > 0),
    title: "Client messages need response",
    detail: "Visible client-facing comments are waiting in active files.",
    nextAction: "Open messages and respond with the next status update.",
    actionLabel: "Messages",
    action: "messages",
    permission: "client_visible_messages"
  });

  return items
    .filter((item) => roleAllowsItem(item, user, persona))
    .sort((a, b) => missionRank[a.priority] - missionRank[b.priority] || b.count - a.count)
    .slice(0, 10);
}

export function buildSnapshotItems(orderList: Order[], accountingEntries: AccountingEntry[], invoices: Invoice[], user: PortalUser, organization?: Organization, persona?: OperationsPersona, now = commandCenterToday): SnapshotItem[] {
  const openOrders = orderList.filter(isOpenOrder);
  const completedThisPeriod = orderList.filter((order) => order.status === "Completed" || order.status === "Delivered");
  const avgTurnTime = average(orderList.map((order) => Math.max(1, daysBetween(order.orderedDate, order.dueDate))));
  const atRisk = buildRiskQueue(orderList, [], user, persona, now).filter((risk) => risk.level === "Critical" || risk.level === "High Risk").length;
  const items: SnapshotItem[] = [];

  items.push({ id: "open-orders", label: persona === "property_owner" ? "Your order" : "Open orders", value: String(openOrders.length), detail: persona === "property_owner" ? "Visible customer order" : "Visible active files", tone: "neutral", source: "orders", permission: "visible_order_scope" });

  if (persona !== "property_owner") {
    items.push({ id: "at-risk", label: "At risk", value: String(atRisk), detail: "Visible files needing attention", tone: atRisk ? "warn" : "good", source: "orders", permission: "visible_order_scope" });
    items.push({ id: "due-week", label: "Due this week", value: String(openOrders.filter((order) => daysFromToday(order.dueDate, now) <= 7).length), detail: "Visible deadlines", tone: "warn", source: "orders", permission: "visible_order_scope" });
  }

  if (persona === "reviewer") {
    items.push({ id: "review-queue", label: "Review queue", value: String(openOrders.filter((order) => order.status === "Submitted" || order.status === "In Review").length), detail: "Reports needing review", tone: "neutral", source: "review", permission: "review_reports" });
    items.push({ id: "revision-responses", label: "Revision responses", value: String(openOrders.filter((order) => order.status.includes("Revision")).length), detail: "Returned report loop", tone: "warn", source: "review", permission: "review_reports" });
    return items.slice(0, 6);
  }

  if (persona === "property_owner" || persona === "private_professional_client" || persona === "lender_amc" || persona === "internal_lender" || persona === "hybrid_lender") {
    items.push({ id: "completed-reports", label: "Completed reports", value: String(completedThisPeriod.length), detail: "Released or complete", tone: "good", source: "orders", permission: "client_order_scope" });
    const visibleClientFees = organization ? sumAuthorizedFees(orderList, user, organization, "clientFee") : 0;
    if (visibleClientFees > 0) {
      items.push({ id: "client-fees", label: "Client fees", value: formatCurrency(visibleClientFees), detail: "Visible order/invoice amount", tone: "neutral", source: "finance", permission: "view_client_fee" });
    }
    return items.slice(0, persona === "property_owner" ? 4 : 6);
  }

  if (user.role === "appraiser" || user.role === "solo_appraiser") {
    const assignmentPay = organization ? sumAuthorizedFees(orderList, user, organization, "vendorFee") : accountingEntries.reduce((total, entry) => total + visiblePayoutAmount(entry, user), 0);
    items.push({ id: "inspections", label: "Inspections", value: String(openOrders.filter((order) => order.inspectionDate).length), detail: "Visible scheduled work", tone: "good", source: "orders", permission: "assigned_order_scope" });
    items.push({ id: "revisions", label: "Revisions", value: String(openOrders.filter((order) => order.status.includes("Revision")).length), detail: "Need appraiser response", tone: "warn", source: "review", permission: "assigned_order_scope" });
    if (assignmentPay > 0 && canViewOwnPay(user)) {
      items.push({ id: "assignment-pay", label: "Your Assignment Fee", value: formatCurrency(assignmentPay), detail: "Visible pending assignment pay", tone: "neutral", source: "finance", permission: "view_own_pay" });
    }
    return items.slice(0, 6);
  }

  items.push({ id: "completed-period", label: "Completed", value: String(completedThisPeriod.length), detail: "Delivered or completed visible files", tone: "neutral", source: "orders", permission: "visible_order_scope" });
  items.push({ id: "avg-turn", label: "Avg turn time", value: `${avgTurnTime.toFixed(1)}d`, detail: "Visible order-to-due benchmark", tone: "neutral", source: "performance", permission: "visible_order_scope" });

  if (organization && canManageAccounting(user)) {
    const clientFees = sumAuthorizedFees(orderList, user, organization, "clientFee");
    const vendorFees = sumAuthorizedFees(orderList, user, organization, "vendorFee");
    const margin = sumAuthorizedFees(orderList, user, organization, "margin");
    if (clientFees > 0) items.unshift({ id: "client-fee-total", label: organization.type === "amc" ? "Client fees" : "Revenue", value: formatCurrency(clientFees), detail: "Authorized visible client fees", tone: "good", source: "finance", permission: "view_client_fee" });
    if (vendorFees > 0) items.push({ id: "vendor-fee-total", label: organization.type === "amc" ? "Vendor fees" : "Appraiser fees", value: formatCurrency(vendorFees), detail: "Authorized visible payable fees", tone: "warn", source: "finance", permission: "view_vendor_fee" });
    if (margin > 0) items.push({ id: "margin-total", label: organization.type === "amc" ? "Gross spread" : "Company margin", value: formatCurrency(margin), detail: "Authorized visible spread only", tone: "neutral", source: "finance", permission: "view_margin" });
  }

  const receivables = invoices.reduce((total, invoice) => total + visibleInvoiceAmount(invoice, user), 0);
  if (receivables > 0 && canViewReceivablesSummary(user)) {
    items.push({ id: "receivables", label: "Unpaid invoices", value: formatCurrency(receivables), detail: "Visible open receivables", tone: "bad", source: "finance", permission: "view_receivables_summary" });
  }

  return items.slice(0, 8);
}

export function roleSummary(user: PortalUser, personaOrCriticalCount: OperationsPersona | number, criticalCountOrCapacity?: number | CapacityInsight[], capacityMaybe?: CapacityInsight[]) {
  const persona = typeof personaOrCriticalCount === "string" ? personaOrCriticalCount : getFallbackPersona(user);
  const criticalCount = typeof personaOrCriticalCount === "number" ? personaOrCriticalCount : Number(criticalCountOrCapacity ?? 0);
  const capacityInsights = Array.isArray(criticalCountOrCapacity) ? criticalCountOrCapacity : capacityMaybe ?? [];
  const available = capacityInsights.filter((insight) => insight.status === "Available" || insight.status === "Moderate").length;

  const summaries: Record<OperationsPersona, string> = {
    amc_admin: `${criticalCount} urgent AMC signals across orders, vendors, review, delivery, and authorized finance.`,
    amc_staff: `${criticalCount} operational AMC items need attention across assignment, scheduling, review, and client updates.`,
    lender_amc: `${criticalCount} lender-facing updates need attention across your orders, documents, and completed reports.`,
    internal_lender: `${criticalCount} internal appraisal department items need attention without AMC margin concepts.`,
    hybrid_lender: `${criticalCount} items split between internally managed and AMC-managed appraisal work.`,
    appraisal_owner: `${criticalCount} company work items need attention; ${available} appraisers show available or moderate capacity.`,
    appraisal_staff: `${criticalCount} order desk items need attention across assignments, schedules, and documents.`,
    individual_appraiser: `${criticalCount} assigned work items need attention across inspections, reports, revisions, and pay.`,
    reviewer: `${criticalCount} review or revision items need a reviewer decision before delivery.`,
    private_professional_client: `${criticalCount} client-facing appraisal updates need attention across your matters.`,
    property_owner: `${criticalCount} customer-facing appraisal update needs attention.`
  };

  return summaries[persona];
}

export function canSeeAccounting(user: PortalUser) {
  return canViewPayrollSummary(user) || canViewReceivablesSummary(user) || canManageAccounting(user) || canViewOwnPay(user);
}

function scopeAccountingEntries(entries: AccountingEntry[], scopedOrderIds: Set<string>, user: PortalUser) {
  if (!canSeeAccounting(user)) return [];
  return entries.filter((entry) => scopedOrderIds.has(entry.orderId)).filter((entry) => {
    if (user.role === "appraiser" || user.role === "solo_appraiser") return entry.appraiser === user.appraiserName || entry.appraiser === user.name;
    return canManageAccounting(user) || canViewPayrollSummary(user);
  });
}

function scopeInvoices(invoices: Invoice[], scopedOrderIds: Set<string>, orders: Order[], user: PortalUser) {
  if (!canViewReceivablesSummary(user) && user.role !== "client_user") return [];
  const visibleClients = new Set(orders.map((order) => order.client));
  return invoices.filter((invoice) => {
    if (invoice.orderId) return scopedOrderIds.has(invoice.orderId);
    return visibleClients.has(invoice.client) || visibleClients.has(invoice.billingParty ?? "");
  });
}

function describeFinancialPolicy(orderList: Order[], user: PortalUser, organization: Organization) {
  const visibleKeys = new Set(orderList.flatMap((order) => getAuthorizedOrderFees(order, user, organization).map((fee) => fee.key)));
  const labels: Record<string, string> = {
    clientFee: "client_fee",
    vendorFee: user.role === "appraiser" || user.role === "solo_appraiser" ? "own_assignment_fee" : "vendor_fee",
    margin: "gross_spread_or_margin",
    invoice: "invoice",
    commission: "commission"
  };
  return [...visibleKeys].map((key) => labels[key] ?? key);
}

function buildUpcomingWork(orderList: Order[], user: PortalUser, persona: OperationsPersona | undefined, now: Date): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  const visible = orderList.filter(isOpenOrder);

  visible
    .filter((order) => order.inspectionDate && daysFromToday(order.inspectionDate, now) >= 0 && daysFromToday(order.inspectionDate, now) <= 2)
    .slice(0, 3)
    .forEach((order) => {
      items.push({
        id: `inspection-${order.id}`,
        title: persona === "property_owner" ? "Inspection appointment" : "Inspection scheduled",
        detail: `${primaryOrderLabel(order, user, persona)} - ${formatDate(order.inspectionDate ?? order.dueDate)}`,
        dueLabel: daysFromToday(order.inspectionDate ?? order.dueDate, now) === 0 ? "Today" : "Soon",
        action: "calendar",
        queueId: "active",
        tone: "good"
      });
    });

  visible
    .filter((order) => daysFromToday(order.dueDate, now) >= 0 && daysFromToday(order.dueDate, now) <= 7)
    .slice(0, 4)
    .forEach((order) => {
      items.push({
        id: `due-${order.id}`,
        title: persona === "property_owner" ? "Expected report milestone" : "Report due",
        detail: `${primaryOrderLabel(order, user, persona)} - ${order.status}`,
        dueLabel: daysFromToday(order.dueDate, now) === 0 ? "Due today" : `Due in ${daysFromToday(order.dueDate, now)}d`,
        action: "orders",
        queueId: "due-soon",
        tone: daysFromToday(order.dueDate, now) <= 1 ? "warn" : "neutral"
      });
    });

  visible
    .filter((order) => order.status === "Ready for Delivery")
    .slice(0, 3)
    .forEach((order) => {
      items.push({
        id: `delivery-${order.id}`,
        title: "Delivery waiting",
        detail: primaryOrderLabel(order, user, persona),
        dueLabel: "Ready",
        action: canDeliverReports(user) ? "review" : "orders",
        queueId: "ready-for-delivery",
        tone: "good"
      });
    });

  return dedupeById(items).slice(0, persona === "property_owner" ? 3 : 8);
}

function buildActivityFeed(orderList: Order[], user: PortalUser, persona: OperationsPersona | undefined): ActivityItem[] {
  const activities = orderList.flatMap((order) => {
    const timelineItems = order.timeline.slice(0, 2).map<ActivityItem>((item, index) => ({
      id: `${order.id}-timeline-${index}`,
      title: activityTitle(order, item.label, user, persona),
      detail: activityDetail(order, item.detail, user, persona),
      at: item.at,
      action: "orders",
      orderId: order.id
    }));

    const auditItems = isClientPersona(persona)
      ? []
      : order.auditTrail.slice(0, 1).map<ActivityItem>((item, index) => ({
        id: `${order.id}-audit-${index}`,
        title: activityTitle(order, item.action, user, persona),
          detail: activityDetail(order, item.action, user, persona),
        at: item.at,
        action: "orders",
        orderId: order.id
        }));

    return [...timelineItems, ...auditItems];
  });

  return activities.slice(0, isClientPersona(persona) ? 5 : 8);
}

function buildQuickActions(user: PortalUser, persona: OperationsPersona): QuickAction[] {
  const actions: Record<OperationsPersona, QuickAction[]> = {
    amc_admin: [
      { id: "create-order", label: "Create order", detail: "Start new intake", action: "new-order" },
      { id: "assign-order", label: "Assign order", detail: "Open assignment queue", action: "orders" },
      { id: "review-queue", label: "Open review", detail: "Review submitted reports", action: "review" },
      { id: "deliver-reports", label: "Deliver reports", detail: "Release approved files", action: "review" },
      { id: "add-vendor", label: "Add vendor", detail: "Invite or review vendor", action: "vendors" }
    ],
    amc_staff: [
      { id: "assignment", label: "Assignment queue", detail: "Move files forward", action: "orders" },
      { id: "scheduling", label: "Scheduling", detail: "Check inspection lanes", action: "calendar" },
      { id: "messages", label: "Messages", detail: "Client updates", action: "messages" }
    ],
    lender_amc: [
      { id: "place-order", label: "Place order", detail: "Request a new appraisal", action: "new-order" },
      { id: "upload-doc", label: "Upload document", detail: "Send requested files", action: "documents" },
      { id: "track-orders", label: "Track orders", detail: "Review active files", action: "orders" }
    ],
    internal_lender: [
      { id: "place-order", label: "Place order", detail: "Open internal request", action: "new-order" },
      { id: "manage-orders", label: "Manage orders", detail: "Internal appraisal queue", action: "orders" },
      { id: "review", label: "Review", detail: "Internal quality queue", action: "review" }
    ],
    hybrid_lender: [
      { id: "internal-orders", label: "Internal work", detail: "Open internal files", action: "orders" },
      { id: "amc-orders", label: "AMC-managed", detail: "Track AMC files", action: "orders" },
      { id: "place-order", label: "Place order", detail: "Choose management path", action: "new-order" }
    ],
    appraisal_owner: [
      { id: "incoming", label: "Incoming work", detail: "Review assignments", action: "orders" },
      { id: "assign-staff", label: "Assign staff", detail: "Balance capacity", action: "orders" },
      { id: "calendar", label: "Calendar", detail: "Schedule inspections", action: "calendar" },
      { id: "accounting", label: "Accounting", detail: "Authorized finance", action: "accounting" }
    ],
    appraisal_staff: [
      { id: "orders", label: "Open orders", detail: "Work the queue", action: "orders" },
      { id: "calendar", label: "Calendar", detail: "Schedule inspections", action: "calendar" },
      { id: "documents", label: "Documents", detail: "Review uploads", action: "documents" }
    ],
    individual_appraiser: [
      { id: "accept", label: "Accept assignment", detail: "Review incoming work", action: "orders" },
      { id: "schedule", label: "Schedule inspection", detail: "Open calendar", action: "calendar" },
      { id: "upload-report", label: "Upload report", detail: "Submit completed report", action: "documents" },
      { id: "revision", label: "Respond to revision", detail: "Open revision queue", action: "review" }
    ],
    reviewer: [
      { id: "next-review", label: "Open next review", detail: "Start report review", action: "review" },
      { id: "critical-findings", label: "Critical findings", detail: "Review blockers", action: "review" },
      { id: "revision-responses", label: "Revision responses", detail: "Clear returned reports", action: "review" }
    ],
    private_professional_client: [
      { id: "place-order", label: "Place order", detail: "Request appraisal work", action: "new-order" },
      { id: "upload-doc", label: "Upload document", detail: "Provide requested file", action: "documents" },
      { id: "track", label: "Track status", detail: "Open matter status", action: "orders" }
    ],
    property_owner: [
      { id: "place-order", label: "Place order", detail: "Request an appraisal", action: "new-order" },
      { id: "upload-doc", label: "Upload document", detail: "Send requested file", action: "documents" },
      { id: "view-status", label: "View status", detail: "Check your appraisal", action: "orders" }
    ]
  };

  return actions[persona].filter((action) => actionIsAllowed(action, user));
}

function buildVendorScorecards(orderList: Order[], vendors: VendorProfile[], vendorDocuments: VendorDocument[], user: PortalUser): VendorScorecard[] {
  if (!canViewVendorOperations(user)) return [];
  const documentsByVendor = new Map(vendorDocuments.map((document) => [document.vendorId, document]));

  return vendors.map((vendor) => {
    const vendorOrders = orderList.filter((order) => order.appraiser === vendor.contact || order.appraiser === vendor.company);
    const dueSoon = vendorOrders.filter((order) => isOpenOrder(order) && daysFromToday(order.dueDate) <= 7).length;
    const sampleSize = Math.max(vendorOrders.length, vendor.workload ?? 0);
    const document = documentsByVendor.get(vendor.id);
    const compliance = document ? `${document.type}: ${document.status}` : `W-9 ${vendor.documents.w9}, E&O ${vendor.documents.eo}, License ${vendor.documents.license}`;

    return {
      id: vendor.id,
      vendorName: vendor.company,
      status: vendor.status,
      acceptanceRate: sampleSize < 5 ? "Insufficient sample" : "86%",
      averageTurnTime: `${vendor.turnTime}d`,
      onTimeRate: sampleSize < 5 ? "Insufficient sample" : "92%",
      revisionRate: sampleSize < 5 ? "Insufficient sample" : "5%",
      openOrders: vendorOrders.filter(isOpenOrder).length,
      dueSoon,
      coverage: vendor.coverage.join(", "),
      compliance,
      sampleSize,
      caveat: sampleSize < 5 ? "Small sample. Treat as directional, not a ranking." : "Explainable operational metrics only."
    };
  });
}

function addMission(items: MissionItem[], options: {
  id: string;
  category: string;
  priority: MissionPriority;
  orders: Order[];
  title: string;
  detail: string;
  nextAction: string;
  actionLabel: string;
  action: CommandAction;
  queueId?: OrderQueueId;
  permission: string;
}) {
  if (!options.orders.length) return;
  items.push({
    id: options.id,
    priority: options.priority,
    category: options.category,
    title: options.title,
    count: options.orders.length,
    target: `${options.orders.length} ${options.orders.length === 1 ? "file" : "files"}`,
    detail: options.detail,
    nextAction: options.nextAction,
    actionLabel: options.actionLabel,
    action: options.action,
    queueId: options.queueId,
    source: "orders",
    permission: options.permission,
    scopedOrderIds: options.orders.map((order) => order.id)
  });
}

function roleAllowsItem(item: MissionItem, user: PortalUser, persona?: OperationsPersona) {
  if (persona === "property_owner") return ["Past due order", "Due today", "Revisions", "Messages"].includes(item.category);
  if (isClientPersona(persona)) return ["Past due order", "Due today", "Revisions", "Messages", "Receivables"].includes(item.category);
  if (persona === "individual_appraiser") return ["Past due order", "Due today", "Revisions", "Tasks", "Payroll"].includes(item.category);
  if (persona === "reviewer") return ["Past due order", "Due today", "Review", "Revisions", "Tasks"].includes(item.category);
  if (persona === "amc_staff" || user.role === "office_staff") return item.category !== "Payroll" && item.category !== "Receivables";
  return true;
}

function getDisplayFirstName(user: PortalUser) {
  const candidate = user.preferredName ?? user.firstName ?? user.name?.trim().split(/\s+/)[0];
  return candidate?.trim() || undefined;
}

function getBrowserTimezone() {
  if (typeof Intl === "undefined") return undefined;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function hourInTimezone(now: Date, timezone?: string) {
  if (!timezone) return now.getHours();
  try {
    const hour = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: timezone }).format(now);
    return Number(hour);
  } catch {
    return now.getHours();
  }
}

function inferSpecialties(appraiser: AppraiserProfile, assignedOrders: Order[]) {
  const productSpecialties = assignedOrders.map((order) => order.productType.replace("1004", "").trim()).filter(Boolean);
  const defaults: Record<string, string[]> = {
    Jordan: ["Conventional", "VA", "Complex"],
    Priya: ["FHA", "Conventional", "Gwinnett"],
    Marcus: ["Exterior", "Final inspections", "Cherokee"],
    Talia: ["Luxury", "Desktop", "Solo coverage"],
    Ari: ["Douglas", "Standard", "Overflow"],
    Renee: ["Connected work", "Regional coverage", "Complex"]
  };
  const defaultKey = Object.keys(defaults).find((key) => appraiser.name.includes(key));
  return Array.from(new Set([...(defaultKey ? defaults[defaultKey] : []), ...productSpecialties])).slice(0, 4);
}

function canSeeCapacityForAppraiser(appraiser: AppraiserProfile, user?: PortalUser, organization?: Organization) {
  if (!user) return true;
  if (user.role === "appraiser" || user.role === "solo_appraiser") return appraiser.name === user.appraiserName || appraiser.name === user.name;
  if (user.role === "reviewer" || user.role === "client_user") return false;
  if (organization?.type === "amc") return user.role === "amc_admin" || user.role === "amc_staff";
  return canAssignOrders(user) || user.role === "company_admin" || user.role === "office_staff" || user.role === "appraiser_manager" || user.role === "super_admin";
}

function canViewVendorOperations(user: PortalUser) {
  return user.role === "amc_admin" || user.role === "amc_staff" || canInviteVendors(user);
}

function canViewNotificationOperations(user: PortalUser) {
  return canViewNotificationLogs(user) || user.role === "company_admin" || user.role === "office_staff" || user.role === "amc_admin" || user.role === "amc_staff";
}

function canViewDashboardPayroll(user: PortalUser) {
  if (user.role === "reviewer" || user.role === "client_user") return false;
  return canViewPayrollSummary(user) || canViewOwnPay(user);
}

function visiblePayoutAmount(entry: AccountingEntry, user: PortalUser) {
  if (user.role === "appraiser" || user.role === "solo_appraiser") return entry.appraiserSplit;
  return canViewPayrollSummary(user) || canManageAccounting(user) ? entry.appraiserSplit : 0;
}

function visibleInvoiceAmount(invoice: Invoice, user: PortalUser) {
  if (user.role === "appraiser" || user.role === "solo_appraiser" || user.role === "reviewer") return 0;
  return canViewReceivablesSummary(user) || user.role === "client_user" ? invoice.balanceDue ?? invoice.amount : 0;
}

function sumAuthorizedFees(orderList: Order[], user: PortalUser, organization: Organization, key: "clientFee" | "vendorFee" | "margin") {
  return orderList.reduce((total, order) => {
    const fee = getAuthorizedOrderFees(order, user, organization).find((item) => item.key === key);
    return total + (fee?.amount ?? 0);
  }, 0);
}

function preferredOrderForRecommendation(orderList: Order[]) {
  return [...orderList]
    .filter((order) => isOpenOrder(order) && (order.appraiser === "Unassigned" || order.status === "New" || order.status === "Unassigned"))
    .sort((a, b) => daysFromToday(a.dueDate) - daysFromToday(b.dueDate))[0] ?? null;
}

function primaryOrderLabel(order: Order, user?: PortalUser, persona?: OperationsPersona) {
  if (persona === "property_owner") return order.address;
  if (isClientPersona(persona)) return `${order.fileNumber} - ${order.borrower}`;
  if (user?.role === "appraiser" || user?.role === "solo_appraiser") return `${order.fileNumber} - ${order.address}`;
  return `${order.fileNumber} - ${order.borrower}`;
}

function secondaryOrderLabel(order: Order, user?: PortalUser, persona?: OperationsPersona) {
  if (persona === "property_owner") return `${order.status} - ${formatDate(order.dueDate)}`;
  if (isClientPersona(persona)) return `${order.productType} - ${formatDate(order.dueDate)}`;
  if (user?.role === "appraiser" || user?.role === "solo_appraiser") return `${order.county} County - ${order.productType}`;
  return `${order.county} County - ${order.appraiser}`;
}

function redactRiskFactors(factors: string[], user?: PortalUser, persona?: OperationsPersona) {
  if (!isClientPersona(persona)) return factors;
  return factors.map((factor) => {
    if (factor.includes("review") || factor.includes("Revision")) return "Report update pending";
    if (factor.includes("Assignment") || factor.includes("capacity") || factor.includes("appraiser")) return "Assignment update pending";
    if (factor.includes("Document")) return "Document requested";
    if (factor.includes("Past due")) return "Due date update pending";
    return factor;
  });
}

function recommendedRiskAction(order: Order, user?: PortalUser, persona?: OperationsPersona) {
  if (persona === "property_owner") return "Check the latest customer-visible status.";
  if (isClientPersona(persona)) return "Review visible requests or message the order desk.";
  if (order.status === "New" || order.status === "Unassigned") return "Assign qualified coverage.";
  if (order.status === "Submitted" || order.status === "In Review") return "Open review and clear blockers.";
  if (order.status.includes("Revision")) return user?.role === "appraiser" ? "Respond to revision items." : "Review revision response.";
  if (!order.inspectionDate) return "Schedule or confirm the inspection.";
  return "Open the order and confirm the next action.";
}

function riskQueueForOrder(order: Order): OrderQueueId {
  if (order.status === "New" || order.status === "Unassigned") return "needs-assignment";
  if (order.status === "Submitted") return "submitted";
  if (order.status === "In Review") return "in-review";
  if (order.status.includes("Revision")) return "revisions";
  if (order.status === "Ready for Delivery") return "ready-for-delivery";
  if (queueMatchesOrder(order, "due-soon")) return "due-soon";
  return "active";
}

function shouldShowLowRisk(user?: PortalUser, persona?: OperationsPersona) {
  return user?.role === "client_user" || persona === "property_owner";
}

function userCanSeeTask(task: WorkflowTask, user: PortalUser) {
  if (user.role === "appraiser" || user.role === "reviewer" || user.role === "solo_appraiser") {
    return task.assignedTo === user.name || task.assignedRole === user.role;
  }
  if (user.role === "client_user") return false;
  return true;
}

function activityTitle(order: Order, label: string, user: PortalUser, persona?: OperationsPersona) {
  if (persona === "property_owner") return customerActivityLabel(order.status);
  if (isClientPersona(persona)) return clientActivityLabel(order.status);
  if (user.role === "reviewer") return `Review update: ${order.fileNumber}`;
  return label.includes(order.fileNumber) ? label : `${order.fileNumber} - ${label}`;
}

function activityDetail(order: Order, detail: string, user: PortalUser, persona?: OperationsPersona) {
  if (persona === "property_owner") return "Your appraisal status was updated.";
  if (isClientPersona(persona)) return `${order.fileNumber} status is ${order.status}.`;
  if (user.role === "appraiser" || user.role === "solo_appraiser") return detail.replace(/fee|margin|spread/gi, "assignment detail");
  return detail.replace(/\$\d[\d,]*(\.\d{2})?/g, "authorized amount");
}

function clientActivityLabel(status: OrderStatus) {
  if (status === "Ready for Delivery" || status === "Delivered" || status === "Completed") return "Report delivery update";
  if (status.includes("Revision")) return "Report update in progress";
  if (status === "Inspection Scheduled") return "Inspection scheduled";
  return "Order status updated";
}

function customerActivityLabel(status: OrderStatus) {
  if (status === "Inspection Scheduled") return "Inspection appointment updated";
  if (status === "Delivered" || status === "Completed") return "Final report is available";
  return "Your appraisal was updated";
}

function actionIsAllowed(action: QuickAction, user: PortalUser) {
  if (action.action === "new-order") return user.role === "client_user" || user.role === "amc_admin" || user.role === "amc_staff" || user.role === "solo_appraiser" || user.role === "company_admin" || user.role === "super_admin";
  if (action.action === "accounting") return canManageAccounting(user) || canViewPayrollSummary(user) || canViewOwnPay(user);
  if (action.action === "vendors") return canViewVendorOperations(user);
  if (action.action === "review") return canReviewReports(user) || user.role === "reviewer" || user.role === "appraiser" || user.role === "solo_appraiser" || canDeliverReports(user);
  return true;
}

function isClientPersona(persona?: OperationsPersona) {
  return persona === "lender_amc" || persona === "internal_lender" || persona === "hybrid_lender" || persona === "private_professional_client" || persona === "property_owner";
}

function getFallbackPersona(user: PortalUser): OperationsPersona {
  if (user.role === "amc_admin") return "amc_admin";
  if (user.role === "amc_staff") return "amc_staff";
  if (user.role === "reviewer") return "reviewer";
  if (user.role === "appraiser" || user.role === "solo_appraiser") return "individual_appraiser";
  if (user.role === "office_staff") return "appraisal_staff";
  if (user.role === "client_user") return "lender_amc";
  return "appraisal_owner";
}

function daysBetween(start: string, end: string) {
  return Math.ceil((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
