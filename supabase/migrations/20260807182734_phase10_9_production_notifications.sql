-- Phase 10.9: production notification, email, reminder, and communication history foundation.
-- Additive only: preserves Phase 1-10.8 order, storage, shared-order, review, and delivery behavior.

create table if not exists public.organization_notification_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_enabled boolean not null default false,
  default_due_warning_hours integer[] not null default array[72, 48, 24, 0],
  bid_reminder_hours integer[] not null default array[24, 4],
  assignment_acceptance_hours integer not null default 12,
  inspection_reminder_hours integer[] not null default array[24, 8],
  revision_reminder_hours integer[] not null default array[24, 0],
  invoice_reminder_days integer[] not null default array[7, 1, 0],
  compliance_warning_days integer[] not null default array[60, 30, 14, 7, 0],
  client_receives_inspection_status boolean not null default true,
  client_receives_assignment_identity boolean not null default false,
  client_receives_review_status boolean not null default true,
  clients_receive_delivery_email boolean not null default true,
  copy_office_staff_on_client_events boolean not null default true,
  escalation_recipient_role text not null default 'company_admin',
  reply_to_email citext,
  branding jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.notification_reminder_state (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reminder_key text not null,
  event_type text not null,
  related_order_id uuid references public.orders(id) on delete cascade,
  related_vendor_id uuid references public.vendor_profiles(id) on delete cascade,
  related_invoice_id uuid references public.invoices(id) on delete cascade,
  related_entity_type text,
  related_entity_id uuid,
  first_triggered_at timestamptz not null default now(),
  last_triggered_at timestamptz not null default now(),
  next_eligible_at timestamptz,
  trigger_count integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reminder_key)
);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  event_type text not null,
  channel text not null,
  recipient_user_id uuid references public.user_profiles(id) on delete set null,
  recipient_organization_id uuid references public.organizations(id) on delete set null,
  recipient_role text,
  recipient_email citext,
  visibility_classification text not null default 'internal',
  subject text not null,
  sanitized_message text not null,
  action_url text,
  delivery_status text not null default 'created',
  notification_id uuid references public.notifications(id) on delete set null,
  notification_queue_id uuid references public.notification_queue(id) on delete set null,
  email_delivery_id uuid references public.email_deliveries(id) on delete set null,
  provider_message_id text,
  failure_reason text,
  retry_count integer not null default 0,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (channel in ('in_app', 'email', 'digest', 'system', 'message', 'delivery')),
  check (visibility_classification in ('internal', 'shared', 'client_safe', 'appraiser_safe', 'reviewer_only', 'accounting_restricted', 'security'))
);

alter table public.notifications
  add column if not exists event_type text,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists actor_user_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists recipient_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists recipient_role text,
  add column if not exists channel text not null default 'in_app',
  add column if not exists subject text,
  add column if not exists sanitized_message text,
  add column if not exists priority text not null default 'normal',
  add column if not exists scheduled_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists template_version integer not null default 1,
  add column if not exists visibility_classification text not null default 'internal',
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid,
  add column if not exists requires_action boolean not null default false;

update public.notifications
set
  event_type = coalesce(event_type, type),
  subject = coalesce(subject, title),
  sanitized_message = coalesce(sanitized_message, body)
where event_type is null or subject is null or sanitized_message is null;

alter table public.notification_queue
  add column if not exists event_id uuid,
  add column if not exists recipient_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists action_url text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists template_version integer not null default 1,
  add column if not exists visibility_classification text not null default 'internal',
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid,
  add column if not exists provider_message_id text,
  add column if not exists email_delivery_id uuid references public.email_deliveries(id) on delete set null,
  add column if not exists dedupe_key text,
  add column if not exists requires_action boolean not null default false;

alter table public.email_deliveries
  add column if not exists notification_queue_id uuid references public.notification_queue(id) on delete set null,
  add column if not exists communication_event_id uuid references public.communication_events(id) on delete set null,
  add column if not exists recipient_user_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists recipient_role text,
  add column if not exists visibility_classification text not null default 'internal',
  add column if not exists action_url text,
  add column if not exists template_version integer not null default 1,
  add column if not exists attempt_count integer not null default 1,
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_classification text,
  add column if not exists retry_after timestamptz,
  add column if not exists plaintext_preview text,
  add column if not exists html_preview text;

alter table public.notification_preferences
  add column if not exists mandatory boolean not null default false,
  add column if not exists category text not null default 'system',
  add column if not exists daily_digest_enabled boolean not null default false;

alter table public.notification_templates
  add column if not exists version integer not null default 1,
  add column if not exists category text not null default 'system',
  add column if not exists visibility_classification text not null default 'internal',
  add column if not exists editable_fields jsonb not null default '{}'::jsonb,
  add column if not exists locked_fields text[] not null default array['privacy-controlled-fields'];

create index if not exists organization_notification_settings_org_idx
  on public.organization_notification_settings (organization_id);

create index if not exists notification_reminder_state_org_event_idx
  on public.notification_reminder_state (organization_id, event_type, last_triggered_at desc);

create index if not exists communication_events_org_order_idx
  on public.communication_events (organization_id, order_id, occurred_at desc);

create index if not exists communication_events_recipient_idx
  on public.communication_events (recipient_user_id, occurred_at desc) where recipient_user_id is not null;

create index if not exists notification_queue_dedupe_idx
  on public.notification_queue (organization_id, dedupe_key) where dedupe_key is not null;

create index if not exists notification_queue_scheduled_idx
  on public.notification_queue (organization_id, status, scheduled_at) where scheduled_at is not null;

create index if not exists email_deliveries_queue_idx
  on public.email_deliveries (notification_queue_id) where notification_queue_id is not null;

drop trigger if exists organization_notification_settings_set_updated_at on public.organization_notification_settings;
create trigger organization_notification_settings_set_updated_at
  before update on public.organization_notification_settings
  for each row execute function public.set_updated_at();

drop trigger if exists notification_reminder_state_set_updated_at on public.notification_reminder_state;
create trigger notification_reminder_state_set_updated_at
  before update on public.notification_reminder_state
  for each row execute function public.set_updated_at();

alter table public.organization_notification_settings enable row level security;
alter table public.notification_reminder_state enable row level security;
alter table public.communication_events enable row level security;

drop policy if exists "members can create phase10 notifications" on public.notifications;
create policy "members can create phase10 notifications"
  on public.notifications for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists "members can read phase10 operational notifications" on public.notifications;
create policy "members can read phase10 operational notifications"
  on public.notifications for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_any_permission(organization_id, array['view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
    or (
      public.is_org_member(organization_id)
      and visibility_classification in ('shared', 'client_safe', 'appraiser_safe')
    )
  );

drop policy if exists "members can read organization notification settings" on public.organization_notification_settings;
create policy "members can read organization notification settings"
  on public.organization_notification_settings for select
  to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "notification managers can manage organization notification settings" on public.organization_notification_settings;
create policy "notification managers can manage organization notification settings"
  on public.organization_notification_settings for all
  to authenticated
  using (public.has_any_permission(organization_id, array['manage_notification_settings', 'manage_company_users']))
  with check (public.has_any_permission(organization_id, array['manage_notification_settings', 'manage_company_users']));

drop policy if exists "notification managers can read reminder state" on public.notification_reminder_state;
create policy "notification managers can read reminder state"
  on public.notification_reminder_state for select
  to authenticated
  using (public.has_any_permission(organization_id, array['view_notification_logs', 'manage_notification_settings', 'manage_company_users']));

drop policy if exists "notification services can manage reminder state" on public.notification_reminder_state;
create policy "notification services can manage reminder state"
  on public.notification_reminder_state for all
  to authenticated
  using (public.has_any_permission(organization_id, array['retry_failed_notifications', 'manage_notification_settings', 'manage_company_users']))
  with check (public.has_any_permission(organization_id, array['retry_failed_notifications', 'manage_notification_settings', 'manage_company_users']));

drop policy if exists "participants can read permitted communication history" on public.communication_events;
create policy "participants can read permitted communication history"
  on public.communication_events for select
  to authenticated
  using (
    recipient_user_id = auth.uid()
    or public.has_any_permission(organization_id, array['view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
    or (
      order_id is not null
      and public.is_org_member(organization_id)
      and visibility_classification in ('shared', 'client_safe', 'appraiser_safe')
    )
  );

drop policy if exists "notification services can create communication history" on public.communication_events;
create policy "notification services can create communication history"
  on public.communication_events for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists "notification managers can update communication history" on public.communication_events;
create policy "notification managers can update communication history"
  on public.communication_events for update
  to authenticated
  using (
    recipient_user_id = auth.uid()
    or public.has_any_permission(organization_id, array['retry_failed_notifications', 'view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
  )
  with check (
    recipient_user_id = auth.uid()
    or public.has_any_permission(organization_id, array['retry_failed_notifications', 'view_notification_logs', 'manage_notification_settings', 'manage_company_users'])
  );

-- Make Data API access explicit for new projects while retaining RLS as the row boundary.
grant select, insert, update on public.notifications to authenticated;
grant select, insert, update on public.notification_queue to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notification_templates to authenticated;
grant insert, update on public.notification_templates to authenticated;
grant select, insert, update on public.email_deliveries to authenticated;
grant select, insert, update on public.organization_notification_settings to authenticated;
grant select, insert, update on public.notification_reminder_state to authenticated;
grant select, insert, update on public.communication_events to authenticated;

grant select, insert, update, delete on public.organization_notification_settings to service_role;
grant select, insert, update, delete on public.notification_reminder_state to service_role;
grant select, insert, update, delete on public.communication_events to service_role;

comment on table public.communication_events is
  'Role-aware communication history for notifications, email delivery, messages, assignments, bids, reminders, and report delivery. Payloads must stay sanitized.';

comment on table public.notification_reminder_state is
  'Deduplication state for due-date, assignment, bid, revision, invoice, and compliance reminders so recurring processors do not double-send.';

comment on table public.organization_notification_settings is
  'Organization-level notification defaults. These cannot override CAS privacy and RLS boundaries.';
