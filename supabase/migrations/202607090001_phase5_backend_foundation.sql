create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid;
$$;

create or replace function public.has_any_permission(target_organization_id uuid, target_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.role_permissions rp on rp.role_id = om.role_id
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and rp.permission_key = any(target_permissions)
      and rp.enabled = true
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.organizations
  add column if not exists status text not null default 'active',
  add column if not exists primary_contact text,
  add column if not exists email citext,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_profiles
  add column if not exists active boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.organization_members
  add column if not exists title text,
  add column if not exists permission_overrides jsonb not null default '{}'::jsonb,
  add column if not exists invited_by uuid references public.user_profiles(id),
  add column if not exists last_active_at timestamptz,
  add column if not exists deactivated_at timestamptz;

alter table public.invitations
  add column if not exists invited_name text,
  add column if not exists status text not null default 'pending',
  add column if not exists permission_overrides jsonb not null default '{}'::jsonb,
  add column if not exists note text;

alter table public.clients
  add column if not exists status text not null default 'active',
  add column if not exists billing_email citext,
  add column if not exists default_turn_days integer,
  add column if not exists notes text,
  add column if not exists inactive_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.appraiser_profiles
  add column if not exists role text not null default 'Staff',
  add column if not exists email citext,
  add column if not exists phone text,
  add column if not exists capacity integer,
  add column if not exists active_orders integer not null default 0,
  add column if not exists due_this_week integer not null default 0,
  add column if not exists avg_turn_days numeric(6,2),
  add column if not exists revision_rate numeric(6,2),
  add column if not exists payout_due numeric(12,2) not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  add column if not exists appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  add column if not exists reviewer_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists access_info text,
  add column if not exists assignment_preference text,
  add column if not exists lender_contact text,
  add column if not exists parcel_number text,
  add column if not exists commission_split_override numeric(5,2),
  add column if not exists accounting_status text not null default 'unbilled',
  add column if not exists paid_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists source text not null default 'manual',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_activity_at timestamptz not null default now();

alter table public.order_assignments
  add column if not exists note text,
  add column if not exists status text not null default 'assigned',
  add column if not exists superseded_at timestamptz;

alter table public.order_documents
  add column if not exists status text not null default 'Ready',
  add column if not exists file_size_bytes bigint,
  add column if not exists content_type text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.user_profiles(id);

alter table public.order_reviews
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists risk_score integer,
  add column if not exists updated_at timestamptz not null default now();

alter table public.accounting_entries
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  add column if not exists product_type text,
  add column if not exists county text,
  add column if not exists completed_at date,
  add column if not exists fee numeric(12,2),
  add column if not exists tech_fee numeric(12,2),
  add column if not exists commission_split numeric(5,2),
  add column if not exists appraiser_split numeric(12,2),
  add column if not exists company_revenue numeric(12,2),
  add column if not exists status text not null default 'Unpaid',
  add column if not exists month text,
  add column if not exists paid_at timestamptz;

alter table public.appraiser_payouts
  add column if not exists gross_fee numeric(12,2),
  add column if not exists tech_fee numeric(12,2),
  add column if not exists commission_split numeric(5,2),
  add column if not exists company_revenue numeric(12,2),
  add column if not exists marked_paid_by uuid references public.user_profiles(id),
  add column if not exists notes text;

alter table public.invoices
  add column if not exists order_count integer not null default 0,
  add column if not exists sent_at timestamptz;

alter table public.vendor_profiles
  add column if not exists workload integer,
  add column if not exists rating numeric(3,2),
  add column if not exists office_address text,
  add column if not exists coverage_zips text[] not null default '{}',
  add column if not exists radius_miles integer,
  add column if not exists roster text[] not null default '{}',
  add column if not exists fee_sheet jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.notifications
  add column if not exists action_url text,
  add column if not exists dismissed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  title text,
  email citext,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_fee_defaults (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  product_type text not null,
  fee numeric(12,2) not null,
  turn_time_days integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, product_type)
);

create table if not exists public.order_form_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  owner_type text not null check (owner_type in ('default', 'company', 'solo_appraiser')),
  name text not null,
  description text,
  is_default boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_form_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.order_form_templates(id) on delete cascade,
  title text not null,
  hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_form_template_fields (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.order_form_template_sections(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  placeholder text,
  help_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete cascade,
  google_connected boolean not null default false,
  google_calendar_id text,
  sync_inspections boolean not null default true,
  sync_due_dates boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, appraiser_profile_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  event_type text not null check (event_type in ('inspection', 'due_date', 'workload', 'internal')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  notes text,
  google_event_id text,
  sync_status text not null default 'local_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  vendor_profile_id uuid references public.vendor_profiles(id) on delete set null,
  uploaded_by uuid references public.user_profiles(id),
  name text not null,
  document_type text not null,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  visibility text not null default 'internal',
  status text not null default 'Ready',
  content_type text,
  file_size_bytes bigint,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.order_reviews(id) on delete cascade,
  category text not null,
  label text not null,
  complete boolean not null default false,
  severity text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  total_gross_fee numeric(12,2) not null default 0,
  total_tech_fee numeric(12,2) not null default 0,
  total_payout numeric(12,2) not null default 0,
  created_by uuid references public.user_profiles(id),
  marked_paid_by uuid references public.user_profiles(id),
  marked_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  gross_fee numeric(12,2) not null,
  tech_fee numeric(12,2) not null default 0,
  commission_split numeric(5,2) not null,
  payout_amount numeric(12,2) not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.accounting_payment_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  paid_by uuid references public.user_profiles(id),
  memo text,
  created_at timestamptz not null default now()
);

insert into public.permissions (key, label, group_name) values
  ('view_own_orders_only', 'View own orders only', 'Orders'),
  ('invite_users', 'canInviteUsers', 'Company users'),
  ('manage_company_users', 'canManageCompanyUsers', 'Company users'),
  ('manage_accounting', 'canManageAccounting', 'Accounting'),
  ('customize_order_forms', 'canCustomizeOrderForms', 'Order intake')
on conflict (key) do update set label = excluded.label, group_name = excluded.group_name;

create index if not exists organizations_status_idx on public.organizations (status);
create index if not exists organization_members_user_idx on public.organization_members (user_id, status);
create index if not exists clients_organization_status_idx on public.clients (organization_id, status);
create index if not exists client_contacts_client_idx on public.client_contacts (client_id);
create index if not exists client_fee_defaults_client_idx on public.client_fee_defaults (client_id, active);
create index if not exists appraiser_profiles_org_active_idx on public.appraiser_profiles (organization_id, active);
create index if not exists orders_org_status_due_idx on public.orders (organization_id, status, due_at);
create index if not exists orders_appraiser_idx on public.orders (appraiser_profile_id, due_at);
create index if not exists order_notes_order_idx on public.order_notes (order_id, created_at desc);
create index if not exists order_documents_order_idx on public.order_documents (order_id, created_at desc);
create index if not exists documents_org_order_idx on public.documents (organization_id, order_id);
create index if not exists calendar_events_org_start_idx on public.calendar_events (organization_id, starts_at);
create index if not exists accounting_entries_org_completed_idx on public.accounting_entries (organization_id, completed_at);
create index if not exists payroll_runs_org_period_idx on public.payroll_runs (organization_id, period_start, period_end);
create index if not exists payroll_run_items_run_idx on public.payroll_run_items (payroll_run_id);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();

drop trigger if exists client_contacts_set_updated_at on public.client_contacts;
create trigger client_contacts_set_updated_at before update on public.client_contacts for each row execute function public.set_updated_at();

drop trigger if exists client_fee_defaults_set_updated_at on public.client_fee_defaults;
create trigger client_fee_defaults_set_updated_at before update on public.client_fee_defaults for each row execute function public.set_updated_at();

drop trigger if exists appraiser_profiles_set_updated_at on public.appraiser_profiles;
create trigger appraiser_profiles_set_updated_at before update on public.appraiser_profiles for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

drop trigger if exists order_reviews_set_updated_at on public.order_reviews;
create trigger order_reviews_set_updated_at before update on public.order_reviews for each row execute function public.set_updated_at();

drop trigger if exists vendor_profiles_set_updated_at on public.vendor_profiles;
create trigger vendor_profiles_set_updated_at before update on public.vendor_profiles for each row execute function public.set_updated_at();

drop trigger if exists order_form_templates_set_updated_at on public.order_form_templates;
create trigger order_form_templates_set_updated_at before update on public.order_form_templates for each row execute function public.set_updated_at();

drop trigger if exists order_form_template_sections_set_updated_at on public.order_form_template_sections;
create trigger order_form_template_sections_set_updated_at before update on public.order_form_template_sections for each row execute function public.set_updated_at();

drop trigger if exists order_form_template_fields_set_updated_at on public.order_form_template_fields;
create trigger order_form_template_fields_set_updated_at before update on public.order_form_template_fields for each row execute function public.set_updated_at();

drop trigger if exists calendar_preferences_set_updated_at on public.calendar_preferences;
create trigger calendar_preferences_set_updated_at before update on public.calendar_preferences for each row execute function public.set_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

drop trigger if exists order_review_items_set_updated_at on public.order_review_items;
create trigger order_review_items_set_updated_at before update on public.order_review_items for each row execute function public.set_updated_at();

drop trigger if exists payroll_runs_set_updated_at on public.payroll_runs;
create trigger payroll_runs_set_updated_at before update on public.payroll_runs for each row execute function public.set_updated_at();

alter table public.client_contacts enable row level security;
alter table public.client_fee_defaults enable row level security;
alter table public.order_form_templates enable row level security;
alter table public.order_form_template_sections enable row level security;
alter table public.order_form_template_fields enable row level security;
alter table public.calendar_preferences enable row level security;
alter table public.calendar_events enable row level security;
alter table public.documents enable row level security;
alter table public.order_review_items enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_run_items enable row level security;
alter table public.accounting_payment_history enable row level security;

create policy "members can read client contacts" on public.client_contacts for select using (public.is_org_member(organization_id));
create policy "client managers can manage contacts" on public.client_contacts for all using (public.has_permission(organization_id, 'manage_clients')) with check (public.has_permission(organization_id, 'manage_clients'));

create policy "members can read client fee defaults" on public.client_fee_defaults for select using (public.is_org_member(organization_id));
create policy "client managers can manage fee defaults" on public.client_fee_defaults for all using (public.has_permission(organization_id, 'manage_clients')) with check (public.has_permission(organization_id, 'manage_clients'));

create policy "members can read intake templates" on public.order_form_templates for select using (organization_id is null or public.is_org_member(organization_id));
create policy "permitted users can manage intake templates" on public.order_form_templates for all using (organization_id is not null and public.has_permission(organization_id, 'customize_order_forms')) with check (organization_id is not null and public.has_permission(organization_id, 'customize_order_forms'));

create policy "members can read intake sections" on public.order_form_template_sections for select using (
  exists (
    select 1 from public.order_form_templates oft
    where oft.id = order_form_template_sections.template_id
      and (oft.organization_id is null or public.is_org_member(oft.organization_id))
  )
);
create policy "permitted users can manage intake sections" on public.order_form_template_sections for all using (
  exists (
    select 1 from public.order_form_templates oft
    where oft.id = order_form_template_sections.template_id
      and oft.organization_id is not null
      and public.has_permission(oft.organization_id, 'customize_order_forms')
  )
) with check (
  exists (
    select 1 from public.order_form_templates oft
    where oft.id = order_form_template_sections.template_id
      and oft.organization_id is not null
      and public.has_permission(oft.organization_id, 'customize_order_forms')
  )
);

create policy "members can read intake fields" on public.order_form_template_fields for select using (
  exists (
    select 1
    from public.order_form_template_sections section
    join public.order_form_templates template on template.id = section.template_id
    where section.id = order_form_template_fields.section_id
      and (template.organization_id is null or public.is_org_member(template.organization_id))
  )
);
create policy "permitted users can manage intake fields" on public.order_form_template_fields for all using (
  exists (
    select 1
    from public.order_form_template_sections section
    join public.order_form_templates template on template.id = section.template_id
    where section.id = order_form_template_fields.section_id
      and template.organization_id is not null
      and public.has_permission(template.organization_id, 'customize_order_forms')
  )
) with check (
  exists (
    select 1
    from public.order_form_template_sections section
    join public.order_form_templates template on template.id = section.template_id
    where section.id = order_form_template_fields.section_id
      and template.organization_id is not null
      and public.has_permission(template.organization_id, 'customize_order_forms')
  )
);

create policy "members can read calendar preferences" on public.calendar_preferences for select using (public.is_org_member(organization_id));
create policy "admins can manage calendar preferences" on public.calendar_preferences for all using (public.has_any_permission(organization_id, array['manage_company_users', 'manage_workflows', 'customize_order_forms'])) with check (public.has_any_permission(organization_id, array['manage_company_users', 'manage_workflows', 'customize_order_forms']));

create policy "members can read calendar events" on public.calendar_events for select using (public.is_org_member(organization_id));
create policy "order managers can manage calendar events" on public.calendar_events for all using (public.has_any_permission(organization_id, array['create_orders', 'assign_orders', 'edit_due_dates'])) with check (public.has_any_permission(organization_id, array['create_orders', 'assign_orders', 'edit_due_dates']));

create policy "members can read documents" on public.documents for select using (public.is_org_member(organization_id));
create policy "document users can manage documents" on public.documents for all using (public.has_permission(organization_id, 'upload_documents')) with check (public.has_permission(organization_id, 'upload_documents'));

create policy "reviewers can read review items" on public.order_review_items for select using (
  exists (
    select 1
    from public.order_reviews review
    join public.orders order_record on order_record.id = review.order_id
    where review.id = order_review_items.review_id
      and public.is_org_member(order_record.organization_id)
  )
);
create policy "reviewers can manage review items" on public.order_review_items for all using (
  exists (
    select 1
    from public.order_reviews review
    join public.orders order_record on order_record.id = review.order_id
    where review.id = order_review_items.review_id
      and public.has_permission(order_record.organization_id, 'review_reports')
  )
) with check (
  exists (
    select 1
    from public.order_reviews review
    join public.orders order_record on order_record.id = review.order_id
    where review.id = order_review_items.review_id
      and public.has_permission(order_record.organization_id, 'review_reports')
  )
);

create policy "accounting users can read payroll runs" on public.payroll_runs for select using (public.has_any_permission(organization_id, array['see_accounting', 'manage_accounting']));
create policy "accounting managers can manage payroll runs" on public.payroll_runs for all using (public.has_permission(organization_id, 'manage_accounting')) with check (public.has_permission(organization_id, 'manage_accounting'));

create policy "accounting users can read payroll items" on public.payroll_run_items for select using (public.has_any_permission(organization_id, array['see_accounting', 'manage_accounting', 'see_appraiser_payouts']));
create policy "accounting managers can manage payroll items" on public.payroll_run_items for all using (public.has_permission(organization_id, 'manage_accounting')) with check (public.has_permission(organization_id, 'manage_accounting'));

create policy "accounting users can read payment history" on public.accounting_payment_history for select using (public.has_any_permission(organization_id, array['see_accounting', 'manage_accounting', 'see_appraiser_payouts']));
create policy "accounting managers can manage payment history" on public.accounting_payment_history for all using (public.has_permission(organization_id, 'manage_accounting')) with check (public.has_permission(organization_id, 'manage_accounting'));

create policy "order managers can manage assignments" on public.order_assignments for all using (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_assignments.order_id
      and public.has_permission(order_record.organization_id, 'assign_orders')
  )
) with check (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_assignments.order_id
      and public.has_permission(order_record.organization_id, 'assign_orders')
  )
);

create policy "order members can create notes" on public.order_notes for insert with check (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_notes.order_id
      and public.is_org_member(order_record.organization_id)
  )
);

create policy "document users can manage order documents" on public.order_documents for all using (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_documents.order_id
      and public.has_permission(order_record.organization_id, 'upload_documents')
  )
) with check (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_documents.order_id
      and public.has_permission(order_record.organization_id, 'upload_documents')
  )
);

create policy "order managers can create status history" on public.order_status_history for insert with check (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_status_history.order_id
      and public.has_any_permission(order_record.organization_id, array['create_orders', 'assign_orders', 'edit_due_dates'])
  )
);

create policy "reviewers can manage order reviews" on public.order_reviews for all using (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_reviews.order_id
      and public.has_permission(order_record.organization_id, 'review_reports')
  )
) with check (
  exists (
    select 1 from public.orders order_record
    where order_record.id = order_reviews.order_id
      and public.has_permission(order_record.organization_id, 'review_reports')
  )
);

create policy "reviewers can manage revisions" on public.revision_requests for all using (
  exists (
    select 1 from public.orders order_record
    where order_record.id = revision_requests.order_id
      and public.has_permission(order_record.organization_id, 'review_reports')
  )
) with check (
  exists (
    select 1 from public.orders order_record
    where order_record.id = revision_requests.order_id
      and public.has_permission(order_record.organization_id, 'review_reports')
  )
);

create policy "accounting managers can manage entries" on public.accounting_entries for all using (public.has_permission(organization_id, 'manage_accounting')) with check (public.has_permission(organization_id, 'manage_accounting'));
create policy "accounting managers can manage payouts" on public.appraiser_payouts for all using (public.has_permission(organization_id, 'manage_accounting')) with check (public.has_permission(organization_id, 'manage_accounting'));
create policy "accounting managers can manage invoices" on public.invoices for all using (public.has_permission(organization_id, 'manage_accounting')) with check (public.has_permission(organization_id, 'manage_accounting'));
