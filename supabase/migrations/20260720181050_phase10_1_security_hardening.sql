create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from pg_extension extension_record
    join pg_namespace namespace_record on namespace_record.oid = extension_record.extnamespace
    where extension_record.extname = 'citext'
      and namespace_record.nspname = 'public'
  ) then
    alter extension citext set schema extensions;
  end if;
end $$;

alter function public.current_organization_id() set search_path = pg_catalog, public;
alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.can_read_document(uuid) set search_path = pg_catalog, public;
alter function public.can_read_order(uuid) set search_path = pg_catalog, public;
alter function public.enforce_order_update_scope() set search_path = pg_catalog, public;
alter function public.handle_new_user_profile() set search_path = pg_catalog, public, auth;
alter function public.has_any_permission(uuid, text[]) set search_path = pg_catalog, public;
alter function public.has_permission(uuid, text) set search_path = pg_catalog, public;
alter function public.is_assigned_appraiser_for_order(uuid) set search_path = pg_catalog, public;
alter function public.is_org_admin(uuid) set search_path = pg_catalog, public;
alter function public.is_org_member(uuid) set search_path = pg_catalog, public;
alter function public.rls_auto_enable() set search_path = pg_catalog;

revoke execute on function public.can_read_document(uuid) from public, anon, authenticated;
revoke execute on function public.can_read_order(uuid) from public, anon, authenticated;
revoke execute on function public.current_organization_id() from public, anon, authenticated;
revoke execute on function public.enforce_order_update_scope() from public, anon, authenticated;
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;
revoke execute on function public.has_any_permission(uuid, text[]) from public, anon, authenticated;
revoke execute on function public.has_permission(uuid, text) from public, anon, authenticated;
revoke execute on function public.is_assigned_appraiser_for_order(uuid) from public, anon, authenticated;
revoke execute on function public.is_org_admin(uuid) from public, anon, authenticated;
revoke execute on function public.is_org_member(uuid) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

alter table public.public_order_request_documents
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

create index if not exists public_order_request_documents_expires_at_idx
  on public.public_order_request_documents (expires_at);

comment on column public.public_order_request_documents.expires_at is
  'Cleanup marker for abandoned anonymous public-order uploads. Receiving organization access is still governed by RLS and storage policies.';

drop policy if exists "public can submit public order requests" on public.public_order_requests;
create policy "public can submit public order requests"
  on public.public_order_requests
  for insert
  to anon, authenticated
  with check (
    consent_accepted = true
    and status = 'pending_review'
    and exists (
      select 1
      from public.public_order_settings settings_record
      where settings_record.organization_id = public_order_requests.organization_id
        and settings_record.enabled = true
    )
  );

drop policy if exists "public can upload public request documents" on public.public_order_request_documents;
create policy "public can upload public request documents"
  on public.public_order_request_documents
  for insert
  to anon, authenticated
  with check (
    storage_bucket = 'public-order-uploads'
    and length(trim(file_name)) between 1 and 255
    and content_type in (
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    )
    and file_size_bytes between 1 and 52428800
    and storage_path ~ (
      '^public-orders/'
      || organization_id::text
      || '/'
      || public_order_request_id::text
      || '/'
      || id::text
      || '/[^/]+$'
    )
    and storage_path !~ '(^|/)\.\.(/|$)'
    and storage_path !~ '//'
    and exists (
      select 1
      from public.public_order_requests request_record
      where request_record.id = public_order_request_documents.public_order_request_id
        and request_record.organization_id = public_order_request_documents.organization_id
        and request_record.consent_accepted = true
        and request_record.status = 'pending_review'
        and request_record.submitted_at > now() - interval '24 hours'
    )
  );

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    update storage.buckets
    set
      public = false,
      file_size_limit = 52428800,
      allowed_mime_types = array[
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
      ]
    where id = 'public-order-uploads';

    execute 'drop policy if exists "public requesters can upload order files" on storage.objects';
    execute 'create policy "public requesters can upload order files" on storage.objects for insert to anon, authenticated with check (
      bucket_id = ''public-order-uploads''
      and name ~ ''^public-orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$''
      and lower(storage.extension(name)) in (''pdf'', ''csv'', ''xls'', ''xlsx'', ''jpg'', ''jpeg'', ''png'')
      and exists (
        select 1
        from public.public_order_request_documents document_record
        join public.public_order_requests request_record
          on request_record.id = document_record.public_order_request_id
         and request_record.organization_id = document_record.organization_id
        where document_record.storage_bucket = bucket_id
          and document_record.storage_path = storage.objects.name
          and document_record.expires_at > now()
          and request_record.consent_accepted = true
          and request_record.status = ''pending_review''
          and request_record.submitted_at > now() - interval ''24 hours''
      )
    )';

    execute 'drop policy if exists "org members can read public order uploads" on storage.objects';
    execute 'create policy "org members can read public order uploads" on storage.objects for select using (
      bucket_id = ''public-order-uploads''
      and exists (
        select 1
        from public.public_order_request_documents document_record
        where document_record.storage_bucket = bucket_id
          and document_record.storage_path = storage.objects.name
          and public.is_org_member(document_record.organization_id)
      )
    )';
  end if;
end $$;
