create or replace function app_private.can_create_connected_document(
  target_order_id uuid,
  target_organization_id uuid,
  target_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    target_order_id is not null
    and exists (
      select 1
      from public.orders order_record
      where order_record.id = target_order_id
        and order_record.organization_id = target_organization_id
    )
    and (
      app_private.can_manage_connected_order(target_order_id)
      or exists (
        select 1
        from public.order_participants participant_record
        where participant_record.order_id = target_order_id
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
          and target_visibility = any(participant_record.document_visibility)
      )
    );
$$;

revoke all on function app_private.can_create_connected_document(uuid, uuid, text) from public;
revoke all on function app_private.can_create_connected_document(uuid, uuid, text) from anon;
grant execute on function app_private.can_create_connected_document(uuid, uuid, text) to authenticated, service_role;

drop policy if exists "connected participants can insert order documents" on public.documents;
create policy "connected participants can insert order documents"
  on public.documents
  for insert
  to authenticated
  with check (
    app_private.can_create_connected_document(order_id, organization_id, visibility)
  );

drop policy if exists "document users can insert documents" on public.documents;
create policy "document users can insert documents"
  on public.documents
  for insert
  to authenticated
  with check (
    (
      app_private.has_any_permission(
        organization_id,
        array['upload_order_documents', 'upload_documents']
      )
      and (
        order_id is null
        or app_private.can_read_order(order_id)
      )
    )
    or app_private.can_create_connected_document(order_id, organization_id, visibility)
  );
