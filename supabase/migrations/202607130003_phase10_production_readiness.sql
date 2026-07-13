grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on public.public_order_settings to anon;
grant insert on public.public_order_requests to anon;
grant insert on public.public_order_request_documents to anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, email, avatar_url, phone, active, metadata)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, 'CAS user'),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    true,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    phone = excluded.phone,
    active = true,
    metadata = public.user_profiles.metadata || excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'public-order-uploads',
      'public-order-uploads',
      false,
      52428800,
      array['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']
    )
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "public requesters can upload order files" on storage.objects';
    execute 'create policy "public requesters can upload order files" on storage.objects for insert with check (
      bucket_id = ''public-order-uploads''
      and name like ''public-orders/%''
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
