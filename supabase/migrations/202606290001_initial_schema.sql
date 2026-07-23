create extension if not exists pgcrypto;

create type public.organization_type as enum ('appraisal_firm', 'solo_appraiser', 'amc', 'lender_client');
create type public.member_status as enum ('invited', 'active', 'suspended');
create type public.vendor_status as enum ('invited', 'pending_documents', 'under_review', 'approved', 'suspended', 'inactive');
create type public.order_status as enum (
  'New',
  'Unassigned',
  'Assigned',
  'Accepted',
  'Inspection Scheduled',
  'Inspected',
  'Report In Progress',
  'Submitted',
  'In Review',
  'Revisions Needed',
  'Revision Sent to Appraiser',
  'Ready for Delivery',
  'Delivered',
  'Completed',
  'On Hold',
  'Cancelled'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type public.organization_type not null,
  logo_url text,
  brand_color text default '#2276d2',
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  system_key text,
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.permissions (
  key text primary key,
  label text not null,
  group_name text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  enabled boolean not null default false,
  primary key (role_id, permission_key)
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role_id uuid references public.roles(id),
  status public.member_status not null default 'invited',
  manager_member_id uuid references public.organization_members(id),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null,
  role_id uuid references public.roles(id),
  invited_by uuid references public.user_profiles(id),
  vendor_profile_id uuid,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'lender',
  primary_contact text,
  email text,
  phone text,
  billing_terms text,
  client_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.appraiser_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id),
  display_name text not null,
  license_number text,
  license_state text,
  license_expires_at date,
  eo_expires_at date,
  default_split_percent numeric(5,2),
  coverage_summary text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id),
  file_number text not null,
  product_type text not null,
  borrower_name text not null,
  subject_address text not null,
  city text not null,
  state text not null,
  zip text not null,
  county text not null,
  loan_type text,
  occupancy text,
  property_type text,
  ordered_at timestamptz not null default now(),
  due_at timestamptz,
  inspection_at timestamptz,
  status public.order_status not null default 'New',
  priority text not null default 'Standard',
  fee numeric(12,2) not null default 0,
  tech_fee numeric(12,2) not null default 0,
  appraiser_payout numeric(12,2) not null default 0,
  next_action text,
  created_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now(),
  unique (organization_id, file_number)
);

create table public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id),
  reviewer_user_id uuid references public.user_profiles(id),
  assigned_by uuid references public.user_profiles(id),
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid references public.user_profiles(id),
  visibility text not null default 'internal',
  body text not null,
  created_at timestamptz not null default now()
);

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  uploaded_by uuid references public.user_profiles(id),
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.user_profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.review_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  product_type text,
  client_id uuid references public.clients(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.review_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.review_checklists(id) on delete cascade,
  category text not null,
  label text not null,
  required boolean not null default true,
  sort_order integer not null default 0
);

create table public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  checklist_id uuid references public.review_checklists(id),
  reviewer_id uuid references public.user_profiles(id),
  status text not null default 'open',
  checklist_state jsonb not null default '{}'::jsonb,
  reviewer_notes text,
  approved_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  review_id uuid references public.order_reviews(id) on delete cascade,
  requested_by uuid references public.user_profiles(id),
  assigned_to uuid references public.user_profiles(id),
  body text not null,
  status text not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  entry_type text not null,
  amount numeric(12,2) not null,
  memo text,
  posted_at timestamptz not null default now()
);

create table public.appraiser_payouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id),
  order_id uuid references public.orders(id),
  amount numeric(12,2) not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id),
  invoice_number text not null,
  amount numeric(12,2) not null,
  status text not null default 'draft',
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  amc_organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_organization_id uuid references public.organizations(id) on delete set null,
  company_name text not null,
  contact_name text,
  contact_email text,
  phone text,
  status public.vendor_status not null default 'invited',
  specialties text[] not null default '{}',
  turn_time_days integer,
  capacity integer,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.invitations
  add constraint invitations_vendor_profile_id_fkey foreign key (vendor_profile_id) references public.vendor_profiles(id) on delete set null;

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  expires_at date,
  approval_status text not null default 'pending',
  uploaded_at timestamptz not null default now()
);

create table public.coverage_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete cascade,
  vendor_profile_id uuid references public.vendor_profiles(id) on delete cascade,
  state text not null,
  county text,
  city text,
  zip text,
  radius_miles integer,
  product_types text[] not null default '{}'
);

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_template_id uuid not null references public.workflow_templates(id) on delete cascade,
  name text not null,
  sort_order integer not null,
  required_fields text[] not null default '{}',
  required_documents text[] not null default '{}',
  trigger_notifications boolean not null default true,
  trigger_accounting_event boolean not null default false
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.user_profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.roles r on r.id = om.role_id
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and coalesce(r.system_key, r.name) in ('super_admin', 'company_admin', 'amc_admin')
  );
$$;

create or replace function public.has_permission(target_organization_id uuid, target_permission text)
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
      and rp.permission_key = target_permission
      and rp.enabled = true
  );
$$;

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.clients enable row level security;
alter table public.appraiser_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_assignments enable row level security;
alter table public.order_notes enable row level security;
alter table public.order_documents enable row level security;
alter table public.order_status_history enable row level security;
alter table public.review_checklists enable row level security;
alter table public.review_checklist_items enable row level security;
alter table public.order_reviews enable row level security;
alter table public.revision_requests enable row level security;
alter table public.accounting_entries enable row level security;
alter table public.appraiser_payouts enable row level security;
alter table public.invoices enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.coverage_areas enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.automation_rules enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

create policy "members can read organizations" on public.organizations for select using (public.is_org_member(id));
create policy "admins can update organizations" on public.organizations for update using (public.is_org_admin(id));

create policy "users can read own profile" on public.user_profiles for select using (id = auth.uid());
create policy "members can read peer profiles" on public.user_profiles for select using (
  exists (
    select 1
    from public.organization_members mine
    join public.organization_members peer on peer.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and peer.user_id = user_profiles.id
      and mine.status = 'active'
  )
);
create policy "users can update own profile" on public.user_profiles for update using (id = auth.uid());

create policy "authenticated can read permissions" on public.permissions for select to authenticated using (true);

create policy "members can read roles" on public.roles for select using (public.is_org_member(organization_id));
create policy "admins can manage roles" on public.roles for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "members can read role permissions" on public.role_permissions for select using (
  exists (select 1 from public.roles r where r.id = role_permissions.role_id and public.is_org_member(r.organization_id))
);
create policy "admins can manage role permissions" on public.role_permissions for all using (
  exists (select 1 from public.roles r where r.id = role_permissions.role_id and public.is_org_admin(r.organization_id))
) with check (
  exists (select 1 from public.roles r where r.id = role_permissions.role_id and public.is_org_admin(r.organization_id))
);

create policy "members can read members" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "admins can manage members" on public.organization_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "admins can manage invitations" on public.invitations for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "members can read clients" on public.clients for select using (public.is_org_member(organization_id));
create policy "permitted users can manage clients" on public.clients for all using (public.has_permission(organization_id, 'manage_clients')) with check (public.has_permission(organization_id, 'manage_clients'));

create policy "members can read appraisers" on public.appraiser_profiles for select using (public.is_org_member(organization_id));
create policy "admins can manage appraisers" on public.appraiser_profiles for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "members can read orders" on public.orders for select using (public.is_org_member(organization_id));
create policy "permitted users can create orders" on public.orders for insert with check (public.has_permission(organization_id, 'create_orders'));
create policy "permitted users can update orders" on public.orders for update using (public.has_permission(organization_id, 'assign_orders') or public.has_permission(organization_id, 'edit_due_dates'));

create policy "members can read tenant accounting" on public.accounting_entries for select using (public.has_permission(organization_id, 'see_accounting'));
create policy "members can read payouts" on public.appraiser_payouts for select using (public.has_permission(organization_id, 'see_appraiser_payouts'));
create policy "members can read invoices" on public.invoices for select using (public.has_permission(organization_id, 'see_accounting'));

create policy "members can read checklists" on public.review_checklists for select using (public.is_org_member(organization_id));
create policy "reviewers can manage checklists" on public.review_checklists for all using (public.has_permission(organization_id, 'review_reports')) with check (public.has_permission(organization_id, 'review_reports'));

create policy "members can read workflows" on public.workflow_templates for select using (public.is_org_member(organization_id));
create policy "workflow managers can manage templates" on public.workflow_templates for all using (public.has_permission(organization_id, 'manage_workflows')) with check (public.has_permission(organization_id, 'manage_workflows'));

create policy "members can read automations" on public.automation_rules for select using (public.is_org_member(organization_id));
create policy "workflow managers can manage automations" on public.automation_rules for all using (public.has_permission(organization_id, 'manage_workflows')) with check (public.has_permission(organization_id, 'manage_workflows'));

create policy "members can read audit logs" on public.audit_logs for select using (public.is_org_member(organization_id));
create policy "members can read notifications" on public.notifications for select using (user_id = auth.uid() and public.is_org_member(organization_id));
create policy "users can update own notifications" on public.notifications for update using (user_id = auth.uid());

create policy "members can read vendor profiles" on public.vendor_profiles for select using (public.is_org_member(amc_organization_id) or public.is_org_member(vendor_organization_id));
create policy "amc admins can manage vendor profiles" on public.vendor_profiles for all using (public.has_permission(amc_organization_id, 'approve_vendors')) with check (public.has_permission(amc_organization_id, 'approve_vendors'));

create policy "members can read vendor documents" on public.vendor_documents for select using (
  exists (
    select 1 from public.vendor_profiles vp
    where vp.id = vendor_documents.vendor_profile_id
      and (public.is_org_member(vp.amc_organization_id) or public.is_org_member(vp.vendor_organization_id))
  )
);

create policy "members can read coverage" on public.coverage_areas for select using (
  public.is_org_member(organization_id)
  or exists (select 1 from public.vendor_profiles vp where vp.id = coverage_areas.vendor_profile_id and public.is_org_member(vp.amc_organization_id))
);

create policy "order children readable by order members" on public.order_assignments for select using (exists (select 1 from public.orders o where o.id = order_assignments.order_id and public.is_org_member(o.organization_id)));
create policy "order notes readable by order members" on public.order_notes for select using (exists (select 1 from public.orders o where o.id = order_notes.order_id and public.is_org_member(o.organization_id)));
create policy "order documents readable by order members" on public.order_documents for select using (exists (select 1 from public.orders o where o.id = order_documents.order_id and public.is_org_member(o.organization_id)));
create policy "status history readable by order members" on public.order_status_history for select using (exists (select 1 from public.orders o where o.id = order_status_history.order_id and public.is_org_member(o.organization_id)));
create policy "reviews readable by order members" on public.order_reviews for select using (exists (select 1 from public.orders o where o.id = order_reviews.order_id and public.is_org_member(o.organization_id)));
create policy "revisions readable by order members" on public.revision_requests for select using (exists (select 1 from public.orders o where o.id = revision_requests.order_id and public.is_org_member(o.organization_id)));

create policy "checklist items readable through checklist" on public.review_checklist_items for select using (exists (select 1 from public.review_checklists rc where rc.id = review_checklist_items.checklist_id and public.is_org_member(rc.organization_id)));
create policy "workflow steps readable through template" on public.workflow_steps for select using (exists (select 1 from public.workflow_templates wt where wt.id = workflow_steps.workflow_template_id and public.is_org_member(wt.organization_id)));
