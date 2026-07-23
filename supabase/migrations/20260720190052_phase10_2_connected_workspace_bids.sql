create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated, service_role;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  description text,
  audience text not null default 'workspace',
  monthly_price_cents integer not null default 0,
  annual_price_cents integer not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (audience in ('connected', 'workspace', 'enterprise'))
);

create table if not exists public.subscription_plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  entitlement_key text not null,
  enabled boolean not null default true,
  limit_value integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (plan_id, entitlement_key)
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'trial',
  billing_customer_reference text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  cancellation_status text not null default 'none',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('connected_free', 'trial', 'active', 'past_due', 'grace_period', 'cancelled', 'expired')),
  check (cancellation_status in ('none', 'scheduled', 'cancelled', 'retained'))
);

create table if not exists public.organization_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entitlement_key text not null,
  enabled boolean not null default true,
  reason text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, entitlement_key)
);

create table if not exists public.order_participants (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  participant_organization_id uuid references public.organizations(id) on delete cascade,
  participant_user_id uuid references public.user_profiles(id) on delete cascade,
  participant_email text,
  participant_type text not null,
  order_role text not null,
  access_status text not null default 'invited',
  permissions text[] not null default '{}',
  document_visibility text[] not null default '{}',
  message_channels text[] not null default '{}',
  status_visibility text not null default 'client_summary',
  accounting_visibility text not null default 'none',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references public.user_profiles(id) on delete set null,
  accepted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (participant_organization_id is not null or participant_user_id is not null or participant_email is not null),
  check (access_status in ('invited', 'pending_acceptance', 'active', 'accepted', 'declined', 'expired', 'revoked')),
  check (accounting_visibility in ('none', 'own_fee', 'invoice_only', 'full'))
);

create table if not exists public.order_organizations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  relationship_type text not null,
  access_status text not null default 'active',
  is_primary_owner boolean not null default false,
  can_create_internal_workflow boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, organization_id, relationship_type),
  check (access_status in ('active', 'pending_acceptance', 'declined', 'revoked', 'expired'))
);

create table if not exists public.order_access_grants (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  participant_id uuid references public.order_participants(id) on delete cascade,
  grantee_organization_id uuid references public.organizations(id) on delete cascade,
  grantee_user_id uuid references public.user_profiles(id) on delete cascade,
  grant_type text not null,
  allowed_actions text[] not null default '{}',
  allowed_fields text[] not null default '{}',
  denied_fields text[] not null default '{}',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (grantee_organization_id is not null or grantee_user_id is not null or participant_id is not null)
);

create table if not exists public.connected_order_summaries (
  order_id uuid primary key references public.orders(id) on delete cascade,
  owning_organization_id uuid not null references public.organizations(id) on delete cascade,
  client_organization_id uuid references public.organizations(id) on delete set null,
  file_number text not null,
  product_type text not null,
  borrower_name text not null,
  subject_address text not null,
  city text not null,
  state text not null,
  zip text not null,
  county text not null,
  ordered_at timestamptz not null,
  due_at timestamptz,
  inspection_at timestamptz,
  status public.order_status not null,
  priority text not null,
  simplified_status text not null,
  assigned_summary text,
  next_action text,
  delivered_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.order_document_grants (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  grantee_organization_id uuid references public.organizations(id) on delete cascade,
  grantee_user_id uuid references public.user_profiles(id) on delete cascade,
  participant_id uuid references public.order_participants(id) on delete cascade,
  visibility_label text not null,
  access_level text not null default 'read',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, grantee_organization_id, grantee_user_id, visibility_label),
  check (grantee_organization_id is not null or grantee_user_id is not null or participant_id is not null),
  check (access_level in ('read', 'download', 'upload_response', 'manage'))
);

create table if not exists public.order_message_visibility (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  message_id uuid references public.order_messages(id) on delete cascade,
  participant_id uuid references public.order_participants(id) on delete cascade,
  grantee_organization_id uuid references public.organizations(id) on delete cascade,
  grantee_user_id uuid references public.user_profiles(id) on delete cascade,
  channel text not null,
  visibility_label text not null,
  access_level text not null default 'read',
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (message_id is not null or participant_id is not null),
  check (grantee_organization_id is not null or grantee_user_id is not null or participant_id is not null),
  check (access_level in ('read', 'reply', 'manage'))
);

create table if not exists public.county_adjacency (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  county text not null,
  nearby_county text not null,
  adjacency_type text not null default 'bordering',
  estimated_distance_miles numeric(8,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (state, county, nearby_county),
  check (lower(county) <> lower(nearby_county))
);

create table if not exists public.vendor_county_coverage (
  id uuid primary key default gen_random_uuid(),
  managing_organization_id uuid references public.organizations(id) on delete cascade,
  vendor_profile_id uuid references public.vendor_profiles(id) on delete cascade,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete cascade,
  vendor_organization_id uuid references public.organizations(id) on delete set null,
  vendor_user_id uuid references public.user_profiles(id) on delete set null,
  display_name text not null,
  state text not null,
  county text not null,
  coverage_type text not null default 'direct',
  product_types text[] not null default '{}',
  specialties text[] not null default '{}',
  complex_property_capable boolean not null default false,
  rural_capable boolean not null default false,
  approval_status text not null default 'approved',
  license_status text not null default 'current',
  license_expires_at date,
  eo_status text not null default 'current',
  eo_expires_at date,
  w9_status text not null default 'on_file',
  active_status text not null default 'active',
  accepting_work boolean not null default true,
  blocked boolean not null default false,
  current_workload integer not null default 0,
  capacity_limit integer,
  capacity_status text not null default 'balanced',
  avg_turn_days numeric(5,2),
  revision_rate numeric(5,2),
  distance_miles numeric(8,2),
  last_confirmed_at timestamptz,
  confirmed_by uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vendor_profile_id is not null or appraiser_profile_id is not null or vendor_organization_id is not null or vendor_user_id is not null),
  check (coverage_type in ('direct', 'nearby', 'assignment_only')),
  check (approval_status in ('approved', 'pending', 'blocked', 'not_approved')),
  check (license_status in ('current', 'expires_soon', 'expired', 'missing')),
  check (eo_status in ('current', 'expires_soon', 'expired', 'missing')),
  check (w9_status in ('on_file', 'missing', 'expired')),
  check (active_status in ('active', 'suspended', 'inactive')),
  check (capacity_status in ('available', 'balanced', 'busy', 'overloaded'))
);

create table if not exists public.bid_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sending_organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.user_profiles(id) on delete set null,
  subject_address text not null,
  city text not null,
  state text not null,
  county text not null,
  product_type text not null,
  assignment_summary text not null,
  required_credentials text[] not null default '{}',
  required_specialties text[] not null default '{}',
  bid_deadline_at timestamptz not null,
  requested_due_at timestamptz,
  supporting_document_ids uuid[] not null default '{}',
  terms text,
  status text not null default 'draft',
  lock_responses boolean not null default false,
  allow_response_edits boolean not null default true,
  nearby_candidate_mode boolean not null default false,
  awarded_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft', 'open', 'closed', 'awarded', 'cancelled', 'reopened', 'expired'))
);

create table if not exists public.bid_request_recipients (
  id uuid primary key default gen_random_uuid(),
  bid_request_id uuid not null references public.bid_requests(id) on delete cascade,
  recipient_organization_id uuid references public.organizations(id) on delete cascade,
  recipient_user_id uuid references public.user_profiles(id) on delete cascade,
  recipient_email text,
  recipient_name text not null,
  vendor_profile_id uuid references public.vendor_profiles(id) on delete set null,
  appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  coverage_county text,
  coverage_match text not null default 'direct',
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  invitation_status text not null default 'pending',
  invitation_token_hash text,
  email_delivery_id uuid references public.email_deliveries(id) on delete set null,
  sent_at timestamptz,
  delivered_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_organization_id is not null or recipient_user_id is not null or recipient_email is not null),
  check (coverage_match in ('direct', 'nearby', 'manual_assignment_only')),
  check (invitation_status in ('pending', 'sent', 'delivered', 'failed', 'viewed', 'responded', 'declined', 'expired', 'awarded', 'not_selected', 'withdrawn'))
);

create table if not exists public.bid_responses (
  id uuid primary key default gen_random_uuid(),
  bid_request_id uuid not null references public.bid_requests(id) on delete cascade,
  recipient_id uuid not null references public.bid_request_recipients(id) on delete cascade,
  responder_user_id uuid references public.user_profiles(id) on delete set null,
  proposed_fee numeric(12,2),
  turn_time_days integer,
  inspection_availability text,
  notes text,
  alternate_terms text,
  accepted_conditions boolean not null default false,
  response_status text not null default 'submitted',
  decline_reason text,
  decline_explanation text,
  revision_number integer not null default 1,
  revised_from_response_id uuid references public.bid_responses(id) on delete set null,
  submitted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (response_status in ('submitted', 'declined', 'unavailable', 'revised', 'withdrawn')),
  check (response_status not in ('declined', 'unavailable') or decline_reason is not null),
  check (decline_reason is null or decline_reason <> 'Other' or nullif(trim(coalesce(decline_explanation, '')), '') is not null),
  check (response_status in ('declined', 'unavailable') or (proposed_fee is not null and turn_time_days is not null and accepted_conditions = true))
);

create table if not exists public.bid_awards (
  id uuid primary key default gen_random_uuid(),
  bid_request_id uuid not null references public.bid_requests(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  recipient_id uuid not null references public.bid_request_recipients(id) on delete restrict,
  response_id uuid not null references public.bid_responses(id) on delete restrict,
  awarded_by uuid references public.user_profiles(id) on delete set null,
  status text not null default 'pending_acceptance',
  assignment_status text not null default 'pending_acceptance',
  assigned_appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  acceptance_deadline_at timestamptz,
  winner_notified_at timestamptz,
  non_winners_notified_at timestamptz,
  selection_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('pending_acceptance', 'accepted', 'declined', 'withdrawn', 'reawarded')),
  check (assignment_status in ('pending_acceptance', 'assigned', 'declined', 'reopened'))
);

create table if not exists public.bid_events (
  id uuid primary key default gen_random_uuid(),
  bid_request_id uuid not null references public.bid_requests(id) on delete cascade,
  recipient_id uuid references public.bid_request_recipients(id) on delete cascade,
  response_id uuid references public.bid_responses(id) on delete set null,
  award_id uuid references public.bid_awards(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  actor_organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null,
  visibility text not null default 'sender_internal',
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (visibility in ('sender_internal', 'recipient', 'all_sender_participants'))
);

create table if not exists public.connected_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  bid_request_id uuid references public.bid_requests(id) on delete cascade,
  invited_email text not null,
  invited_user_id uuid references public.user_profiles(id) on delete set null,
  invited_organization_id uuid references public.organizations(id) on delete set null,
  invitation_type text not null,
  status text not null default 'pending',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_by uuid references public.user_profiles(id) on delete set null,
  accepted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (invitation_type in ('order_participation', 'assignment', 'bid', 'document_request', 'workspace_upgrade')),
  check (status in ('pending', 'sent', 'accepted', 'expired', 'revoked', 'failed'))
);

create table if not exists public.connected_upgrade_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  source_connected_organization_id uuid references public.organizations(id) on delete set null,
  workspace_organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  upgrade_status text not null default 'completed',
  previous_access_summary jsonb not null default '{}'::jsonb,
  preserved_order_count integer not null default 0,
  preserved_document_count integer not null default 0,
  preserved_message_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (upgrade_status in ('started', 'completed', 'failed', 'reverted'))
);

create index if not exists subscription_plan_entitlements_plan_idx on public.subscription_plan_entitlements (plan_id);
create index if not exists organization_subscriptions_org_idx on public.organization_subscriptions (organization_id, status);
create unique index if not exists organization_subscriptions_one_active_idx on public.organization_subscriptions (organization_id) where status in ('connected_free', 'trial', 'active', 'past_due', 'grace_period');
create index if not exists organization_entitlement_overrides_org_idx on public.organization_entitlement_overrides (organization_id);
create index if not exists order_participants_order_idx on public.order_participants (order_id, access_status);
create index if not exists order_participants_org_idx on public.order_participants (participant_organization_id, order_id) where participant_organization_id is not null;
create index if not exists order_participants_user_idx on public.order_participants (participant_user_id, order_id) where participant_user_id is not null;
create index if not exists order_participants_email_idx on public.order_participants (lower(participant_email), order_id) where participant_email is not null;
create unique index if not exists order_participants_unique_org_idx on public.order_participants (order_id, participant_organization_id, order_role) where participant_organization_id is not null and revoked_at is null;
create unique index if not exists order_participants_unique_user_idx on public.order_participants (order_id, participant_user_id, order_role) where participant_user_id is not null and revoked_at is null;
create index if not exists order_organizations_order_idx on public.order_organizations (order_id);
create index if not exists order_organizations_org_idx on public.order_organizations (organization_id, access_status);
create index if not exists order_access_grants_order_idx on public.order_access_grants (order_id);
create index if not exists order_access_grants_participant_idx on public.order_access_grants (participant_id) where participant_id is not null;
create index if not exists order_access_grants_org_idx on public.order_access_grants (grantee_organization_id, order_id) where grantee_organization_id is not null;
create index if not exists order_access_grants_user_idx on public.order_access_grants (grantee_user_id, order_id) where grantee_user_id is not null;
create index if not exists connected_order_summaries_owner_idx on public.connected_order_summaries (owning_organization_id, status, due_at);
create index if not exists connected_order_summaries_client_idx on public.connected_order_summaries (client_organization_id, status, due_at) where client_organization_id is not null;
create index if not exists order_document_grants_order_idx on public.order_document_grants (order_id);
create index if not exists order_document_grants_document_idx on public.order_document_grants (document_id);
create index if not exists order_document_grants_org_idx on public.order_document_grants (grantee_organization_id, order_id) where grantee_organization_id is not null;
create index if not exists order_document_grants_user_idx on public.order_document_grants (grantee_user_id, order_id) where grantee_user_id is not null;
create index if not exists order_message_visibility_order_idx on public.order_message_visibility (order_id);
create index if not exists order_message_visibility_message_idx on public.order_message_visibility (message_id) where message_id is not null;
create index if not exists county_adjacency_county_idx on public.county_adjacency (state, county);
create index if not exists county_adjacency_nearby_idx on public.county_adjacency (state, nearby_county);
create index if not exists vendor_county_coverage_county_idx on public.vendor_county_coverage (state, county, coverage_type);
create index if not exists vendor_county_coverage_managing_idx on public.vendor_county_coverage (managing_organization_id, state, county) where managing_organization_id is not null;
create index if not exists vendor_county_coverage_vendor_idx on public.vendor_county_coverage (vendor_profile_id) where vendor_profile_id is not null;
create index if not exists vendor_county_coverage_appraiser_idx on public.vendor_county_coverage (appraiser_profile_id) where appraiser_profile_id is not null;
create index if not exists bid_requests_order_idx on public.bid_requests (order_id);
create index if not exists bid_requests_sender_status_idx on public.bid_requests (sending_organization_id, status, bid_deadline_at);
create index if not exists bid_requests_county_idx on public.bid_requests (state, county, product_type);
create index if not exists bid_request_recipients_request_idx on public.bid_request_recipients (bid_request_id, invitation_status);
create index if not exists bid_request_recipients_org_idx on public.bid_request_recipients (recipient_organization_id, bid_request_id) where recipient_organization_id is not null;
create index if not exists bid_request_recipients_user_idx on public.bid_request_recipients (recipient_user_id, bid_request_id) where recipient_user_id is not null;
create index if not exists bid_request_recipients_vendor_idx on public.bid_request_recipients (vendor_profile_id) where vendor_profile_id is not null;
create index if not exists bid_responses_request_idx on public.bid_responses (bid_request_id, response_status);
create index if not exists bid_responses_recipient_idx on public.bid_responses (recipient_id, revision_number);
create index if not exists bid_awards_request_idx on public.bid_awards (bid_request_id, status);
create index if not exists bid_awards_order_idx on public.bid_awards (order_id);
create index if not exists bid_events_request_idx on public.bid_events (bid_request_id, created_at desc);
create index if not exists bid_events_recipient_idx on public.bid_events (recipient_id, created_at desc) where recipient_id is not null;
create index if not exists connected_invitations_org_idx on public.connected_invitations (organization_id, status);
create index if not exists connected_invitations_email_idx on public.connected_invitations (lower(invited_email), status);
create index if not exists connected_invitations_user_idx on public.connected_invitations (invited_user_id, status) where invited_user_id is not null;
create index if not exists connected_invitations_order_idx on public.connected_invitations (order_id) where order_id is not null;
create index if not exists connected_upgrade_history_user_idx on public.connected_upgrade_history (user_id, created_at desc);
create index if not exists connected_upgrade_history_workspace_idx on public.connected_upgrade_history (workspace_organization_id, created_at desc);

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at before update on public.subscription_plans for each row execute function public.set_updated_at();
drop trigger if exists organization_subscriptions_set_updated_at on public.organization_subscriptions;
create trigger organization_subscriptions_set_updated_at before update on public.organization_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists order_participants_set_updated_at on public.order_participants;
create trigger order_participants_set_updated_at before update on public.order_participants for each row execute function public.set_updated_at();
drop trigger if exists order_organizations_set_updated_at on public.order_organizations;
create trigger order_organizations_set_updated_at before update on public.order_organizations for each row execute function public.set_updated_at();
drop trigger if exists vendor_county_coverage_set_updated_at on public.vendor_county_coverage;
create trigger vendor_county_coverage_set_updated_at before update on public.vendor_county_coverage for each row execute function public.set_updated_at();
drop trigger if exists bid_requests_set_updated_at on public.bid_requests;
create trigger bid_requests_set_updated_at before update on public.bid_requests for each row execute function public.set_updated_at();
drop trigger if exists bid_request_recipients_set_updated_at on public.bid_request_recipients;
create trigger bid_request_recipients_set_updated_at before update on public.bid_request_recipients for each row execute function public.set_updated_at();
drop trigger if exists bid_responses_set_updated_at on public.bid_responses;
create trigger bid_responses_set_updated_at before update on public.bid_responses for each row execute function public.set_updated_at();
drop trigger if exists bid_awards_set_updated_at on public.bid_awards;
create trigger bid_awards_set_updated_at before update on public.bid_awards for each row execute function public.set_updated_at();
drop trigger if exists connected_invitations_set_updated_at on public.connected_invitations;
create trigger connected_invitations_set_updated_at before update on public.connected_invitations for each row execute function public.set_updated_at();

create or replace function app_private.has_org_entitlement(target_organization_id uuid, target_entitlement text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    exists (
      select 1
      from public.organization_entitlement_overrides override_record
      where override_record.organization_id = target_organization_id
        and override_record.entitlement_key = target_entitlement
        and override_record.enabled = true
        and override_record.starts_at <= now()
        and (override_record.ends_at is null or override_record.ends_at > now())
    )
    or exists (
      select 1
      from public.organization_subscriptions subscription_record
      join public.subscription_plan_entitlements entitlement_record
        on entitlement_record.plan_id = subscription_record.plan_id
       and entitlement_record.enabled = true
      where subscription_record.organization_id = target_organization_id
        and subscription_record.status in ('connected_free', 'trial', 'active', 'past_due', 'grace_period')
        and (subscription_record.subscription_ends_at is null or subscription_record.subscription_ends_at > now())
        and (subscription_record.grace_period_ends_at is null or subscription_record.grace_period_ends_at > now() or subscription_record.status <> 'grace_period')
        and entitlement_record.entitlement_key = target_entitlement
    );
$$;

create or replace function app_private.has_active_participation(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.order_participants participant_record
    where participant_record.order_id = target_order_id
      and participant_record.revoked_at is null
      and participant_record.access_status in ('invited', 'pending_acceptance', 'active', 'accepted')
      and participant_record.starts_at <= now()
      and (participant_record.ends_at is null or participant_record.ends_at > now())
      and (
        participant_record.participant_user_id = auth.uid()
        or (
          participant_record.participant_organization_id is not null
          and app_private.is_org_member(participant_record.participant_organization_id)
        )
        or lower(participant_record.participant_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function app_private.can_read_connected_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    exists (
      select 1
      from public.orders order_record
      where order_record.id = target_order_id
        and app_private.is_org_member(order_record.organization_id)
    )
    or app_private.has_active_participation(target_order_id);
$$;

create or replace function app_private.can_manage_connected_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    exists (
      select 1
      from public.orders order_record
      where order_record.id = target_order_id
        and app_private.has_any_permission(
          order_record.organization_id,
          array['create_orders', 'assign_orders', 'manage_workflows', 'manage_company_users']
        )
    )
    or exists (
      select 1
      from public.order_participants participant_record
      where participant_record.order_id = target_order_id
        and participant_record.revoked_at is null
        and participant_record.access_status in ('active', 'accepted')
        and 'manage_connected_order' = any(participant_record.permissions)
        and (
          participant_record.participant_user_id = auth.uid()
          or (
            participant_record.participant_organization_id is not null
            and app_private.is_org_member(participant_record.participant_organization_id)
          )
        )
    );
$$;

create or replace function app_private.can_read_order_participation(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app_private.can_read_connected_order(target_order_id);
$$;

create or replace function app_private.is_participant_row_self(target_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.order_participants participant_record
    where participant_record.id = target_participant_id
      and participant_record.revoked_at is null
      and (
        participant_record.participant_user_id = auth.uid()
        or (
          participant_record.participant_organization_id is not null
          and app_private.is_org_member(participant_record.participant_organization_id)
        )
        or lower(participant_record.participant_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function app_private.can_update_connected_order_summary(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app_private.can_manage_connected_order(target_order_id)
    or exists (
      select 1
      from public.order_participants participant_record
      where participant_record.order_id = target_order_id
        and participant_record.revoked_at is null
        and participant_record.access_status in ('active', 'accepted')
        and participant_record.permissions && array['update_status', 'schedule_inspection', 'respond_to_revision', 'upload_report']
        and (
          participant_record.participant_user_id = auth.uid()
          or (
            participant_record.participant_organization_id is not null
            and app_private.is_org_member(participant_record.participant_organization_id)
          )
        )
    );
$$;

create or replace function app_private.can_upload_connected_document(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app_private.can_manage_connected_order(target_order_id)
    or exists (
      select 1
      from public.order_participants participant_record
      where participant_record.order_id = target_order_id
        and participant_record.revoked_at is null
        and participant_record.access_status in ('active', 'accepted', 'pending_acceptance')
        and participant_record.permissions && array['upload_documents', 'upload_report', 'upload_xml', 'upload_invoice', 'respond_to_revision']
        and (
          participant_record.participant_user_id = auth.uid()
          or (
            participant_record.participant_organization_id is not null
            and app_private.is_org_member(participant_record.participant_organization_id)
          )
        )
    );
$$;

create or replace function app_private.can_read_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_read_document(target_document_id)
    or exists (
      select 1
      from public.order_document_grants grant_record
      join public.documents document_record
        on document_record.id = grant_record.document_id
       and document_record.order_id = grant_record.order_id
      where grant_record.document_id = target_document_id
        and grant_record.revoked_at is null
        and grant_record.starts_at <= now()
        and (grant_record.expires_at is null or grant_record.expires_at > now())
        and (
          grant_record.grantee_user_id = auth.uid()
          or (
            grant_record.grantee_organization_id is not null
            and app_private.is_org_member(grant_record.grantee_organization_id)
          )
          or (
            grant_record.participant_id is not null
            and app_private.is_participant_row_self(grant_record.participant_id)
          )
        )
    );
$$;

create or replace function app_private.can_read_connected_message(target_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.order_messages message_record
    where message_record.id = target_message_id
      and app_private.is_org_member(message_record.organization_id)
  )
  or exists (
    select 1
    from public.order_message_visibility visibility_record
    where visibility_record.message_id = target_message_id
      and visibility_record.revoked_at is null
      and (
        visibility_record.grantee_user_id = auth.uid()
        or (
          visibility_record.grantee_organization_id is not null
          and app_private.is_org_member(visibility_record.grantee_organization_id)
        )
        or (
          visibility_record.participant_id is not null
          and app_private.is_participant_row_self(visibility_record.participant_id)
        )
      )
  );
$$;

create or replace function app_private.can_insert_private_storage_object(
  target_bucket_id text,
  target_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    target_bucket_id = 'cas-private-documents'
    and (
      exists (
        select 1
        from public.organizations organization_record
        where target_object_name like ('organizations/' || organization_record.id::text || '/%')
          and public.has_any_permission(
            organization_record.id,
            array['upload_order_documents', 'upload_documents']
          )
      )
      or exists (
        select 1
        from public.orders order_record
        where target_object_name like ('organizations/' || order_record.organization_id::text || '/connected/' || order_record.id::text || '/%')
          and app_private.can_upload_connected_document(order_record.id)
      )
    );
$$;

create or replace function app_private.sync_connected_order_summary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.connected_order_summaries (
    order_id,
    owning_organization_id,
    file_number,
    product_type,
    borrower_name,
    subject_address,
    city,
    state,
    zip,
    county,
    ordered_at,
    due_at,
    inspection_at,
    status,
    priority,
    simplified_status,
    assigned_summary,
    next_action,
    completed_at,
    updated_at,
    metadata
  )
  values (
    new.id,
    new.organization_id,
    new.file_number,
    new.product_type,
    new.borrower_name,
    new.subject_address,
    new.city,
    new.state,
    new.zip,
    new.county,
    new.ordered_at,
    new.due_at,
    new.inspection_at,
    new.status,
    new.priority,
    case
      when new.status in ('New', 'Unassigned') then 'Order received'
      when new.status in ('Assigned', 'Accepted', 'Inspection Scheduled') then 'Assignment in progress'
      when new.status in ('Inspected', 'Report In Progress', 'Submitted', 'In Review') then 'Report in progress'
      when new.status in ('Revisions Needed', 'Revision Sent to Appraiser') then 'Revision in progress'
      when new.status in ('Ready for Delivery', 'Delivered') then 'Ready or delivered'
      when new.status = 'Completed' then 'Completed'
      else new.status::text
    end,
    case when new.appraiser_profile_id is null then 'Not assigned yet' else 'Assigned' end,
    new.next_action,
    new.completed_at,
    now(),
    jsonb_build_object('source', 'orders_trigger')
  )
  on conflict (order_id) do update set
    owning_organization_id = excluded.owning_organization_id,
    file_number = excluded.file_number,
    product_type = excluded.product_type,
    borrower_name = excluded.borrower_name,
    subject_address = excluded.subject_address,
    city = excluded.city,
    state = excluded.state,
    zip = excluded.zip,
    county = excluded.county,
    ordered_at = excluded.ordered_at,
    due_at = excluded.due_at,
    inspection_at = excluded.inspection_at,
    status = excluded.status,
    priority = excluded.priority,
    simplified_status = excluded.simplified_status,
    assigned_summary = excluded.assigned_summary,
    next_action = excluded.next_action,
    completed_at = excluded.completed_at,
    updated_at = now(),
    metadata = public.connected_order_summaries.metadata || excluded.metadata;

  return new;
end;
$$;

create or replace function app_private.can_manage_bid_request(target_bid_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bid_requests request_record
    where request_record.id = target_bid_request_id
      and app_private.has_any_permission(
        request_record.sending_organization_id,
        array['assign_orders', 'invite_vendors', 'approve_vendors', 'manage_workflows']
      )
  );
$$;

create or replace function app_private.can_read_bid_request(target_bid_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app_private.can_manage_bid_request(target_bid_request_id)
    or exists (
      select 1
      from public.bid_request_recipients recipient_record
      where recipient_record.bid_request_id = target_bid_request_id
        and recipient_record.invitation_status <> 'withdrawn'
        and (
          recipient_record.recipient_user_id = auth.uid()
          or (
            recipient_record.recipient_organization_id is not null
            and app_private.is_org_member(recipient_record.recipient_organization_id)
          )
          or lower(recipient_record.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );
$$;

create or replace function app_private.can_read_bid_recipient(target_recipient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bid_request_recipients recipient_record
    where recipient_record.id = target_recipient_id
      and (
        app_private.can_manage_bid_request(recipient_record.bid_request_id)
        or recipient_record.recipient_user_id = auth.uid()
        or (
          recipient_record.recipient_organization_id is not null
          and app_private.is_org_member(recipient_record.recipient_organization_id)
        )
        or lower(recipient_record.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function app_private.can_manage_bid_recipient(target_recipient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bid_request_recipients recipient_record
    where recipient_record.id = target_recipient_id
      and app_private.can_manage_bid_request(recipient_record.bid_request_id)
  );
$$;

create or replace function app_private.can_respond_to_bid(target_recipient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bid_request_recipients recipient_record
    join public.bid_requests request_record on request_record.id = recipient_record.bid_request_id
    where recipient_record.id = target_recipient_id
      and request_record.status in ('open', 'reopened')
      and request_record.lock_responses = false
      and request_record.bid_deadline_at > now()
      and recipient_record.invitation_status in ('sent', 'delivered', 'viewed', 'responded')
      and (
        recipient_record.recipient_user_id = auth.uid()
        or (
          recipient_record.recipient_organization_id is not null
          and app_private.is_org_member(recipient_record.recipient_organization_id)
        )
        or lower(recipient_record.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function app_private.can_read_bid_response(target_response_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bid_responses response_record
    where response_record.id = target_response_id
      and (
        app_private.can_manage_bid_request(response_record.bid_request_id)
        or app_private.can_read_bid_recipient(response_record.recipient_id)
      )
  );
$$;

create or replace function app_private.can_read_bid_award(target_award_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bid_awards award_record
    where award_record.id = target_award_id
      and (
        app_private.can_manage_bid_request(award_record.bid_request_id)
        or app_private.can_read_bid_recipient(award_record.recipient_id)
      )
  );
$$;

create or replace function app_private.can_manage_vendor_county_coverage(target_coverage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.vendor_county_coverage coverage_record
    where coverage_record.id = target_coverage_id
      and (
        (
          coverage_record.managing_organization_id is not null
          and app_private.has_any_permission(coverage_record.managing_organization_id, array['approve_vendors', 'invite_vendors'])
        )
        or (
          coverage_record.vendor_organization_id is not null
          and app_private.is_org_admin(coverage_record.vendor_organization_id)
        )
      )
  );
$$;

revoke execute on all functions in schema app_private from public;
grant execute on function app_private.has_org_entitlement(uuid, text) to authenticated, service_role;
grant execute on function app_private.has_active_participation(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_connected_order(uuid) to authenticated, service_role;
grant execute on function app_private.can_manage_connected_order(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_order_participation(uuid) to authenticated, service_role;
grant execute on function app_private.is_participant_row_self(uuid) to authenticated, service_role;
grant execute on function app_private.can_update_connected_order_summary(uuid) to authenticated, service_role;
grant execute on function app_private.can_upload_connected_document(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_connected_message(uuid) to authenticated, service_role;
grant execute on function app_private.can_insert_private_storage_object(text, text) to authenticated, service_role;
grant execute on function app_private.sync_connected_order_summary() to authenticated, service_role;
grant execute on function app_private.can_manage_bid_request(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_bid_request(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_bid_recipient(uuid) to authenticated, service_role;
grant execute on function app_private.can_manage_bid_recipient(uuid) to authenticated, service_role;
grant execute on function app_private.can_respond_to_bid(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_bid_response(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_bid_award(uuid) to authenticated, service_role;
grant execute on function app_private.can_manage_vendor_county_coverage(uuid) to authenticated, service_role;

drop trigger if exists orders_sync_connected_summary on public.orders;
create trigger orders_sync_connected_summary
  after insert or update of file_number, product_type, borrower_name, subject_address, city, state, zip, county, ordered_at, due_at, inspection_at, status, priority, appraiser_profile_id, next_action, completed_at
  on public.orders
  for each row
  execute function app_private.sync_connected_order_summary();

alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_entitlements enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.organization_entitlement_overrides enable row level security;
alter table public.order_participants enable row level security;
alter table public.order_organizations enable row level security;
alter table public.order_access_grants enable row level security;
alter table public.connected_order_summaries enable row level security;
alter table public.order_document_grants enable row level security;
alter table public.order_message_visibility enable row level security;
alter table public.county_adjacency enable row level security;
alter table public.vendor_county_coverage enable row level security;
alter table public.bid_requests enable row level security;
alter table public.bid_request_recipients enable row level security;
alter table public.bid_responses enable row level security;
alter table public.bid_awards enable row level security;
alter table public.bid_events enable row level security;
alter table public.connected_invitations enable row level security;
alter table public.connected_upgrade_history enable row level security;

grant select on public.subscription_plans, public.subscription_plan_entitlements, public.county_adjacency to anon, authenticated;
grant select, insert, update, delete on
  public.organization_subscriptions,
  public.organization_entitlement_overrides,
  public.order_participants,
  public.order_organizations,
  public.order_access_grants,
  public.connected_order_summaries,
  public.order_document_grants,
  public.order_message_visibility,
  public.vendor_county_coverage,
  public.bid_requests,
  public.bid_request_recipients,
  public.bid_responses,
  public.bid_awards,
  public.bid_events,
  public.connected_invitations,
  public.connected_upgrade_history
to authenticated;

drop policy if exists "active plans are readable" on public.subscription_plans;
create policy "active plans are readable" on public.subscription_plans for select to anon, authenticated using (active = true);
drop policy if exists "active plan entitlements are readable" on public.subscription_plan_entitlements;
create policy "active plan entitlements are readable" on public.subscription_plan_entitlements for select to anon, authenticated using (
  exists (select 1 from public.subscription_plans plan_record where plan_record.id = subscription_plan_entitlements.plan_id and plan_record.active = true)
);
drop policy if exists "members can read organization subscriptions" on public.organization_subscriptions;
create policy "members can read organization subscriptions" on public.organization_subscriptions for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists "admins can manage organization subscriptions" on public.organization_subscriptions;
create policy "admins can manage organization subscriptions" on public.organization_subscriptions for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));
drop policy if exists "admins can read entitlement overrides" on public.organization_entitlement_overrides;
create policy "admins can read entitlement overrides" on public.organization_entitlement_overrides for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists "admins can manage entitlement overrides" on public.organization_entitlement_overrides;
create policy "admins can manage entitlement overrides" on public.organization_entitlement_overrides for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

drop policy if exists "connected participants can read order participants" on public.order_participants;
create policy "connected participants can read order participants" on public.order_participants for select to authenticated using (app_private.can_read_order_participation(order_id));
drop policy if exists "order managers can manage participants" on public.order_participants;
create policy "order managers can manage participants" on public.order_participants for all to authenticated using (app_private.can_manage_connected_order(order_id)) with check (app_private.can_manage_connected_order(order_id));
drop policy if exists "participants can update their invitation" on public.order_participants;
create policy "participants can update their invitation" on public.order_participants for update to authenticated using (app_private.is_participant_row_self(id)) with check (app_private.is_participant_row_self(id));

drop policy if exists "connected participants can read order organizations" on public.order_organizations;
create policy "connected participants can read order organizations" on public.order_organizations for select to authenticated using (app_private.can_read_connected_order(order_id));
drop policy if exists "order managers can manage order organizations" on public.order_organizations;
create policy "order managers can manage order organizations" on public.order_organizations for all to authenticated using (app_private.can_manage_connected_order(order_id)) with check (app_private.can_manage_connected_order(order_id));

drop policy if exists "connected participants can read order grants" on public.order_access_grants;
create policy "connected participants can read order grants" on public.order_access_grants for select to authenticated using (app_private.can_read_connected_order(order_id));
drop policy if exists "order managers can manage order grants" on public.order_access_grants;
create policy "order managers can manage order grants" on public.order_access_grants for all to authenticated using (app_private.can_manage_connected_order(order_id)) with check (app_private.can_manage_connected_order(order_id));

drop policy if exists "connected participants can read summaries" on public.connected_order_summaries;
create policy "connected participants can read summaries" on public.connected_order_summaries for select to authenticated using (app_private.can_read_connected_order(order_id));
drop policy if exists "order managers can manage summaries" on public.connected_order_summaries;
create policy "order managers can manage summaries" on public.connected_order_summaries for all to authenticated using (app_private.can_manage_connected_order(order_id)) with check (app_private.can_manage_connected_order(order_id));
drop policy if exists "connected participants can update safe summaries" on public.connected_order_summaries;
create policy "connected participants can update safe summaries" on public.connected_order_summaries for update to authenticated using (app_private.can_update_connected_order_summary(order_id)) with check (app_private.can_update_connected_order_summary(order_id));

drop policy if exists "connected participants can read document grants" on public.order_document_grants;
create policy "connected participants can read document grants" on public.order_document_grants for select to authenticated using (app_private.can_read_connected_order(order_id));
drop policy if exists "order managers can manage document grants" on public.order_document_grants;
create policy "order managers can manage document grants" on public.order_document_grants for all to authenticated using (app_private.can_manage_connected_order(order_id)) with check (app_private.can_manage_connected_order(order_id));

drop policy if exists "connected participants can read message visibility" on public.order_message_visibility;
create policy "connected participants can read message visibility" on public.order_message_visibility for select to authenticated using (app_private.can_read_connected_order(order_id));
drop policy if exists "order managers can manage message visibility" on public.order_message_visibility;
create policy "order managers can manage message visibility" on public.order_message_visibility for all to authenticated using (app_private.can_manage_connected_order(order_id)) with check (app_private.can_manage_connected_order(order_id));

drop policy if exists "county adjacency is readable" on public.county_adjacency;
create policy "county adjacency is readable" on public.county_adjacency for select to anon, authenticated using (true);

drop policy if exists "members can read vendor county coverage" on public.vendor_county_coverage;
create policy "members can read vendor county coverage" on public.vendor_county_coverage for select to authenticated using (
  (managing_organization_id is not null and app_private.is_org_member(managing_organization_id))
  or (vendor_organization_id is not null and app_private.is_org_member(vendor_organization_id))
  or vendor_user_id = auth.uid()
  or exists (
    select 1
    from public.appraiser_profiles appraiser_record
    where appraiser_record.id = vendor_county_coverage.appraiser_profile_id
      and appraiser_record.user_id = auth.uid()
  )
);
drop policy if exists "authorized users can manage vendor county coverage" on public.vendor_county_coverage;
create policy "authorized users can manage vendor county coverage" on public.vendor_county_coverage for all to authenticated using (app_private.can_manage_vendor_county_coverage(id)) with check (
  (managing_organization_id is not null and app_private.has_any_permission(managing_organization_id, array['approve_vendors', 'invite_vendors']))
  or (vendor_organization_id is not null and app_private.is_org_admin(vendor_organization_id))
);

drop policy if exists "bid requests readable by sender and recipients" on public.bid_requests;
create policy "bid requests readable by sender and recipients" on public.bid_requests for select to authenticated using (app_private.can_read_bid_request(id));
drop policy if exists "bid senders can manage bid requests" on public.bid_requests;
create policy "bid senders can manage bid requests" on public.bid_requests for all to authenticated using (app_private.can_manage_bid_request(id)) with check (
  app_private.has_any_permission(sending_organization_id, array['assign_orders', 'invite_vendors', 'approve_vendors', 'manage_workflows'])
);

drop policy if exists "bid recipients readable by sender and self" on public.bid_request_recipients;
create policy "bid recipients readable by sender and self" on public.bid_request_recipients for select to authenticated using (app_private.can_read_bid_recipient(id));
drop policy if exists "bid senders can manage recipients" on public.bid_request_recipients;
create policy "bid senders can manage recipients" on public.bid_request_recipients for all to authenticated using (app_private.can_manage_bid_recipient(id)) with check (
  exists (
    select 1
    from public.bid_requests request_record
    where request_record.id = bid_request_recipients.bid_request_id
      and app_private.has_any_permission(request_record.sending_organization_id, array['assign_orders', 'invite_vendors', 'approve_vendors', 'manage_workflows'])
  )
);
drop policy if exists "bid recipients can mark viewed" on public.bid_request_recipients;
create policy "bid recipients can mark viewed" on public.bid_request_recipients for update to authenticated using (app_private.can_read_bid_recipient(id)) with check (app_private.can_read_bid_recipient(id));

drop policy if exists "bid responses readable by sender and bidder" on public.bid_responses;
create policy "bid responses readable by sender and bidder" on public.bid_responses for select to authenticated using (app_private.can_read_bid_response(id));
drop policy if exists "bid recipients can submit responses" on public.bid_responses;
create policy "bid recipients can submit responses" on public.bid_responses for insert to authenticated with check (
  app_private.can_respond_to_bid(recipient_id)
  and (responder_user_id is null or responder_user_id = auth.uid())
);
drop policy if exists "bid recipients can revise own responses" on public.bid_responses;
create policy "bid recipients can revise own responses" on public.bid_responses for update to authenticated using (app_private.can_read_bid_response(id) and app_private.can_respond_to_bid(recipient_id)) with check (app_private.can_respond_to_bid(recipient_id));

drop policy if exists "bid awards readable by sender and winner" on public.bid_awards;
create policy "bid awards readable by sender and winner" on public.bid_awards for select to authenticated using (app_private.can_read_bid_award(id));
drop policy if exists "bid senders can manage awards" on public.bid_awards;
create policy "bid senders can manage awards" on public.bid_awards for all to authenticated using (app_private.can_manage_bid_request(bid_request_id)) with check (app_private.can_manage_bid_request(bid_request_id));

drop policy if exists "bid events readable by sender and addressed recipient" on public.bid_events;
create policy "bid events readable by sender and addressed recipient" on public.bid_events for select to authenticated using (
  app_private.can_manage_bid_request(bid_request_id)
  or (recipient_id is not null and visibility = 'recipient' and app_private.can_read_bid_recipient(recipient_id))
);
drop policy if exists "bid senders can manage events" on public.bid_events;
create policy "bid senders can manage events" on public.bid_events for all to authenticated using (app_private.can_manage_bid_request(bid_request_id)) with check (app_private.can_manage_bid_request(bid_request_id));

drop policy if exists "connected invitations readable by sender and invitee" on public.connected_invitations;
create policy "connected invitations readable by sender and invitee" on public.connected_invitations for select to authenticated using (
  app_private.is_org_member(organization_id)
  or invited_user_id = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
drop policy if exists "connected invitations manageable by sender" on public.connected_invitations;
create policy "connected invitations manageable by sender" on public.connected_invitations for all to authenticated using (
  app_private.has_any_permission(organization_id, array['invite_users', 'assign_orders', 'invite_vendors', 'create_orders'])
) with check (
  app_private.has_any_permission(organization_id, array['invite_users', 'assign_orders', 'invite_vendors', 'create_orders'])
);

drop policy if exists "users and admins can read upgrade history" on public.connected_upgrade_history;
create policy "users and admins can read upgrade history" on public.connected_upgrade_history for select to authenticated using (
  user_id = auth.uid()
  or app_private.is_org_admin(workspace_organization_id)
  or (source_connected_organization_id is not null and app_private.is_org_admin(source_connected_organization_id))
);
drop policy if exists "users and admins can create upgrade history" on public.connected_upgrade_history;
create policy "users and admins can create upgrade history" on public.connected_upgrade_history for insert to authenticated with check (
  user_id = auth.uid()
  or app_private.is_org_admin(workspace_organization_id)
);
drop policy if exists "workspace admins can update upgrade history" on public.connected_upgrade_history;
create policy "workspace admins can update upgrade history" on public.connected_upgrade_history for update to authenticated using (app_private.is_org_admin(workspace_organization_id)) with check (app_private.is_org_admin(workspace_organization_id));

drop policy if exists "document users can insert documents" on public.documents;
create policy "document users can insert documents" on public.documents
  for insert
  to authenticated
  with check (
    (
      app_private.has_any_permission(organization_id, array['upload_order_documents', 'upload_documents'])
      and (order_id is null or app_private.can_read_order(order_id))
    )
    or (
      order_id is not null
      and exists (
        select 1
        from public.orders order_record
        where order_record.id = documents.order_id
          and order_record.organization_id = documents.organization_id
          and app_private.can_upload_connected_document(order_record.id)
      )
    )
  );

drop policy if exists "connected participants can read granted messages" on public.order_messages;
create policy "connected participants can read granted messages"
  on public.order_messages
  for select
  to authenticated
  using (
    app_private.can_read_connected_message(id)
    or (
      app_private.can_read_connected_order(order_id)
      and lower(visibility) in ('client-facing', 'client visible', 'assignment', 'bid', 'shared', 'delivery recipient')
    )
  );

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists "cas uploaders can insert private storage objects" on storage.objects';
    execute 'create policy "cas uploaders can insert private storage objects" on storage.objects for insert to authenticated with check (
      app_private.can_insert_private_storage_object(bucket_id, name)
    )';
  end if;
end $$;

insert into public.subscription_plans (plan_key, name, description, audience, monthly_price_cents, annual_price_cents, metadata)
values
  ('connected_free', 'CAS Connected', 'Free participation in orders, bids, documents, messages, and assignment workflows sent by another CAS organization.', 'connected', 0, 0, '{"workspace_modules": false}'::jsonb),
  ('workspace_starter', 'CAS Workspace Starter', 'Core order management for solo appraisers and small appraisal firms.', 'workspace', 9900, 99000, '{"recommended_for": "solo_appraiser"}'::jsonb),
  ('workspace_pro', 'CAS Workspace Pro', 'Full operating platform for appraisal firms with accounting, review, automation, and analytics.', 'workspace', 24900, 249000, '{"recommended_for": "appraisal_firm"}'::jsonb),
  ('workspace_amc', 'CAS Workspace AMC', 'AMC and lender-grade operating platform with vendors, bids, compliance, and connected order exchange.', 'workspace', 39900, 399000, '{"recommended_for": "amc"}'::jsonb)
on conflict (plan_key) do update set
  name = excluded.name,
  description = excluded.description,
  audience = excluded.audience,
  monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents,
  active = true,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.subscription_plan_entitlements (plan_id, entitlement_key, enabled)
select plan_record.id, entitlement_key, true
from public.subscription_plans plan_record
cross join lateral (
  values
    ('connected_order_participation'),
    ('connected_bid_response'),
    ('connected_document_exchange'),
    ('connected_messaging'),
    ('connected_assignment_updates')
) as entitlement(entitlement_key)
where plan_record.plan_key = 'connected_free'
on conflict (plan_id, entitlement_key) do update set enabled = excluded.enabled;

insert into public.subscription_plan_entitlements (plan_id, entitlement_key, enabled)
select plan_record.id, entitlement_key, true
from public.subscription_plans plan_record
cross join lateral (
  values
    ('full_order_management'),
    ('incoming_connected_orders'),
    ('company_users'),
    ('documents_communication'),
    ('calendar'),
    ('imports'),
    ('public_order_page'),
    ('custom_templates')
) as entitlement(entitlement_key)
where plan_record.plan_key = 'workspace_starter'
on conflict (plan_id, entitlement_key) do update set enabled = excluded.enabled;

insert into public.subscription_plan_entitlements (plan_id, entitlement_key, enabled)
select plan_record.id, entitlement_key, true
from public.subscription_plans plan_record
cross join lateral (
  values
    ('full_order_management'),
    ('incoming_connected_orders'),
    ('client_management'),
    ('company_users'),
    ('review_management'),
    ('documents_communication'),
    ('accounting'),
    ('payroll'),
    ('invoicing'),
    ('calendar'),
    ('analytics'),
    ('imports'),
    ('custom_templates'),
    ('automations'),
    ('integrations'),
    ('public_order_page')
) as entitlement(entitlement_key)
where plan_record.plan_key = 'workspace_pro'
on conflict (plan_id, entitlement_key) do update set enabled = excluded.enabled;

insert into public.subscription_plan_entitlements (plan_id, entitlement_key, enabled)
select plan_record.id, entitlement_key, true
from public.subscription_plans plan_record
cross join lateral (
  values
    ('full_order_management'),
    ('incoming_connected_orders'),
    ('client_management'),
    ('vendor_management'),
    ('bid_management'),
    ('county_coverage'),
    ('company_users'),
    ('review_management'),
    ('documents_communication'),
    ('accounting'),
    ('invoicing'),
    ('calendar'),
    ('analytics'),
    ('imports'),
    ('custom_templates'),
    ('automations'),
    ('integrations'),
    ('public_order_page')
) as entitlement(entitlement_key)
where plan_record.plan_key = 'workspace_amc'
on conflict (plan_id, entitlement_key) do update set enabled = excluded.enabled;

insert into public.organization_subscriptions (organization_id, plan_id, status, subscription_started_at, metadata)
select organization_record.id,
       plan_record.id,
       case
         when organization_record.type in ('appraisal_firm', 'solo_appraiser') then 'active'
         when organization_record.type = 'amc' then 'active'
         else 'connected_free'
       end,
       now(),
       jsonb_build_object('source', 'phase10_2_migration')
from public.organizations organization_record
join public.subscription_plans plan_record
  on plan_record.plan_key = case
    when organization_record.type = 'amc' then 'workspace_amc'
    when organization_record.type in ('appraisal_firm', 'solo_appraiser') then 'workspace_pro'
    else 'connected_free'
  end
where not exists (
  select 1
  from public.organization_subscriptions existing_subscription
  where existing_subscription.organization_id = organization_record.id
    and existing_subscription.status in ('connected_free', 'trial', 'active', 'past_due', 'grace_period')
);

insert into public.connected_order_summaries (
  order_id,
  owning_organization_id,
  file_number,
  product_type,
  borrower_name,
  subject_address,
  city,
  state,
  zip,
  county,
  ordered_at,
  due_at,
  inspection_at,
  status,
  priority,
  simplified_status,
  assigned_summary,
  next_action,
  completed_at,
  updated_at,
  metadata
)
select
  order_record.id,
  order_record.organization_id,
  order_record.file_number,
  order_record.product_type,
  order_record.borrower_name,
  order_record.subject_address,
  order_record.city,
  order_record.state,
  order_record.zip,
  order_record.county,
  order_record.ordered_at,
  order_record.due_at,
  order_record.inspection_at,
  order_record.status,
  order_record.priority,
  case
    when order_record.status in ('New', 'Unassigned') then 'Order received'
    when order_record.status in ('Assigned', 'Accepted', 'Inspection Scheduled') then 'Assignment in progress'
    when order_record.status in ('Inspected', 'Report In Progress', 'Submitted', 'In Review') then 'Report in progress'
    when order_record.status in ('Revisions Needed', 'Revision Sent to Appraiser') then 'Revision in progress'
    when order_record.status in ('Ready for Delivery', 'Delivered') then 'Ready or delivered'
    when order_record.status = 'Completed' then 'Completed'
    else order_record.status::text
  end,
  case when order_record.appraiser_profile_id is null then 'Not assigned yet' else 'Assigned' end,
  order_record.next_action,
  order_record.completed_at,
  now(),
  jsonb_build_object('source', 'phase10_2_backfill')
from public.orders order_record
on conflict (order_id) do nothing;

insert into public.order_participants (
  order_id,
  participant_organization_id,
  participant_type,
  order_role,
  access_status,
  permissions,
  document_visibility,
  message_channels,
  status_visibility,
  accounting_visibility,
  metadata
)
select
  order_record.id,
  order_record.organization_id,
  'appraisal_company',
  'primary_owner',
  'active',
  array['manage_connected_order', 'view_full_order', 'manage_documents', 'manage_messages', 'manage_accounting'],
  array['Internal organization only', 'Assigned appraiser', 'Reviewer', 'AMC', 'Lender/client', 'Delivery recipient'],
  array['internal', 'client-facing', 'assignment', 'review', 'delivery'],
  'full',
  'full',
  jsonb_build_object('source', 'phase10_2_backfill')
from public.orders order_record
on conflict do nothing;

insert into public.order_organizations (
  order_id,
  organization_id,
  relationship_type,
  access_status,
  is_primary_owner,
  can_create_internal_workflow,
  settings
)
select
  order_record.id,
  order_record.organization_id,
  'primary_owner',
  'active',
  true,
  true,
  jsonb_build_object('source', 'phase10_2_backfill')
from public.orders order_record
on conflict do nothing;

insert into public.order_participants (
  order_id,
  participant_organization_id,
  participant_user_id,
  participant_type,
  order_role,
  access_status,
  permissions,
  document_visibility,
  message_channels,
  status_visibility,
  accounting_visibility,
  metadata
)
select
  order_record.id,
  appraiser_record.organization_id,
  appraiser_record.user_id,
  'individual_appraiser',
  'assigned_appraiser',
  'active',
  array['view_assignment', 'schedule_inspection', 'update_status', 'upload_documents', 'upload_report', 'upload_xml', 'upload_invoice', 'respond_to_revision'],
  array['Assigned appraiser', 'Lender/client', 'Delivery recipient'],
  array['assignment', 'client-facing', 'revision'],
  'assignment',
  'own_fee',
  jsonb_build_object('source', 'phase10_2_assigned_appraiser_backfill')
from public.orders order_record
join public.appraiser_profiles appraiser_record on appraiser_record.id = order_record.appraiser_profile_id
where order_record.appraiser_profile_id is not null
on conflict do nothing;

insert into public.order_participants (
  order_id,
  participant_organization_id,
  participant_user_id,
  participant_type,
  order_role,
  access_status,
  permissions,
  document_visibility,
  message_channels,
  status_visibility,
  accounting_visibility,
  metadata
)
select
  order_record.id,
  order_record.organization_id,
  order_record.reviewer_id,
  'reviewer',
  'reviewer',
  'active',
  array['view_assignment', 'review_report', 'request_revision', 'manage_review_documents'],
  array['Reviewer', 'Delivery recipient'],
  array['review', 'internal'],
  'review',
  'none',
  jsonb_build_object('source', 'phase10_2_reviewer_backfill')
from public.orders order_record
where order_record.reviewer_id is not null
on conflict do nothing;

insert into public.vendor_county_coverage (
  managing_organization_id,
  vendor_profile_id,
  vendor_organization_id,
  display_name,
  state,
  county,
  coverage_type,
  product_types,
  specialties,
  approval_status,
  license_status,
  eo_status,
  w9_status,
  active_status,
  accepting_work,
  current_workload,
  capacity_limit,
  capacity_status,
  avg_turn_days,
  last_confirmed_at,
  metadata
)
select distinct
  coalesce(coverage_record.organization_id, vendor_record.amc_organization_id),
  vendor_record.id,
  vendor_record.vendor_organization_id,
  vendor_record.company_name,
  coverage_record.state,
  coverage_record.county,
  'direct',
  coverage_record.product_types,
  vendor_record.specialties,
  case when vendor_record.status = 'approved' then 'approved' else 'pending' end,
  'current',
  'current',
  'on_file',
  case when vendor_record.status in ('suspended', 'inactive') then vendor_record.status::text else 'active' end,
  vendor_record.status = 'approved',
  coalesce(vendor_record.workload, 0),
  vendor_record.capacity,
  case
    when vendor_record.capacity is not null and coalesce(vendor_record.workload, 0) >= vendor_record.capacity then 'overloaded'
    when vendor_record.capacity is not null and coalesce(vendor_record.workload, 0) >= vendor_record.capacity * 0.8 then 'busy'
    when vendor_record.capacity is not null and coalesce(vendor_record.workload, 0) <= vendor_record.capacity * 0.45 then 'available'
    else 'balanced'
  end,
  vendor_record.turn_time_days,
  now(),
  jsonb_build_object('source', 'coverage_areas_backfill')
from public.coverage_areas coverage_record
join public.vendor_profiles vendor_record on vendor_record.id = coverage_record.vendor_profile_id
where coverage_record.county is not null
on conflict do nothing;

insert into public.vendor_county_coverage (
  managing_organization_id,
  appraiser_profile_id,
  vendor_organization_id,
  vendor_user_id,
  display_name,
  state,
  county,
  coverage_type,
  product_types,
  specialties,
  approval_status,
  license_status,
  license_expires_at,
  eo_status,
  eo_expires_at,
  w9_status,
  active_status,
  accepting_work,
  current_workload,
  capacity_limit,
  capacity_status,
  avg_turn_days,
  revision_rate,
  last_confirmed_at,
  metadata
)
select distinct
  appraiser_record.organization_id,
  appraiser_record.id,
  appraiser_record.organization_id,
  appraiser_record.user_id,
  appraiser_record.display_name,
  coalesce(appraiser_record.license_state, 'GA'),
  trim(split_county.county_name),
  'direct',
  array['1004 URAR', 'FHA 1004', 'VA 1004', 'Desktop'],
  array[appraiser_record.role],
  'approved',
  case when appraiser_record.license_expires_at is not null and appraiser_record.license_expires_at < current_date then 'expired' else 'current' end,
  appraiser_record.license_expires_at,
  case when appraiser_record.eo_expires_at is not null and appraiser_record.eo_expires_at < current_date then 'expired' else 'current' end,
  appraiser_record.eo_expires_at,
  'on_file',
  case when appraiser_record.active then 'active' else 'inactive' end,
  appraiser_record.active,
  appraiser_record.active_orders,
  appraiser_record.capacity,
  case
    when appraiser_record.capacity is not null and appraiser_record.active_orders >= appraiser_record.capacity then 'overloaded'
    when appraiser_record.capacity is not null and appraiser_record.active_orders >= appraiser_record.capacity * 0.8 then 'busy'
    when appraiser_record.capacity is not null and appraiser_record.active_orders <= appraiser_record.capacity * 0.45 then 'available'
    else 'balanced'
  end,
  appraiser_record.avg_turn_days,
  appraiser_record.revision_rate,
  now(),
  jsonb_build_object('source', 'appraiser_profiles_backfill')
from public.appraiser_profiles appraiser_record
cross join lateral regexp_split_to_table(coalesce(appraiser_record.coverage_summary, ''), ',') as split_county(county_name)
where nullif(trim(split_county.county_name), '') is not null
on conflict do nothing;

insert into public.county_adjacency (state, county, nearby_county, adjacency_type, estimated_distance_miles)
values
  ('GA', 'Cobb', 'Fulton', 'bordering', 18),
  ('GA', 'Cobb', 'Cherokee', 'bordering', 22),
  ('GA', 'Cobb', 'Douglas', 'bordering', 19),
  ('GA', 'Fulton', 'Cobb', 'bordering', 18),
  ('GA', 'Fulton', 'DeKalb', 'bordering', 12),
  ('GA', 'Fulton', 'Gwinnett', 'nearby_metro', 28),
  ('GA', 'Cherokee', 'Cobb', 'bordering', 22),
  ('GA', 'Cherokee', 'Bartow', 'bordering', 27),
  ('GA', 'Cherokee', 'Pickens', 'bordering', 31),
  ('GA', 'DeKalb', 'Fulton', 'bordering', 12),
  ('GA', 'DeKalb', 'Gwinnett', 'bordering', 20),
  ('GA', 'Gwinnett', 'DeKalb', 'bordering', 20),
  ('GA', 'Gwinnett', 'Fulton', 'nearby_metro', 28),
  ('GA', 'Bartow', 'Cherokee', 'bordering', 27),
  ('GA', 'Pickens', 'Cherokee', 'bordering', 31)
on conflict (state, county, nearby_county) do update set
  adjacency_type = excluded.adjacency_type,
  estimated_distance_miles = excluded.estimated_distance_miles;

comment on table public.connected_order_summaries is
  'Safe client/connected-participant projection of shared master orders. Private accounting, payroll, internal notes, and reviewer work notes remain on organization-owned tables.';

comment on table public.order_participants is
  'Explicit order participation grants. Organization membership alone does not expose another organization''s order.';

comment on table public.vendor_county_coverage is
  'County-first appraisal coverage, compliance, approval, and capacity profile used before bid recipients can be selected.';

comment on table public.bid_requests is
  'One master bid request per shared order, with separate private recipient invitations and responses.';
