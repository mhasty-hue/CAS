alter table public.public_order_request_documents
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.public_order_request_documents.metadata is
  'Public intake upload processing metadata such as checksum, safe stored filename, source, and scan status.';

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    update storage.buckets
    set
      public = false,
      file_size_limit = 104857600,
      allowed_mime_types = array[
        'application/pdf',
        'application/xml',
        'text/xml',
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/zip',
        'application/x-zip-compressed',
        'application/vnd.ms-excel',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    where id = 'cas-private-documents';

    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      (
        'public-order-uploads',
        'public-order-uploads',
        false,
        26214400,
        array[
          'application/pdf',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png'
        ]
      )
    on conflict (id) do update set
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

create or replace function app_private.can_insert_private_storage_object(
  target_bucket_id text,
  target_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
  select
    target_bucket_id = 'cas-private-documents'
    and (
      target_object_name ~ '^organizations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/versions/[0-9]+/[^/]+$'
      or target_object_name ~ '^organizations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/reports/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/v[0-9]+/[^/]+$'
      or target_object_name ~ '^organizations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/vendors/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/compliance/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/versions/[0-9]+/[^/]+$'
      or target_object_name ~ '^organizations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/invoices/[^/]+$'
    )
    and target_object_name !~ '(^|/)\.\.(/|$)'
    and target_object_name !~ '//'
    and lower(storage.extension(target_object_name)) in ('pdf', 'xml', 'env', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'xls', 'csv', 'zip')
    and exists (
      select 1
      from public.organizations organization_record
      where target_object_name like ('organizations/' || organization_record.id::text || '/%')
        and public.has_any_permission(
          organization_record.id,
          array['upload_order_documents', 'upload_documents']
        )
    );
$$;

revoke execute on function app_private.can_insert_private_storage_object(text, text) from public;
grant execute on function app_private.can_insert_private_storage_object(text, text) to authenticated, service_role;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists "cas uploaders can insert private storage objects" on storage.objects';
    execute 'create policy "cas uploaders can insert private storage objects" on storage.objects for insert to authenticated with check (
      app_private.can_insert_private_storage_object(bucket_id, name)
    )';
  end if;
end $$;

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
    and file_size_bytes between 1 and 26214400
    and (
      storage_path ~ (
        '^intake/'
        || public_order_request_id::text
        || '/'
        || id::text
        || '/[^/]+$'
      )
      or storage_path ~ (
        '^public-orders/'
        || organization_id::text
        || '/'
        || public_order_request_id::text
        || '/'
        || id::text
        || '/[^/]+$'
      )
    )
    and storage_path !~ '(^|/)\.\.(/|$)'
    and storage_path !~ '//'
    and expires_at > now()
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

create or replace function app_private.can_insert_public_order_object(
  target_bucket_id text,
  target_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
  select
    target_bucket_id = 'public-order-uploads'
    and (
      target_object_name ~ '^intake/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
      or target_object_name ~ '^public-orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    )
    and lower(storage.extension(target_object_name)) in ('pdf', 'csv', 'xls', 'xlsx', 'jpg', 'jpeg', 'png')
    and exists (
      select 1
      from public.public_order_request_documents document_record
      join public.public_order_requests request_record
        on request_record.id = document_record.public_order_request_id
       and request_record.organization_id = document_record.organization_id
      where document_record.storage_bucket = target_bucket_id
        and document_record.storage_path = target_object_name
        and document_record.expires_at > now()
        and request_record.consent_accepted = true
        and request_record.status = 'pending_review'
        and request_record.submitted_at > now() - interval '24 hours'
    );
$$;

revoke execute on function app_private.can_insert_public_order_object(text, text) from public;
grant execute on function app_private.can_insert_public_order_object(text, text) to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists "public requesters can upload order files" on storage.objects';
    execute 'create policy "public requesters can upload order files" on storage.objects for insert to anon, authenticated with check (
      app_private.can_insert_public_order_object(bucket_id, name)
    )';
  end if;
end $$;

comment on function app_private.can_insert_public_order_object(text, text) is
  'Validates anonymous public-intake storage inserts against metadata rows, expiration, consent, allowed file types, and standardized intake object paths.';
