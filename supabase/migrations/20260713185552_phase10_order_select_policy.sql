drop policy if exists "members can read orders" on public.orders;
create policy "members can read orders" on public.orders
  for select
  using (
    public.is_org_member(organization_id)
    and (
      public.has_permission(organization_id, 'view_all_orders')
      or public.has_any_permission(organization_id, array['manage_company_users', 'assign_orders'])
      or not public.has_permission(organization_id, 'view_own_orders_only')
      or created_by = auth.uid()
      or reviewer_id = auth.uid()
      or exists (
        select 1
        from public.appraiser_profiles appraiser
        where appraiser.id = orders.appraiser_profile_id
          and appraiser.user_id = auth.uid()
          and appraiser.active = true
      )
    )
  );
