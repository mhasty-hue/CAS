drop policy if exists "members can read visible documents" on public.documents;
create policy "members can read visible documents" on public.documents
  for select
  using (
    public.is_org_member(organization_id)
    and (
      order_id is null
      or public.can_read_order(order_id)
    )
    and (
      visibility in ('Lender/client', 'Client', 'Public requester', 'Delivery recipient')
      or public.has_any_permission(organization_id, array[
        'view_internal_documents',
        'view_client_documents',
        'view_workfile_documents',
        'view_vendor_compliance_documents',
        'download_xml',
        'deliver_final_report'
      ])
    )
    and coalesce(deleted_at, 'infinity'::timestamptz) = 'infinity'::timestamptz
  );
