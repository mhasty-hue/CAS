create or replace function app_private.can_insert_public_order_document(
  target_organization_id uuid,
  target_public_order_request_id uuid,
  target_document_id uuid,
  target_file_name text,
  target_storage_bucket text,
  target_storage_path text,
  target_content_type text,
  target_file_size_bytes bigint
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    target_storage_bucket = 'public-order-uploads'
    and length(trim(coalesce(target_file_name, ''))) between 1 and 255
    and target_content_type in (
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    )
    and target_file_size_bytes between 1 and 52428800
    and target_storage_path ~ (
      '^public-orders/'
      || target_organization_id::text
      || '/'
      || target_public_order_request_id::text
      || '/'
      || target_document_id::text
      || '/[^/]+$'
    )
    and target_storage_path !~ '(^|/)\.\.(/|$)'
    and target_storage_path !~ '//'
    and exists (
      select 1
      from public.public_order_requests request_record
      where request_record.id = target_public_order_request_id
        and request_record.organization_id = target_organization_id
        and request_record.consent_accepted = true
        and request_record.status = 'pending_review'
        and request_record.submitted_at > now() - interval '24 hours'
    );
$$;

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
    and target_object_name ~ '^public-orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
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

revoke execute on function app_private.can_insert_public_order_document(uuid, uuid, uuid, text, text, text, text, bigint) from public;
revoke execute on function app_private.can_insert_public_order_object(text, text) from public;
grant execute on function app_private.can_insert_public_order_document(uuid, uuid, uuid, text, text, text, text, bigint) to anon, authenticated, service_role;
grant execute on function app_private.can_insert_public_order_object(text, text) to anon, authenticated, service_role;

drop policy if exists "public can upload public request documents" on public.public_order_request_documents;
create policy "public can upload public request documents"
  on public.public_order_request_documents
  for insert
  to anon, authenticated
  with check (
    app_private.can_insert_public_order_document(
      organization_id,
      public_order_request_id,
      id,
      file_name,
      storage_bucket,
      storage_path,
      content_type,
      file_size_bytes
    )
  );

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists "public requesters can upload order files" on storage.objects';
    execute 'create policy "public requesters can upload order files" on storage.objects for insert to anon, authenticated with check (
      app_private.can_insert_public_order_object(bucket_id, name)
    )';
  end if;
end $$;
