create table if not exists public.order_import_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  source_type text not null,
  column_mappings jsonb not null default '[]'::jsonb,
  field_rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.order_import_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  import_template_id uuid references public.order_import_templates(id) on delete set null,
  source_file_name text not null,
  source_content_type text,
  source_size_bytes bigint,
  source_document_id uuid references public.documents(id) on delete set null,
  source_type text not null,
  provider text not null default 'demo',
  extracted_fields jsonb not null default '[]'::jsonb,
  mapping_decisions jsonb not null default '[]'::jsonb,
  duplicate_candidates jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  validation_warnings jsonb not null default '[]'::jsonb,
  confidence numeric(5,4) not null default 0,
  status text not null default 'Draft',
  error_message text,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists order_import_templates_org_idx on public.order_import_templates(organization_id, active);
create index if not exists order_import_templates_client_idx on public.order_import_templates(client_id);
create index if not exists order_import_sessions_org_idx on public.order_import_sessions(organization_id, created_at desc);
create index if not exists order_import_sessions_order_idx on public.order_import_sessions(order_id);
create index if not exists order_import_sessions_status_idx on public.order_import_sessions(organization_id, status);

drop trigger if exists order_import_templates_set_updated_at on public.order_import_templates;
create trigger order_import_templates_set_updated_at before update on public.order_import_templates for each row execute function public.set_updated_at();

drop trigger if exists order_import_sessions_set_updated_at on public.order_import_sessions;
create trigger order_import_sessions_set_updated_at before update on public.order_import_sessions for each row execute function public.set_updated_at();

alter table public.order_import_templates enable row level security;
alter table public.order_import_sessions enable row level security;

create policy "members can read order import templates" on public.order_import_templates for select using (
  public.is_org_member(organization_id)
);
create policy "permitted users can manage order import templates" on public.order_import_templates for all using (
  public.has_any_permission(organization_id, array['customize_order_forms', 'create_orders', 'manage_public_ordering', 'manage_company_users'])
) with check (
  public.has_any_permission(organization_id, array['customize_order_forms', 'create_orders', 'manage_public_ordering', 'manage_company_users'])
);

create policy "members can read order import sessions" on public.order_import_sessions for select using (
  public.is_org_member(organization_id)
);
create policy "order creators can insert import sessions" on public.order_import_sessions for insert with check (
  public.has_any_permission(organization_id, array['create_orders', 'upload_order_documents', 'manage_public_ordering', 'manage_company_users'])
);
create policy "order creators can update import sessions" on public.order_import_sessions for update using (
  public.has_any_permission(organization_id, array['create_orders', 'upload_order_documents', 'manage_public_ordering', 'manage_company_users'])
) with check (
  public.has_any_permission(organization_id, array['create_orders', 'upload_order_documents', 'manage_public_ordering', 'manage_company_users'])
);
