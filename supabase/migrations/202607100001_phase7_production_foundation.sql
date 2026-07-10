alter table public.organizations
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists brand_color text;

create unique index if not exists organizations_slug_idx on public.organizations (slug) where slug is not null;

alter table public.invitations
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists accepted_by uuid references public.user_profiles(id),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.invoices
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists billing_party text,
  add column if not exists bill_to_contact text,
  add column if not exists subtotal numeric(12,2),
  add column if not exists tax_amount numeric(12,2) not null default 0,
  add column if not exists balance_due numeric(12,2),
  add column if not exists payment_terms text,
  add column if not exists notes text,
  add column if not exists draft_at timestamptz,
  add column if not exists issued_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists partial_payment_amount numeric(12,2) not null default 0,
  add column if not exists voided_at timestamptz;

create table if not exists public.public_order_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  public_slug text not null,
  button_label text not null default 'Order an appraisal',
  brand_name text not null,
  brand_color text,
  logo_url text,
  confirmation_message text not null default 'Thank you. We will review your request and contact you shortly.',
  notification_recipients citext[] not null default '{}',
  required_fields text[] not null default '{}',
  custom_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  unique (public_slug)
);

create table if not exists public.public_order_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_name text not null,
  email citext not null,
  phone text,
  property_address text not null,
  property_type text,
  purpose text not null,
  intended_use text,
  owner_borrower_name text,
  access_contact text,
  preferred_contact_method text,
  requested_timing text,
  comments text,
  consent_accepted boolean not null default false,
  document_count integer not null default 0,
  status text not null default 'pending_review',
  converted_order_id uuid references public.orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_order_request_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  public_order_request_id uuid not null references public.public_order_requests(id) on delete cascade,
  file_name text not null,
  storage_bucket text not null default 'public-order-uploads',
  storage_path text not null,
  content_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  event_key text not null,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  cadence text not null default 'immediate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, event_key)
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_key text not null,
  subject text not null,
  preview text,
  body_html text,
  body_text text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_key)
);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  event_key text not null,
  recipient citext not null,
  subject text not null,
  status text not null default 'logged',
  provider text not null default 'development-log',
  provider_message_id text,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  company_address text,
  logo_url text,
  tax_id text,
  invoice_prefix text not null default 'INV',
  next_invoice_number integer not null default 1000,
  default_payment_terms text not null default 'Net 15',
  default_invoice_notes text,
  payment_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  description text,
  quantity numeric(10,2) not null default 1,
  unit_amount numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  line_type text not null default 'Appraisal fee',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  payment_method text,
  reference_number text,
  received_by uuid references public.user_profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  provider_label text not null,
  status text not null default 'not_connected',
  credential_reference text,
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  sync_status text not null default 'idle',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_key)
);

create table if not exists public.integration_mappings (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mapping_type text not null,
  external_key text not null,
  cas_key text not null,
  direction text,
  required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_external_mappings (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  cas_entity_id uuid,
  external_entity_id text not null,
  external_payload jsonb not null default '{}'::jsonb,
  sync_status text not null default 'idle',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  status text not null default 'success',
  detail text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_webhook_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

insert into public.permissions (key, label, group_name) values
  ('view_accounting_summary', 'canViewAccountingSummary', 'Accounting'),
  ('view_full_accounting', 'canViewFullAccounting', 'Accounting'),
  ('prepare_payroll', 'canPreparePayroll', 'Accounting'),
  ('approve_payroll', 'canApprovePayroll', 'Accounting'),
  ('edit_commission_defaults', 'canEditCommissionDefaults', 'Accounting'),
  ('override_order_commission', 'canOverrideOrderCommission', 'Accounting'),
  ('generate_invoices', 'canGenerateInvoices', 'Invoicing'),
  ('edit_invoices', 'canEditInvoices', 'Invoicing'),
  ('mark_invoices_paid', 'canMarkInvoicesPaid', 'Invoicing'),
  ('view_own_pay', 'canViewOwnPay', 'Accounting'),
  ('manage_public_ordering', 'canManagePublicOrdering', 'Public intake'),
  ('manage_notification_settings', 'canManageNotificationSettings', 'Notifications'),
  ('manage_integrations', 'canManageIntegrations', 'Integrations')
on conflict (key) do update set label = excluded.label, group_name = excluded.group_name;

create index if not exists public_order_settings_slug_idx on public.public_order_settings (public_slug, enabled);
create index if not exists public_order_requests_org_status_idx on public.public_order_requests (organization_id, status, submitted_at desc);
create index if not exists notification_preferences_org_event_idx on public.notification_preferences (organization_id, event_key);
create index if not exists email_deliveries_org_created_idx on public.email_deliveries (organization_id, created_at desc);
create index if not exists invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, sort_order);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id, paid_at desc);
create index if not exists integrations_org_provider_idx on public.integrations (organization_id, provider_key);
create index if not exists integration_mappings_integration_idx on public.integration_mappings (integration_id, mapping_type);
create index if not exists integration_external_mappings_lookup_idx on public.integration_external_mappings (integration_id, entity_type, external_entity_id);
create index if not exists integration_logs_org_created_idx on public.integration_logs (organization_id, created_at desc);
create index if not exists integration_webhook_events_org_status_idx on public.integration_webhook_events (organization_id, status, received_at desc);

drop trigger if exists public_order_settings_set_updated_at on public.public_order_settings;
create trigger public_order_settings_set_updated_at before update on public.public_order_settings for each row execute function public.set_updated_at();

drop trigger if exists public_order_requests_set_updated_at on public.public_order_requests;
create trigger public_order_requests_set_updated_at before update on public.public_order_requests for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

drop trigger if exists notification_templates_set_updated_at on public.notification_templates;
create trigger notification_templates_set_updated_at before update on public.notification_templates for each row execute function public.set_updated_at();

drop trigger if exists invoice_settings_set_updated_at on public.invoice_settings;
create trigger invoice_settings_set_updated_at before update on public.invoice_settings for each row execute function public.set_updated_at();

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at before update on public.integrations for each row execute function public.set_updated_at();

drop trigger if exists integration_mappings_set_updated_at on public.integration_mappings;
create trigger integration_mappings_set_updated_at before update on public.integration_mappings for each row execute function public.set_updated_at();

drop trigger if exists integration_external_mappings_set_updated_at on public.integration_external_mappings;
create trigger integration_external_mappings_set_updated_at before update on public.integration_external_mappings for each row execute function public.set_updated_at();

alter table public.public_order_settings enable row level security;
alter table public.public_order_requests enable row level security;
alter table public.public_order_request_documents enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_templates enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.invoice_settings enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_mappings enable row level security;
alter table public.integration_external_mappings enable row level security;
alter table public.integration_logs enable row level security;
alter table public.integration_webhook_events enable row level security;

create policy "public can read enabled order settings" on public.public_order_settings for select using (enabled = true);
create policy "members can read public order settings" on public.public_order_settings for select using (public.is_org_member(organization_id));
create policy "permitted users can manage public order settings" on public.public_order_settings for all using (public.has_any_permission(organization_id, array['manage_public_ordering', 'manage_company_users'])) with check (public.has_any_permission(organization_id, array['manage_public_ordering', 'manage_company_users']));

create policy "public can submit public order requests" on public.public_order_requests for insert with check (consent_accepted = true);
create policy "members can read public order requests" on public.public_order_requests for select using (public.is_org_member(organization_id));
create policy "order users can manage public order requests" on public.public_order_requests for update using (public.has_any_permission(organization_id, array['create_orders', 'assign_orders', 'manage_public_ordering'])) with check (public.has_any_permission(organization_id, array['create_orders', 'assign_orders', 'manage_public_ordering']));

create policy "public can upload public request documents" on public.public_order_request_documents for insert with check (true);
create policy "members can read public request documents" on public.public_order_request_documents for select using (public.is_org_member(organization_id));
create policy "document users can manage public request documents" on public.public_order_request_documents for all using (public.has_permission(organization_id, 'upload_documents')) with check (public.has_permission(organization_id, 'upload_documents'));

create policy "members can read notification preferences" on public.notification_preferences for select using (public.is_org_member(organization_id));
create policy "notification managers can manage preferences" on public.notification_preferences for all using (public.has_any_permission(organization_id, array['manage_notification_settings', 'manage_company_users'])) with check (public.has_any_permission(organization_id, array['manage_notification_settings', 'manage_company_users']));

create policy "members can read notification templates" on public.notification_templates for select using (organization_id is null or public.is_org_member(organization_id));
create policy "notification managers can manage templates" on public.notification_templates for all using (organization_id is not null and public.has_any_permission(organization_id, array['manage_notification_settings', 'manage_company_users'])) with check (organization_id is not null and public.has_any_permission(organization_id, array['manage_notification_settings', 'manage_company_users']));

create policy "members can read email deliveries" on public.email_deliveries for select using (public.is_org_member(organization_id));
create policy "notification services can create email deliveries" on public.email_deliveries for insert with check (public.is_org_member(organization_id));

create policy "accounting users can read invoice settings" on public.invoice_settings for select using (public.has_any_permission(organization_id, array['view_accounting_summary', 'view_full_accounting', 'generate_invoices', 'edit_invoices', 'manage_accounting']));
create policy "invoice managers can manage invoice settings" on public.invoice_settings for all using (public.has_any_permission(organization_id, array['edit_invoices', 'manage_accounting'])) with check (public.has_any_permission(organization_id, array['edit_invoices', 'manage_accounting']));

create policy "invoice users can read line items" on public.invoice_line_items for select using (public.has_any_permission(organization_id, array['view_full_accounting', 'generate_invoices', 'edit_invoices', 'manage_accounting']));
create policy "invoice managers can manage line items" on public.invoice_line_items for all using (public.has_any_permission(organization_id, array['generate_invoices', 'edit_invoices', 'manage_accounting'])) with check (public.has_any_permission(organization_id, array['generate_invoices', 'edit_invoices', 'manage_accounting']));

create policy "invoice users can read payments" on public.invoice_payments for select using (public.has_any_permission(organization_id, array['view_full_accounting', 'mark_invoices_paid', 'manage_accounting']));
create policy "invoice payment managers can manage payments" on public.invoice_payments for all using (public.has_any_permission(organization_id, array['mark_invoices_paid', 'manage_accounting'])) with check (public.has_any_permission(organization_id, array['mark_invoices_paid', 'manage_accounting']));

create policy "integration users can read integrations" on public.integrations for select using (public.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']));
create policy "integration managers can manage integrations" on public.integrations for all using (public.has_permission(organization_id, 'manage_integrations')) with check (public.has_permission(organization_id, 'manage_integrations'));

create policy "integration users can read mappings" on public.integration_mappings for select using (public.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']));
create policy "integration managers can manage mappings" on public.integration_mappings for all using (public.has_permission(organization_id, 'manage_integrations')) with check (public.has_permission(organization_id, 'manage_integrations'));

create policy "integration users can read external mappings" on public.integration_external_mappings for select using (public.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']));
create policy "integration managers can manage external mappings" on public.integration_external_mappings for all using (public.has_permission(organization_id, 'manage_integrations')) with check (public.has_permission(organization_id, 'manage_integrations'));

create policy "integration users can read logs" on public.integration_logs for select using (public.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']));
create policy "integration services can create logs" on public.integration_logs for insert with check (public.has_permission(organization_id, 'manage_integrations'));

create policy "integration users can read webhook events" on public.integration_webhook_events for select using (public.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']));
create policy "integration services can manage webhook events" on public.integration_webhook_events for all using (public.has_permission(organization_id, 'manage_integrations')) with check (public.has_permission(organization_id, 'manage_integrations'));
