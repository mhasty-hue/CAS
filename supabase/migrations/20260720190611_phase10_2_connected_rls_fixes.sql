drop policy if exists "connected participants can read granted documents" on public.documents;
create policy "connected participants can read granted documents"
  on public.documents
  for select
  to authenticated
  using (app_private.can_read_document(id));

drop policy if exists "bid senders manage requests" on public.bid_requests;

create policy "bid senders can insert requests"
  on public.bid_requests
  for insert
  to authenticated
  with check (
    app_private.is_org_admin(sending_organization_id)
    or app_private.has_any_permission(
      sending_organization_id,
      array['assign_orders', 'invite_vendors', 'approve_vendors', 'manage_workflows']
    )
  );

create policy "bid senders can update requests"
  on public.bid_requests
  for update
  to authenticated
  using (app_private.can_manage_bid_request(id))
  with check (
    app_private.is_org_admin(sending_organization_id)
    or app_private.has_any_permission(
      sending_organization_id,
      array['assign_orders', 'invite_vendors', 'approve_vendors', 'manage_workflows']
    )
  );

create policy "bid senders can delete requests"
  on public.bid_requests
  for delete
  to authenticated
  using (app_private.can_manage_bid_request(id));

grant insert, update, delete on public.county_adjacency to authenticated;

drop policy if exists "authenticated users can manage county adjacency" on public.county_adjacency;
create policy "authenticated users can manage county adjacency"
  on public.county_adjacency
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
