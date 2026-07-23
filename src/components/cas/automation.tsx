import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BellRing,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  History,
  ListChecks,
  ListTodo,
  Play,
  RefreshCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AutomationRule,
  AutomationRun,
  NotificationQueueItem,
  Order,
  PortalUser,
  ScheduledJob,
  WebhookEvent,
  WorkflowTask,
  WorkflowTaskStatus
} from "@/types/domain";
import {
  canAssignTasks,
  canCreateAutomations,
  canEditAutomations,
  canEnableAutomations,
  canManageTeamTasks,
  canRetryFailedNotifications,
  canViewAutomationHistory,
  canViewAutomations,
  canViewNotificationLogs
} from "@/lib/permissions";
import { cn, formatDate, priorityTone } from "@/lib/utils";
import { InfoRow, MetricTile, SectionHeader } from "./shared";

const taskViews = ["My Tasks", "Team Tasks", "Overdue", "Due Today", "Due This Week", "Automated Follow-Ups"] as const;
const queueViews = ["All", "Pending", "Failed", "Sent", "Read"] as const;
const demoToday = new Date("2026-07-09T12:00:00-04:00");

function daysFromDemoToday(value: string) {
  const target = new Date(`${value}T12:00:00-04:00`);
  return Math.ceil((target.getTime() - demoToday.getTime()) / 86_400_000);
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDate(value);
}

function taskStatusTone(status: WorkflowTaskStatus) {
  return {
    Open: "border-sky-200 bg-sky-50 text-sky-700",
    "In Progress": "border-amber-200 bg-amber-50 text-amber-800",
    Waiting: "border-violet-200 bg-violet-50 text-violet-700",
    Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Cancelled: "border-slate-200 bg-slate-50 text-slate-500"
  }[status];
}

function queueStatusTone(status: NotificationQueueItem["status"]) {
  return {
    Pending: "border-amber-200 bg-amber-50 text-amber-800",
    Sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Failed: "border-rose-200 bg-rose-50 text-rose-700",
    Read: "border-slate-200 bg-slate-50 text-slate-600"
  }[status];
}

function isTaskVisibleToUser(task: WorkflowTask, user: PortalUser) {
  if (canManageTeamTasks(user)) return true;
  return task.assignedTo === user.name || task.assignedRole === user.role;
}

function relatedLabel(task: WorkflowTask, orderList: Order[]) {
  const order = task.relatedOrderId ? orderList.find((item) => item.id === task.relatedOrderId) : undefined;
  if (order) return `${order.fileNumber} - ${order.borrower}`;
  return task.relatedClient ?? task.relatedVendorId ?? task.relatedInvoiceId ?? "CAS workflow";
}

export function TaskCenterView({
  tasks,
  orderList,
  user,
  onUpdateTaskStatus
}: {
  tasks: WorkflowTask[];
  orderList: Order[];
  user: PortalUser;
  onUpdateTaskStatus: (taskId: string, status: WorkflowTaskStatus) => void;
}) {
  const [activeView, setActiveView] = useState<(typeof taskViews)[number]>("My Tasks");
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? "");
  const visibleTasks = useMemo(() => tasks.filter((task) => isTaskVisibleToUser(task, user)), [tasks, user]);
  const filteredTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const days = daysFromDemoToday(task.dueDate);
      if (activeView === "My Tasks") return task.assignedTo === user.name || task.assignedRole === user.role;
      if (activeView === "Team Tasks") return canManageTeamTasks(user);
      if (activeView === "Overdue") return task.status !== "Completed" && days < 0;
      if (activeView === "Due Today") return task.status !== "Completed" && days === 0;
      if (activeView === "Due This Week") return task.status !== "Completed" && days >= 0 && days <= 7;
      return task.source === "Automation";
    });
  }, [activeView, user, visibleTasks]);
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? visibleTasks[0];
  const openTasks = visibleTasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
  const overdueTasks = openTasks.filter((task) => daysFromDemoToday(task.dueDate) < 0);
  const automatedTasks = visibleTasks.filter((task) => task.source === "Automation");
  const canAssign = canAssignTasks(user);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="grid gap-5">
        <section className="panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
                <ListTodo className="h-4 w-4" />
                Task and Follow-Up Center
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Today&apos;s operational work queue</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Track manual follow-ups, automation-created work, overdue blockers, and role-specific tasks without digging through each order.
              </p>
            </div>
            <div className="grid min-w-[260px] grid-cols-3 gap-2">
              <MetricTile label="Open" value={String(openTasks.length)} />
              <MetricTile label="Overdue" value={String(overdueTasks.length)} />
              <MetricTile label="Automated" value={String(automatedTasks.length)} />
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader icon={ClipboardList} title="Task Views" />
            <div className="flex flex-wrap gap-2">
              {taskViews.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={cn("secondary-button h-9 px-3", activeView === view && "border-brand-200 bg-brand-50 text-brand-700")}
                  onClick={() => setActiveView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-line">
            {filteredTasks.length ? (
              filteredTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={cn("grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 lg:grid-cols-[150px_1fr_auto]", selectedTask?.id === task.id && "bg-brand-50/60")}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("chip border-transparent", priorityTone(task.priority))}>{task.priority}</span>
                    <span className={cn("chip", taskStatusTone(task.status))}>{task.status}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{task.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{relatedLabel(task, orderList)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Assigned to {task.assignedTo} - due {formatDate(task.dueDate)} - {task.source}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {task.status !== "Completed" && (
                      <button className="secondary-button h-9 px-3" type="button" onClick={(event) => { event.stopPropagation(); onUpdateTaskStatus(task.id, "In Progress"); }}>
                        <Play className="h-4 w-4" />
                        Start
                      </button>
                    )}
                    <button className="primary-button h-9 px-3" type="button" onClick={(event) => { event.stopPropagation(); onUpdateTaskStatus(task.id, task.status === "Completed" ? "Open" : "Completed"); }}>
                      <CheckCircle2 className="h-4 w-4" />
                      {task.status === "Completed" ? "Reopen" : "Complete"}
                    </button>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-sm text-slate-500">No tasks match this view. The queue is clear for now.</div>
            )}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-5">
        <section className="panel p-5">
          <SectionHeader icon={ListChecks} title="Selected Task" />
          {selectedTask ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("chip border-transparent", priorityTone(selectedTask.priority))}>{selectedTask.priority}</span>
                  <span className={cn("chip", taskStatusTone(selectedTask.status))}>{selectedTask.status}</span>
                </div>
                <div className="mt-3 text-base font-semibold text-slate-950">{selectedTask.title}</div>
                <p className="mt-2 leading-6 text-slate-600">{selectedTask.description}</p>
              </div>
              <InfoRow label="Related" value={relatedLabel(selectedTask, orderList)} />
              <InfoRow label="Assigned" value={`${selectedTask.assignedTo}${selectedTask.assignedRole ? ` (${selectedTask.assignedRole.replaceAll("_", " ")})` : ""}`} />
              <InfoRow label="Created by" value={selectedTask.createdBy} />
              <InfoRow label="Due" value={formatDate(selectedTask.dueDate)} />
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="secondary-button" type="button" onClick={() => onUpdateTaskStatus(selectedTask.id, "Waiting")}>
                  <AlertTriangle className="h-4 w-4" />
                  Mark waiting
                </button>
                <button className="primary-button" type="button" onClick={() => onUpdateTaskStatus(selectedTask.id, "Completed")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-slate-500">Select a task to see owner, due date, and audit history.</div>
          )}
        </section>

        <section className="panel p-5">
          <SectionHeader icon={History} title="Task Audit" />
          <div className="mt-4 space-y-2">
            {(selectedTask?.auditHistory ?? []).map((event) => (
              <div key={event.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="font-medium text-slate-900">{event.action}</div>
                <div className="mt-1 text-xs text-slate-500">{event.actor} - {event.at}</div>
              </div>
            ))}
            {!selectedTask?.auditHistory.length && <div className="rounded-md border border-dashed border-line p-3 text-sm text-slate-500">No task events yet.</div>}
          </div>
        </section>

        <section className="panel p-5">
          <SectionHeader icon={UserCheck} title="Assignment Controls" />
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">
            {canAssign ? "Team task assignment is available for this role. Phase 9 keeps reassignment local for the demo." : "You can work your own tasks. Team reassignment requires task-management permission."}
          </div>
        </section>
      </aside>
    </section>
  );
}

export function AutomationCenterView({
  rules,
  runs,
  tasks,
  scheduledJobs,
  webhookEvents,
  user,
  onToggleRule,
  onDuplicateRule,
  onArchiveRule,
  onTestRule
}: {
  rules: AutomationRule[];
  runs: AutomationRun[];
  tasks: WorkflowTask[];
  scheduledJobs: ScheduledJob[];
  webhookEvents: WebhookEvent[];
  user: PortalUser;
  onToggleRule: (ruleId: string) => void;
  onDuplicateRule: (ruleId: string) => void;
  onArchiveRule: (ruleId: string) => void;
  onTestRule: (ruleId: string) => void;
}) {
  const activeRules = rules.filter((rule) => !rule.auditMetadata.archived);
  const [selectedRuleId, setSelectedRuleId] = useState(activeRules[0]?.id ?? "");
  const selectedRule = activeRules.find((rule) => rule.id === selectedRuleId) ?? activeRules[0];
  const ruleRuns = selectedRule ? runs.filter((run) => run.ruleId === selectedRule.id) : [];
  const canView = canViewAutomations(user);
  const canCreate = canCreateAutomations(user);
  const canEdit = canEditAutomations(user);
  const canEnable = canEnableAutomations(user);
  const canViewHistory = canViewAutomationHistory(user);
  const enabledCount = activeRules.filter((rule) => rule.enabled).length;
  const failures = activeRules.reduce((total, rule) => total + rule.failureCount, 0);

  if (!canView) {
    return (
      <section className="panel p-6">
        <SectionHeader icon={ShieldCheck} title="Automation Center" />
        <div className="mt-4 rounded-md border border-line bg-slate-50 p-4 text-sm text-slate-600">
          Automation rules are visible to company admins, solo appraisers, and users granted automation permissions.
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <section className="panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
                <Bot className="h-4 w-4" />
                Automation Builder
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Office-friendly workflow automation</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Configure WHEN, IF, THEN rules for routine order movement, reminders, review routing, accounting, and compliance follow-up.
              </p>
            </div>
            <div className="grid min-w-[300px] grid-cols-3 gap-2">
              <MetricTile label="Enabled" value={`${enabledCount}/${activeRules.length}`} />
              <MetricTile label="Runs" value={String(activeRules.reduce((total, rule) => total + rule.runCount, 0))} />
              <MetricTile label="Failures" value={String(failures)} />
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader icon={Workflow} title="Automation Rules" />
            <button type="button" className="primary-button" disabled={!canCreate}>
              <Sparkles className="h-4 w-4" />
              New rule
            </button>
          </div>
          <div className="divide-y divide-line">
            {activeRules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className={cn("grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 lg:grid-cols-[1fr_auto]", selectedRule?.id === rule.id && "bg-brand-50/60")}
                onClick={() => setSelectedRuleId(rule.id)}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("chip", rule.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500")}>{rule.enabled ? "Enabled" : "Paused"}</span>
                    <span className="chip border-slate-200 bg-slate-50 text-slate-600">Order {rule.executionOrder}</span>
                    {rule.failureCount > 0 && <span className="chip border-rose-200 bg-rose-50 text-rose-700">{rule.failureCount} failures</span>}
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-950">{rule.name}</div>
                  <div className="mt-1 text-sm text-slate-600">{rule.description}</div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button className="secondary-button h-9 px-3" type="button" disabled={!canEnable} onClick={(event) => { event.stopPropagation(); onToggleRule(rule.id); }}>
                    <Settings2 className="h-4 w-4" />
                    {rule.enabled ? "Pause" : "Enable"}
                  </button>
                  <button className="secondary-button h-9 px-3" type="button" disabled={!canEdit} onClick={(event) => { event.stopPropagation(); onDuplicateRule(rule.id); }}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <ScheduledJobsPanel jobs={scheduledJobs} />
          <WebhookEventsPanel events={webhookEvents} />
        </section>
      </div>

      <aside className="grid content-start gap-5">
        <section className="panel p-5">
          <SectionHeader icon={Settings2} title="Rule Builder" />
          {selectedRule ? (
            <div className="mt-4 grid gap-4">
              <RuleBlock icon={CalendarClock} label="WHEN" body={selectedRule.triggerLabel} />
              <RuleBlock icon={ListChecks} label="IF" body={selectedRule.conditions.map((condition) => condition.label).join("; ") || "No extra conditions"} />
              <RuleBlock icon={Send} label="THEN" body={selectedRule.actions.map((action) => action.label).join("; ")} />
              <div className="grid gap-2 text-sm">
                <InfoRow label="Created by" value={selectedRule.createdBy} />
                <InfoRow label="Last run" value={selectedRule.lastRunAt ? displayDate(selectedRule.lastRunAt) : "Never"} />
                <InfoRow label="Tasks generated" value={String(tasks.filter((task) => task.automationRuleId === selectedRule.id).length)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="primary-button" type="button" onClick={() => onTestRule(selectedRule.id)}>
                  <Play className="h-4 w-4" />
                  Test sample order
                </button>
                <button className="secondary-button" type="button" disabled={!canEdit} onClick={() => onArchiveRule(selectedRule.id)}>
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-slate-500">Select a rule to inspect its WHEN, IF, THEN setup.</div>
          )}
        </section>

        <section className="panel p-5">
          <SectionHeader icon={History} title="Run History" />
          <div className="mt-4 space-y-3">
            {canViewHistory && ruleRuns.length ? (
              ruleRuns.map((run) => (
                <div key={run.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900">{run.status}</span>
                    <span className="text-xs text-slate-500">{displayDate(run.startedAt)}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {run.steps.map((step) => (
                      <div key={step.id} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className={cn("mt-1 h-2 w-2 rounded-full", step.status === "Success" ? "bg-emerald-500" : step.status === "Failed" ? "bg-rose-500" : "bg-slate-300")} />
                        <span>{step.actionLabel}: {step.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-line p-3 text-sm text-slate-500">
                {canViewHistory ? "No runs recorded for this rule yet." : "Run history requires automation history permission."}
              </div>
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}

function RuleBlock({ icon: Icon, label, body }: { icon: LucideIcon; label: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 leading-6 text-slate-700">{body}</div>
    </div>
  );
}

function ScheduledJobsPanel({ jobs }: { jobs: ScheduledJob[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Activity} title="Scheduled Jobs" />
      <div className="mt-4 space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">{job.name}</span>
              <span className={cn("chip", job.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500")}>{job.enabled ? "Enabled" : "Paused"}</span>
            </div>
            <div className="mt-1 text-slate-500">{job.description}</div>
            <div className="mt-2 text-xs text-slate-500">{job.provider} - {job.schedule}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WebhookEventsPanel({ events }: { events: WebhookEvent[] }) {
  return (
    <section className="panel p-5">
      <SectionHeader icon={RefreshCcw} title="Webhook Foundation" />
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">{event.provider}</span>
              <span className="chip border-slate-200 bg-slate-50 text-slate-600">{event.status}</span>
            </div>
            <div className="mt-1 text-slate-500">{event.payloadSummary}</div>
            <div className="mt-2 text-xs text-slate-500">{event.eventType} - {formatDate(event.receivedAt)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NotificationQueueView({
  queue,
  orderList,
  user,
  onRetry
}: {
  queue: NotificationQueueItem[];
  orderList: Order[];
  user: PortalUser;
  onRetry: (notificationId: string) => void;
}) {
  const [activeView, setActiveView] = useState<(typeof queueViews)[number]>("All");
  const canViewLogs = canViewNotificationLogs(user);
  const canRetry = canRetryFailedNotifications(user);
  const visibleQueue = canViewLogs ? queue : queue.filter((item) => item.recipient === user.name || item.recipientRole === user.role);
  const filteredQueue = activeView === "All" ? visibleQueue : visibleQueue.filter((item) => item.status === activeView);
  const failedCount = visibleQueue.filter((item) => item.status === "Failed").length;
  const pendingCount = visibleQueue.filter((item) => item.status === "Pending").length;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <section className="panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
                <BellRing className="h-4 w-4" />
                Notification Queue
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Demo delivery log and retry queue</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                See in-app, email, and digest notifications that CAS would send, with failed delivery retry controls for permitted roles.
              </p>
            </div>
            <div className="grid min-w-[260px] grid-cols-3 gap-2">
              <MetricTile label="Pending" value={String(pendingCount)} />
              <MetricTile label="Failed" value={String(failedCount)} />
              <MetricTile label="Visible" value={String(visibleQueue.length)} />
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader icon={Send} title="Queue" />
            <div className="flex flex-wrap gap-2">
              {queueViews.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={cn("secondary-button h-9 px-3", activeView === view && "border-brand-200 bg-brand-50 text-brand-700")}
                  onClick={() => setActiveView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line">
            {filteredQueue.length ? (
              filteredQueue.map((item) => {
                const order = item.relatedOrderId ? orderList.find((candidate) => candidate.id === item.relatedOrderId) : undefined;
                return (
                  <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[150px_1fr_auto] lg:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("chip", queueStatusTone(item.status))}>{item.status}</span>
                      <span className="chip border-slate-200 bg-slate-50 text-slate-600">{item.channel}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{item.subject}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.preview}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        To {item.recipient} - {order ? `${order.fileNumber} - ${order.borrower}` : item.relatedInvoiceId ?? item.relatedTaskId ?? "Workflow"} - attempts {item.attemptCount}
                      </div>
                      {item.failureReason && <div className="mt-2 text-xs font-medium text-rose-700">{item.failureReason}</div>}
                    </div>
                    <div className="flex justify-start lg:justify-end">
                      {item.status === "Failed" && (
                        <button type="button" className="primary-button h-9 px-3" disabled={!canRetry} onClick={() => onRetry(item.id)}>
                          <RefreshCcw className="h-4 w-4" />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-sm text-slate-500">No notifications match this filter.</div>
            )}
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-5">
        <section className="panel p-5">
          <SectionHeader icon={Settings2} title="Delivery Rules" />
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-md border border-line bg-slate-50 p-3">
              CAS respects notification preferences before queueing email, in-app, or digest messages.
            </div>
            <InfoRow label="Role visibility" value={canViewLogs ? "Full org queue" : "Own notifications only"} />
            <InfoRow label="Retry permission" value={canRetry ? "Allowed" : "Restricted"} />
          </div>
        </section>

        <section className="panel p-5">
          <SectionHeader icon={BellRing} title="Digest Groups" />
          <div className="mt-4 space-y-2">
            {Array.from(new Set(visibleQueue.map((item) => item.digestGroup).filter(Boolean))).map((group) => (
              <div key={group} className="rounded-md border border-line px-3 py-2 text-sm">
                <div className="font-medium text-slate-900">{group}</div>
                <div className="mt-1 text-xs text-slate-500">{visibleQueue.filter((item) => item.digestGroup === group).length} queued or delivered items</div>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
