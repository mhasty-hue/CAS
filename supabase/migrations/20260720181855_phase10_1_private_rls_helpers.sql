create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated, service_role;

create or replace function app_private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_org_member(target_organization_id);
$$;

create or replace function app_private.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_org_admin(target_organization_id);
$$;

create or replace function app_private.has_permission(target_organization_id uuid, target_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_permission(target_organization_id, target_permission);
$$;

create or replace function app_private.has_any_permission(target_organization_id uuid, target_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_any_permission(target_organization_id, target_permissions);
$$;

create or replace function app_private.is_assigned_appraiser_for_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_assigned_appraiser_for_order(target_order_id);
$$;

create or replace function app_private.can_read_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_read_order(target_order_id);
$$;

create or replace function app_private.can_read_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_read_document(target_document_id);
$$;

revoke execute on all functions in schema app_private from public;
grant execute on function app_private.is_org_member(uuid) to anon, authenticated, service_role;
grant execute on function app_private.is_org_admin(uuid) to anon, authenticated, service_role;
grant execute on function app_private.has_permission(uuid, text) to anon, authenticated, service_role;
grant execute on function app_private.has_any_permission(uuid, text[]) to anon, authenticated, service_role;
grant execute on function app_private.is_assigned_appraiser_for_order(uuid) to anon, authenticated, service_role;
grant execute on function app_private.can_read_order(uuid) to anon, authenticated, service_role;
grant execute on function app_private.can_read_document(uuid) to anon, authenticated, service_role;

do $$
declare
  policy_record record;
  role_list text;
  using_expression text;
  check_expression text;
  create_policy_sql text;
begin
  for policy_record in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') ~ '(^|[^A-Za-z0-9_.])(has_any_permission|has_permission|is_org_member|is_org_admin|is_assigned_appraiser_for_order|can_read_order|can_read_document)\('
        or coalesce(with_check, '') ~ '(^|[^A-Za-z0-9_.])(has_any_permission|has_permission|is_org_member|is_org_admin|is_assigned_appraiser_for_order|can_read_order|can_read_document)\('
        or coalesce(qual, '') like '%public.has_any_permission(%'
        or coalesce(qual, '') like '%public.has_permission(%'
        or coalesce(qual, '') like '%public.is_org_member(%'
        or coalesce(qual, '') like '%public.is_org_admin(%'
        or coalesce(qual, '') like '%public.is_assigned_appraiser_for_order(%'
        or coalesce(qual, '') like '%public.can_read_order(%'
        or coalesce(qual, '') like '%public.can_read_document(%'
        or coalesce(with_check, '') like '%public.has_any_permission(%'
        or coalesce(with_check, '') like '%public.has_permission(%'
        or coalesce(with_check, '') like '%public.is_org_member(%'
        or coalesce(with_check, '') like '%public.is_org_admin(%'
        or coalesce(with_check, '') like '%public.is_assigned_appraiser_for_order(%'
        or coalesce(with_check, '') like '%public.can_read_order(%'
        or coalesce(with_check, '') like '%public.can_read_document(%'
      )
  loop
    select string_agg(quote_ident(role_name), ', ')
    into role_list
    from unnest(policy_record.roles) as role_name;

    using_expression := policy_record.qual;
    check_expression := policy_record.with_check;

    if using_expression is not null then
      using_expression := replace(using_expression, 'public.has_any_permission(', 'app_private.has_any_permission(');
      using_expression := replace(using_expression, 'public.has_permission(', 'app_private.has_permission(');
      using_expression := replace(using_expression, 'public.is_org_member(', 'app_private.is_org_member(');
      using_expression := replace(using_expression, 'public.is_org_admin(', 'app_private.is_org_admin(');
      using_expression := replace(using_expression, 'public.is_assigned_appraiser_for_order(', 'app_private.is_assigned_appraiser_for_order(');
      using_expression := replace(using_expression, 'public.can_read_order(', 'app_private.can_read_order(');
      using_expression := replace(using_expression, 'public.can_read_document(', 'app_private.can_read_document(');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])has_any_permission\(', '\1app_private.has_any_permission(', 'g');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])has_permission\(', '\1app_private.has_permission(', 'g');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])is_org_member\(', '\1app_private.is_org_member(', 'g');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])is_org_admin\(', '\1app_private.is_org_admin(', 'g');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])is_assigned_appraiser_for_order\(', '\1app_private.is_assigned_appraiser_for_order(', 'g');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])can_read_order\(', '\1app_private.can_read_order(', 'g');
      using_expression := regexp_replace(using_expression, '(^|[^A-Za-z0-9_.])can_read_document\(', '\1app_private.can_read_document(', 'g');
    end if;

    if check_expression is not null then
      check_expression := replace(check_expression, 'public.has_any_permission(', 'app_private.has_any_permission(');
      check_expression := replace(check_expression, 'public.has_permission(', 'app_private.has_permission(');
      check_expression := replace(check_expression, 'public.is_org_member(', 'app_private.is_org_member(');
      check_expression := replace(check_expression, 'public.is_org_admin(', 'app_private.is_org_admin(');
      check_expression := replace(check_expression, 'public.is_assigned_appraiser_for_order(', 'app_private.is_assigned_appraiser_for_order(');
      check_expression := replace(check_expression, 'public.can_read_order(', 'app_private.can_read_order(');
      check_expression := replace(check_expression, 'public.can_read_document(', 'app_private.can_read_document(');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])has_any_permission\(', '\1app_private.has_any_permission(', 'g');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])has_permission\(', '\1app_private.has_permission(', 'g');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])is_org_member\(', '\1app_private.is_org_member(', 'g');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])is_org_admin\(', '\1app_private.is_org_admin(', 'g');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])is_assigned_appraiser_for_order\(', '\1app_private.is_assigned_appraiser_for_order(', 'g');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])can_read_order\(', '\1app_private.can_read_order(', 'g');
      check_expression := regexp_replace(check_expression, '(^|[^A-Za-z0-9_.])can_read_document\(', '\1app_private.can_read_document(', 'g');
    end if;

    execute format('drop policy %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
    create_policy_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename,
      lower(policy_record.permissive),
      policy_record.cmd,
      coalesce(role_list, 'public')
    );

    if using_expression is not null then
      create_policy_sql := create_policy_sql || format(' using (%s)', using_expression);
    end if;

    if check_expression is not null then
      create_policy_sql := create_policy_sql || format(' with check (%s)', check_expression);
    end if;

    execute create_policy_sql;
  end loop;
end $$;
