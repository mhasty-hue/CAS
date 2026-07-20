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
