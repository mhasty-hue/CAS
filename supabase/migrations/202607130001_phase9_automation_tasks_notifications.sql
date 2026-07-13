alter table public.automation_rules add column if not exists description text;
alter table public.automation_rules add column if not exists enabled boolean not null default false;
alter table public.automation_rules add column if not exists trigger_key text;
alter table public.automation_rules add column if not exists trigger_label text;
alter table public.automation_rules add column if not exists execution_order integer not null default 100;
alter table public.automation_rules add column if not exists last_run_at timestamptz;
alter table public.automation_rules add column if not exists run_count integer not null default 0;
alter table public.automation_rules add column if not exists failure_count integer not null default 0;
alter table public.automation_rules add column if not exists created_by uuid references public.user_profiles(id);
alter table public.automation_rules add column if not exists audit_metadata jsonb not null default '{}'::jsonb;
alter table public.automation_rules add column if not exists archived_at timestamptz;
alter table public.automation_rules add column if not exists updated_at timestamptz not null default now();

update public.automation_rules
set
  trigger_key = coalesce(trigger_key, trigger_event),
  trigger_label = coalesce(trigger_label, trigger_event),
  enabled = coalesce(enabled, active, false)
where trigger_key is null or trigger_label is null;

create table if not exists public.automation_conditions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  field_key text not null,
  operator text not null,
  value text not null default '',
  label text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  action_type text not null,
  target text not null default '',
  value text not null default '',
  label text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  related_order_id uuid references public.orders(id) on delete set null,
  related_task_id uuid,
  related_invoice_id uuid references public.invoices(id) on delete set null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.automation_run_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  action_label text not null,
  status text not null,
  detail text,
  step_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  related_order_id uuid references public.orders(id) on delete set null,
  related_client_id uuid references public.clients(id) on delete set null,
  related_vendor_id uuid references public.vendor_profiles(id) on delete set null,
  related_invoice_id uuid references public.invoices(id) on delete set null,
  title text not null,
  description text,
  assigned_user_id uuid references public.user_profiles(id) on delete set null,
  assigned_role text,
  created_by uuid references public.user_profiles(id) on delete set null,
  due_at timestamptz,
  priority text not null default 'Standard',
  status text not null default 'Open',
  source text not null default 'Manual',
  automation_rule_id uuid references public.automation_rules(id) on delete set null,
  completed_at timestamptz,
  audit_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_runs
  drop constraint if exists automation_runs_related_task_id_fkey;
alter table public.automation_runs
  add constraint automation_runs_related_task_id_fkey foreign key (related_task_id) references public.tasks(id) on delete set null;

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references public.user_profiles(id) on delete set null,
  recipient_role text,
  recipient_email text,
  event_type text not null,
  channel text not null,
  status text not null default 'Pending',
  attempt_count integer not null default 0,
  failure_reason text,
  related_order_id uuid references public.orders(id) on delete set null,
  related_task_id uuid references public.tasks(id) on delete set null,
  related_invoice_id uuid references public.invoices(id) on delete set null,
  related_vendor_id uuid references public.vendor_profiles(id) on delete set null,
  digest_group text,
  subject text not null,
  preview text,
  payload jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

create table if not exists public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  job_type text not null,
  enabled boolean not null default true,
  schedule text not null,
  provider text not null default 'Vercel Cron',
  last_run_at timestamptz,
  next_run_at timestamptz,
  status text not null default 'Idle',
  run_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  event_type text not null,
  status text not null default 'Received',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  related_order_id uuid references public.orders(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  payload_summary text,
  error_message text
);

insert into public.permissions (key, label, group_name) values
  ('view_automations', 'canViewAutomations', 'Automation'),
  ('create_automations', 'canCreateAutomations', 'Automation'),
  ('edit_automations', 'canEditAutomations', 'Automation'),
  ('enable_automations', 'canEnableAutomations', 'Automation'),
  ('view_automation_history', 'canViewAutomationHistory', 'Automation'),
  ('manage_team_tasks', 'canManageTeamTasks', 'Tasks'),
  ('assign_tasks', 'canAssignTasks', 'Tasks'),
  ('view_notification_logs', 'canViewNotificationLogs', 'Notifications'),
  ('retry_failed_notifications', 'canRetryFailedNotifications', 'Notifications')
on conflict (key) do update set label = excluded.label, group_name = excluded.group_name;

create index if not exists automation_rules_org_idx on public.automation_rules(organization_id);
create index if not exists automation_rules_trigger_idx on public.automation_rules(organization_id, trigger_key);
create index if not exists automation_conditions_rule_idx on public.automation_conditions(rule_id);
create index if not exists automation_actions_rule_idx on public.automation_actions(rule_id);
create index if not exists automation_runs_rule_idx on public.automation_runs(rule_id, started_at desc);
create index if not exists automation_run_steps_run_idx on public.automation_run_steps(run_id, step_order);
create index if not exists tasks_org_status_due_idx on public.tasks(organization_id, status, due_at);
create index if not exists tasks_assigned_user_idx on public.tasks(assigned_user_id, status);
create index if not exists notification_queue_org_status_idx on public.notification_queue(organization_id, status, queued_at desc);
create index if not exists notification_queue_recipient_idx on public.notification_queue(recipient_user_id, status);
create index if not exists scheduled_jobs_org_idx on public.scheduled_jobs(organization_id, enabled);
create index if not exists webhook_events_org_received_idx on public.webhook_events(organization_id, received_at desc);

alter table public.automation_conditions enable row level security;
alter table public.automation_actions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_run_steps enable row level security;
alter table public.tasks enable row level security;
alter table public.notification_queue enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "members can read phase9 automation rules" on public.automation_rules;
drop policy if exists "automation users can insert phase9 automation rules" on public.automation_rules;
drop policy if exists "automation editors can update phase9 automation rules" on public.automation_rules;
create policy "members can read phase9 automation rules" on public.automation_rules for select using (public.is_org_member(organization_id));
create policy "automation users can insert phase9 automation rules" on public.automation_rules for insert with check (
  public.has_any_permission(organization_id, array['create_automations', 'edit_automations', 'manage_workflows', 'manage_company_users'])
);
create policy "automation editors can update phase9 automation rules" on public.automation_rules for update using (
  public.has_any_permission(organization_id, array['edit_automations', 'enable_automations', 'manage_workflows', 'manage_company_users'])
) with check (
  public.has_any_permission(organization_id, array['edit_automations', 'enable_automations', 'manage_workflows', 'manage_company_users'])
);

create policy "members can read automation conditions" on public.automation_conditions for select using (public.is_org_member(organization_id));
create policy "automation editors can manage automation conditions" on public.automation_conditions for all using (
  public.has_any_permission(organization_id, array['edit_automations', 'create_automations', 'manage_workflows', 'manage_company_users'])
) with check (
  public.has_any_permission(organization_id, array['edit_automations', 'create_automations', 'manage_workflows', 'manage_company_users'])
);

create policy "members can read automation actions" on public.automation_actions for select using (public.is_org_member(organization_id));
create policy "automation editors can manage automation actions" on public.automation_actions for all using (
  public.has_any_permission(organization_id, array['edit_automations', 'create_automations', 'manage_workflows', 'manage_company_users'])
) with check (
  public.has_any_permission(organization_id, array['edit_automations', 'create_automations', 'manage_workflows', 'manage_company_users'])
);

create policy "members can read automation runs" on public.automation_runs for select using (
  public.has_any_permission(organization_id, array['view_automation_history', 'view_automations', 'manage_workflows', 'manage_company_users'])
);
create policy "automation workers can insert automation runs" on public.automation_runs for insert with check (public.is_org_member(organization_id));

create policy "members can read automation run steps" on public.automation_run_steps for select using (
  public.has_any_permission(organization_id, array['view_automation_history', 'view_automations', 'manage_workflows', 'manage_company_users'])
);
create policy "automation workers can insert automation run steps" on public.automation_run_steps for insert with check (public.is_org_member(organization_id));

create policy "members can read tasks" on public.tasks for select using (public.is_org_member(organization_id));
create policy "members can create tasks" on public.tasks for insert with check (public.is_org_member(organization_id));
create policy "task managers and assignees can update tasks" on public.tasks for update using (
  assigned_user_id = auth.uid()
  or public.has_any_permission(organization_id, array['manage_team_tasks', 'assign_tasks', 'manage_company_users'])
) with check (
  assigned_user_id = auth.uid()
  or public.has_any_permission(organization_id, array['manage_team_tasks', 'assign_tasks', 'manage_company_users'])
);

create policy "members can read notification queue" on public.notification_queue for select using (
  recipient_user_id = auth.uid()
  or public.has_any_permission(organization_id, array['view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
);
create policy "members can insert notification queue" on public.notification_queue for insert with check (public.is_org_member(organization_id));
create policy "notification managers can update queue" on public.notification_queue for update using (
  recipient_user_id = auth.uid()
  or public.has_any_permission(organization_id, array['retry_failed_notifications', 'view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
) with check (
  recipient_user_id = auth.uid()
  or public.has_any_permission(organization_id, array['retry_failed_notifications', 'view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
);

create policy "members can read scheduled jobs" on public.scheduled_jobs for select using (public.is_org_member(organization_id));
create policy "automation editors can manage scheduled jobs" on public.scheduled_jobs for all using (
  public.has_any_permission(organization_id, array['edit_automations', 'enable_automations', 'manage_integrations', 'manage_company_users'])
) with check (
  public.has_any_permission(organization_id, array['edit_automations', 'enable_automations', 'manage_integrations', 'manage_company_users'])
);

create policy "members can read webhook events" on public.webhook_events for select using (
  public.has_any_permission(organization_id, array['view_automations', 'manage_integrations', 'manage_company_users'])
);
create policy "integration workers can insert webhook events" on public.webhook_events for insert with check (public.is_org_member(organization_id));
