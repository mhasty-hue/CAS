create extension if not exists pgcrypto;

create table if not exists public.report_review_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_key text not null,
  name text not null,
  version text not null,
  report_standard text not null,
  required_sections text[] not null default '{}'::text[],
  required_exhibits text[] not null default '{}'::text[],
  rule_ids text[] not null default '{}'::text[],
  ai_review_categories text[] not null default '{}'::text[],
  overlay_ids text[] not null default '{}'::text[],
  effective_from date not null,
  effective_to date,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_key, version)
);

create table if not exists public.report_review_overlays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  overlay_key text not null,
  name text not null,
  scope text not null,
  version text not null,
  rule_ids text[] not null default '{}'::text[],
  effective_from date not null,
  effective_to date,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, overlay_key, version)
);

create table if not exists public.appraisal_report_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  report_submission_id uuid references public.report_submissions(id) on delete set null,
  version_number integer not null,
  profile_key text not null,
  overlay_keys text[] not null default '{}'::text[],
  source_files jsonb not null default '[]'::jsonb,
  original_storage_preserved boolean not null default true,
  immutable boolean not null default true,
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_at timestamptz not null default now(),
  status text not null default 'uploaded',
  extraction_summary text,
  supersedes_report_version_id uuid references public.appraisal_report_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (order_id, version_number)
);

create table if not exists public.normalized_appraisal_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  report_version_id uuid not null unique references public.appraisal_report_versions(id) on delete cascade,
  profile_key text not null,
  extracted_report jsonb not null,
  extraction_provider text not null default 'demo_parser',
  extraction_status text not null default 'extracted',
  extraction_errors text[] not null default '{}'::text[],
  parsed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.report_review_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  report_version_id uuid not null references public.appraisal_report_versions(id) on delete cascade,
  profile_key text not null,
  overlay_keys text[] not null default '{}'::text[],
  run_mode text not null,
  rule_run_version text not null,
  ai_provider_status text not null default 'disabled',
  safety_notice text not null,
  summary jsonb not null default '{}'::jsonb,
  audit_summary text,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_review_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  report_version_id uuid not null references public.appraisal_report_versions(id) on delete cascade,
  review_result_id uuid not null references public.report_review_results(id) on delete cascade,
  rule_id text not null,
  profile_key text not null,
  overlay_key text not null,
  title text not null,
  description text not null,
  category text not null,
  severity text not null,
  status text not null default 'Open',
  evidence jsonb not null default '[]'::jsonb,
  order_evidence jsonb not null default '[]'::jsonb,
  rule_source text not null,
  suggested_resolution text,
  requires_human_judgment boolean not null default true,
  visibility text[] not null default array['internal', 'appraiser']::text[],
  appraiser_response text,
  reviewer_response text,
  resolved_by uuid references public.user_profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_review_finding_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  finding_id uuid not null references public.report_review_findings(id) on delete cascade,
  actor_id uuid references public.user_profiles(id) on delete set null,
  actor_name text not null,
  event_type text not null,
  previous_status text,
  next_status text,
  previous_severity text,
  next_severity text,
  visibility text[] not null default array['internal']::text[],
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_ai_provider_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  provider_key text not null default 'disabled',
  enabled boolean not null default false,
  model_key text,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint report_ai_provider_settings_disabled_without_model
    check (enabled = false or model_key is not null)
);

create index if not exists report_review_profiles_org_status_idx on public.report_review_profiles (organization_id, status);
create index if not exists report_review_overlays_org_status_idx on public.report_review_overlays (organization_id, status);
create index if not exists appraisal_report_versions_order_idx on public.appraisal_report_versions (order_id, version_number desc);
create index if not exists appraisal_report_versions_org_order_idx on public.appraisal_report_versions (organization_id, order_id);
create index if not exists normalized_appraisal_reports_order_idx on public.normalized_appraisal_reports (order_id, report_version_id);
create index if not exists normalized_appraisal_reports_extracted_report_idx on public.normalized_appraisal_reports using gin (extracted_report);
create index if not exists report_review_results_order_idx on public.report_review_results (order_id, created_at desc);
create index if not exists report_review_findings_order_status_idx on public.report_review_findings (order_id, status, severity);
create index if not exists report_review_findings_visibility_idx on public.report_review_findings using gin (visibility);
create index if not exists report_review_finding_events_finding_idx on public.report_review_finding_events (finding_id, created_at desc);

drop trigger if exists report_review_profiles_set_updated_at on public.report_review_profiles;
create trigger report_review_profiles_set_updated_at before update on public.report_review_profiles for each row execute function public.set_updated_at();

drop trigger if exists report_review_overlays_set_updated_at on public.report_review_overlays;
create trigger report_review_overlays_set_updated_at before update on public.report_review_overlays for each row execute function public.set_updated_at();

drop trigger if exists report_review_findings_set_updated_at on public.report_review_findings;
create trigger report_review_findings_set_updated_at before update on public.report_review_findings for each row execute function public.set_updated_at();

drop trigger if exists report_ai_provider_settings_set_updated_at on public.report_ai_provider_settings;
create trigger report_ai_provider_settings_set_updated_at before update on public.report_ai_provider_settings for each row execute function public.set_updated_at();

alter table public.report_review_profiles enable row level security;
alter table public.report_review_overlays enable row level security;
alter table public.appraisal_report_versions enable row level security;
alter table public.normalized_appraisal_reports enable row level security;
alter table public.report_review_results enable row level security;
alter table public.report_review_findings enable row level security;
alter table public.report_review_finding_events enable row level security;
alter table public.report_ai_provider_settings enable row level security;

create policy "members can read review profiles"
  on public.report_review_profiles
  for select
  to authenticated
  using (organization_id is null or app_private.is_org_member(organization_id));

create policy "workflow managers can manage review profiles"
  on public.report_review_profiles
  for all
  to authenticated
  using (organization_id is not null and app_private.has_any_permission(organization_id, array['manage_workflows', 'review_reports', 'manage_company_users']))
  with check (organization_id is not null and app_private.has_any_permission(organization_id, array['manage_workflows', 'review_reports', 'manage_company_users']));

create policy "members can read review overlays"
  on public.report_review_overlays
  for select
  to authenticated
  using (organization_id is null or app_private.is_org_member(organization_id));

create policy "workflow managers can manage review overlays"
  on public.report_review_overlays
  for all
  to authenticated
  using (organization_id is not null and app_private.has_any_permission(organization_id, array['manage_workflows', 'review_reports', 'manage_company_users']))
  with check (organization_id is not null and app_private.has_any_permission(organization_id, array['manage_workflows', 'review_reports', 'manage_company_users']));

create policy "permitted users can read report versions"
  on public.appraisal_report_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = appraisal_report_versions.order_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'upload_order_documents', 'view_internal_documents', 'view_workfile_documents', 'deliver_final_report'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "permitted users can create immutable report versions"
  on public.appraisal_report_versions
  for insert
  to authenticated
  with check (
    immutable = true
    and original_storage_preserved = true
    and exists (
      select 1
      from public.orders order_record
      where order_record.id = appraisal_report_versions.order_id
        and order_record.organization_id = appraisal_report_versions.organization_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'upload_order_documents', 'view_internal_documents', 'view_workfile_documents'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "permitted users can read normalized reports"
  on public.normalized_appraisal_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = normalized_appraisal_reports.order_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents', 'view_workfile_documents', 'deliver_final_report'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "permitted users can create normalized reports"
  on public.normalized_appraisal_reports
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = normalized_appraisal_reports.order_id
        and order_record.organization_id = normalized_appraisal_reports.organization_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'upload_order_documents', 'view_workfile_documents'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "permitted users can read report review results"
  on public.report_review_results
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_results.order_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents', 'view_workfile_documents', 'deliver_final_report'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "permitted users can create report review results"
  on public.report_review_results
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_results.order_id
        and order_record.organization_id = report_review_results.organization_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'upload_order_documents', 'view_workfile_documents'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "role visibility controls report findings"
  on public.report_review_findings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_findings.order_id
        and (
          (
            report_review_findings.visibility && array['internal', 'reviewer']::text[]
            and app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents', 'deliver_final_report'])
          )
          or (
            'appraiser' = any(report_review_findings.visibility)
            and app_private.is_assigned_appraiser_for_order(order_record.id)
          )
          or (
            'client' = any(report_review_findings.visibility)
            and app_private.can_read_order(order_record.id)
          )
        )
    )
  );

create policy "reviewers and assigned appraisers can create findings"
  on public.report_review_findings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_findings.order_id
        and order_record.organization_id = report_review_findings.organization_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents'])
          or (
            app_private.is_assigned_appraiser_for_order(order_record.id)
            and not ('client' = any(report_review_findings.visibility))
          )
        )
    )
  );

create policy "reviewers can manage findings"
  on public.report_review_findings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_findings.order_id
        and app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents'])
    )
  )
  with check (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_findings.order_id
        and order_record.organization_id = report_review_findings.organization_id
        and app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents'])
    )
  );

create policy "permitted users can read finding events"
  on public.report_review_finding_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.report_review_findings finding_record
      where finding_record.id = report_review_finding_events.finding_id
        and finding_record.organization_id = report_review_finding_events.organization_id
        and exists (
          select 1
          from public.orders order_record
          where order_record.id = finding_record.order_id
            and (
              app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents', 'deliver_final_report'])
              or (
                'appraiser' = any(finding_record.visibility)
                and app_private.is_assigned_appraiser_for_order(order_record.id)
              )
              or (
                'client' = any(finding_record.visibility)
                and app_private.can_read_order(order_record.id)
              )
            )
        )
    )
  );

create policy "permitted users can add finding events"
  on public.report_review_finding_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = report_review_finding_events.order_id
        and order_record.organization_id = report_review_finding_events.organization_id
        and (
          app_private.has_any_permission(order_record.organization_id, array['review_reports', 'view_internal_documents'])
          or app_private.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

create policy "workflow managers can read ai provider settings"
  on public.report_ai_provider_settings
  for select
  to authenticated
  using (app_private.has_any_permission(organization_id, array['manage_workflows', 'review_reports', 'manage_integrations', 'manage_company_users']));

create policy "integration managers can manage ai provider settings"
  on public.report_ai_provider_settings
  for all
  to authenticated
  using (app_private.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']))
  with check (app_private.has_any_permission(organization_id, array['manage_integrations', 'manage_company_users']));

grant select on public.report_review_profiles to authenticated;
grant select on public.report_review_overlays to authenticated;
grant select, insert on public.appraisal_report_versions to authenticated;
grant select, insert on public.normalized_appraisal_reports to authenticated;
grant select, insert on public.report_review_results to authenticated;
grant select, insert, update on public.report_review_findings to authenticated;
grant select, insert on public.report_review_finding_events to authenticated;
grant select, insert, update on public.report_ai_provider_settings to authenticated;

comment on table public.appraisal_report_versions is
  'Immutable report-upload records for CAS report ingestion. Original files remain in private document storage and are never overwritten.';
comment on table public.normalized_appraisal_reports is
  'Structured extraction payload with field provenance, confidence, and verification metadata. CAS treats this as QC support, not an appraisal conclusion.';
comment on table public.report_review_findings is
  'Deterministic and future AI-assisted QC findings. Client visibility is opt-in per finding and must remain review controlled.';
comment on table public.report_ai_provider_settings is
  'Organization AI-review provider configuration. Disabled by default; production providers must be server-side and permission checked.';
