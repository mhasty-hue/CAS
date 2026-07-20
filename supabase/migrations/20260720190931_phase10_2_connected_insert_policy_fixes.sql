drop policy if exists "connected participants can insert order documents" on public.documents;
create policy "connected participants can insert order documents"
  on public.documents
  for insert
  to authenticated
  with check (
    order_id is not null
    and exists (
      select 1
      from public.orders order_record
      where order_record.id = documents.order_id
        and order_record.organization_id = documents.organization_id
    )
    and exists (
      select 1
      from public.order_participants participant_record
      where participant_record.order_id = documents.order_id
        and participant_record.revoked_at is null
        and participant_record.access_status in ('active', 'accepted', 'pending_acceptance')
        and participant_record.permissions && array[
          'upload_documents',
          'upload_report',
          'upload_xml',
          'upload_invoice',
          'respond_to_revision'
        ]
        and (
          participant_record.participant_user_id = auth.uid()
          or (
            participant_record.participant_organization_id is not null
            and app_private.is_org_member(participant_record.participant_organization_id)
          )
        )
    )
  );

drop policy if exists "bid senders can insert requests through role permissions" on public.bid_requests;
create policy "bid senders can insert requests through role permissions"
  on public.bid_requests
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.organization_members member_record
      join public.role_permissions permission_record
        on permission_record.role_id = member_record.role_id
       and permission_record.enabled = true
      where member_record.organization_id = bid_requests.sending_organization_id
        and member_record.user_id = auth.uid()
        and member_record.status = 'active'
        and permission_record.permission_key in (
          'assign_orders',
          'invite_vendors',
          'approve_vendors',
          'manage_workflows',
          'manage_company_users'
        )
    )
  );

drop policy if exists "bid senders can update requests through role permissions" on public.bid_requests;
create policy "bid senders can update requests through role permissions"
  on public.bid_requests
  for update
  to authenticated
  using (app_private.can_manage_bid_request(id))
  with check (
    exists (
      select 1
      from public.organization_members member_record
      join public.role_permissions permission_record
        on permission_record.role_id = member_record.role_id
       and permission_record.enabled = true
      where member_record.organization_id = bid_requests.sending_organization_id
        and member_record.user_id = auth.uid()
        and member_record.status = 'active'
        and permission_record.permission_key in (
          'assign_orders',
          'invite_vendors',
          'approve_vendors',
          'manage_workflows',
          'manage_company_users'
        )
    )
  );
