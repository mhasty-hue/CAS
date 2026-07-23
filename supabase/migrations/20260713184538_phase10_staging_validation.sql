create index if not exists vendor_documents_expiry_idx
  on public.vendor_documents (expires_at, approval_status);

create or replace function public.is_assigned_appraiser_for_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders order_record
    join public.appraiser_profiles appraiser
      on appraiser.id = order_record.appraiser_profile_id
    where order_record.id = target_order_id
      and appraiser.user_id = auth.uid()
      and appraiser.active = true
      and public.is_org_member(order_record.organization_id)
  );
$$;

create or replace function public.can_read_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders order_record
    where order_record.id = target_order_id
      and public.is_org_member(order_record.organization_id)
      and (
        public.has_permission(order_record.organization_id, 'view_all_orders')
        or public.has_any_permission(order_record.organization_id, array['manage_company_users', 'assign_orders'])
        or not public.has_permission(order_record.organization_id, 'view_own_orders_only')
        or order_record.created_by = auth.uid()
        or order_record.reviewer_id = auth.uid()
        or public.is_assigned_appraiser_for_order(order_record.id)
      )
  );
$$;

create or replace function public.can_read_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents document_record
    where document_record.id = target_document_id
      and public.is_org_member(document_record.organization_id)
      and (
        document_record.order_id is null
        or public.can_read_order(document_record.order_id)
      )
      and (
        document_record.visibility in ('Lender/client', 'Client', 'Public requester', 'Delivery recipient')
        or public.has_any_permission(document_record.organization_id, array[
          'view_internal_documents',
          'view_client_documents',
          'view_workfile_documents',
          'view_vendor_compliance_documents',
          'download_xml',
          'deliver_final_report'
        ])
      )
      and coalesce(document_record.deleted_at, 'infinity'::timestamptz) = 'infinity'::timestamptz
  );
$$;

create or replace function public.enforce_order_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  can_manage_order boolean;
  is_assigned_appraiser boolean;
begin
  can_manage_order := public.has_any_permission(
    old.organization_id,
    array['assign_orders', 'edit_due_dates', 'create_orders', 'manage_accounting', 'manage_company_users']
  );

  if can_manage_order then
    return new;
  end if;

  is_assigned_appraiser := public.is_assigned_appraiser_for_order(old.id);

  if not is_assigned_appraiser then
    raise exception 'Only permitted order managers or the assigned appraiser can update this order.'
      using errcode = '42501';
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.client_id is distinct from old.client_id
    or new.file_number is distinct from old.file_number
    or new.product_type is distinct from old.product_type
    or new.borrower_name is distinct from old.borrower_name
    or new.subject_address is distinct from old.subject_address
    or new.city is distinct from old.city
    or new.state is distinct from old.state
    or new.zip is distinct from old.zip
    or new.county is distinct from old.county
    or new.loan_type is distinct from old.loan_type
    or new.occupancy is distinct from old.occupancy
    or new.property_type is distinct from old.property_type
    or new.ordered_at is distinct from old.ordered_at
    or new.due_at is distinct from old.due_at
    or new.priority is distinct from old.priority
    or new.fee is distinct from old.fee
    or new.tech_fee is distinct from old.tech_fee
    or new.appraiser_payout is distinct from old.appraiser_payout
    or new.created_by is distinct from old.created_by
    or new.appraiser_profile_id is distinct from old.appraiser_profile_id
    or new.reviewer_id is distinct from old.reviewer_id
    or new.contact_name is distinct from old.contact_name
    or new.contact_phone is distinct from old.contact_phone
    or new.access_info is distinct from old.access_info
    or new.assignment_preference is distinct from old.assignment_preference
    or new.lender_contact is distinct from old.lender_contact
    or new.parcel_number is distinct from old.parcel_number
    or new.commission_split_override is distinct from old.commission_split_override
    or new.accounting_status is distinct from old.accounting_status
    or new.paid_at is distinct from old.paid_at
    or new.completed_at is distinct from old.completed_at
    or new.source is distinct from old.source
  then
    raise exception 'Assigned appraisers can update inspection progress, not assignment, fee, commission, or accounting fields.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    and new.status not in (
      'Inspection Scheduled'::public.order_status,
      'Inspected'::public.order_status,
      'Report In Progress'::public.order_status,
      'Submitted'::public.order_status,
      'Revision Sent to Appraiser'::public.order_status
    )
  then
    raise exception 'Assigned appraisers can only move orders through inspection and report submission statuses.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop policy if exists "members can read orders" on public.orders;
create policy "members can read orders" on public.orders
  for select
  using (public.can_read_order(id));

drop policy if exists "permitted users can update orders" on public.orders;
create policy "permitted users can update orders" on public.orders
  for update
  using (
    public.has_any_permission(organization_id, array['assign_orders', 'edit_due_dates', 'create_orders', 'manage_accounting', 'manage_company_users'])
    or public.is_assigned_appraiser_for_order(id)
  )
  with check (
    public.has_any_permission(organization_id, array['assign_orders', 'edit_due_dates', 'create_orders', 'manage_accounting', 'manage_company_users'])
    or public.is_assigned_appraiser_for_order(id)
  );

drop trigger if exists orders_enforce_update_scope on public.orders;
create trigger orders_enforce_update_scope
  before update on public.orders
  for each row
  execute function public.enforce_order_update_scope();

drop policy if exists "order children readable by order members" on public.order_assignments;
create policy "order children readable by order members" on public.order_assignments
  for select
  using (public.can_read_order(order_id));

drop policy if exists "order notes readable by order members" on public.order_notes;
create policy "order notes readable by order members" on public.order_notes
  for select
  using (
    exists (
      select 1
      from public.orders order_record
      where order_record.id = order_notes.order_id
        and public.can_read_order(order_record.id)
        and (
          lower(order_notes.visibility) <> 'internal'
          or public.has_any_permission(order_record.organization_id, array[
            'view_internal_documents',
            'create_orders',
            'assign_orders',
            'review_reports',
            'manage_company_users'
          ])
        )
    )
  );

drop policy if exists "order members can create notes" on public.order_notes;
create policy "order members can create notes" on public.order_notes
  for insert
  with check (public.can_read_order(order_id));

drop policy if exists "order documents readable by order members" on public.order_documents;
create policy "order documents readable by order members" on public.order_documents
  for select
  using (public.can_read_order(order_id));

drop policy if exists "document users can manage order documents" on public.order_documents;
create policy "document users can manage order documents" on public.order_documents
  for all
  using (
    public.can_read_order(order_id)
    and exists (
      select 1 from public.orders order_record
      where order_record.id = order_documents.order_id
        and public.has_any_permission(order_record.organization_id, array['upload_documents', 'upload_order_documents'])
    )
  )
  with check (
    public.can_read_order(order_id)
    and exists (
      select 1 from public.orders order_record
      where order_record.id = order_documents.order_id
        and public.has_any_permission(order_record.organization_id, array['upload_documents', 'upload_order_documents'])
    )
  );

drop policy if exists "status history readable by order members" on public.order_status_history;
create policy "status history readable by order members" on public.order_status_history
  for select
  using (public.can_read_order(order_id));

drop policy if exists "order managers can create status history" on public.order_status_history;
create policy "order managers can create status history" on public.order_status_history
  for insert
  with check (
    public.can_read_order(order_id)
    and exists (
      select 1
      from public.orders order_record
      where order_record.id = order_status_history.order_id
        and (
          public.has_any_permission(order_record.organization_id, array['create_orders', 'assign_orders', 'edit_due_dates', 'manage_company_users'])
          or public.is_assigned_appraiser_for_order(order_record.id)
        )
    )
  );

drop policy if exists "reviews readable by order members" on public.order_reviews;
create policy "reviews readable by order members" on public.order_reviews
  for select
  using (public.can_read_order(order_id));

drop policy if exists "revisions readable by order members" on public.revision_requests;
create policy "revisions readable by order members" on public.revision_requests
  for select
  using (public.can_read_order(order_id));

drop policy if exists "members can read visible documents" on public.documents;
create policy "members can read visible documents" on public.documents
  for select
  using (public.can_read_document(id));

drop policy if exists "document users can insert documents" on public.documents;
create policy "document users can insert documents" on public.documents
  for insert
  with check (
    public.has_any_permission(organization_id, array['upload_order_documents', 'upload_documents'])
    and (order_id is null or public.can_read_order(order_id))
  );

drop policy if exists "document managers can update documents" on public.documents;
create policy "document managers can update documents" on public.documents
  for update
  using (
    public.can_read_document(id)
    and public.has_any_permission(organization_id, array['upload_order_documents', 'archive_documents', 'manage_document_visibility', 'deliver_final_report'])
  )
  with check (
    public.has_any_permission(organization_id, array['upload_order_documents', 'archive_documents', 'manage_document_visibility', 'deliver_final_report'])
    and (order_id is null or public.can_read_order(order_id))
  );

drop policy if exists "members can read order messages" on public.order_messages;
create policy "members can read order messages" on public.order_messages
  for select
  using (
    public.can_read_order(order_id)
    and (
      lower(visibility) <> 'internal team'
      or public.has_any_permission(organization_id, array[
        'view_internal_documents',
        'create_orders',
        'assign_orders',
        'review_reports',
        'manage_company_users'
      ])
    )
  );

drop policy if exists "members can create order messages" on public.order_messages;
create policy "members can create order messages" on public.order_messages
  for insert
  with check (public.can_read_order(order_id));

drop policy if exists "senders and managers can update order messages" on public.order_messages;
create policy "senders and managers can update order messages" on public.order_messages
  for update
  using (
    public.can_read_order(order_id)
    and (
      sender_id = auth.uid()
      or public.has_any_permission(organization_id, array['view_internal_documents', 'manage_company_users'])
    )
  )
  with check (
    public.can_read_order(order_id)
    and (
      sender_id = auth.uid()
      or public.has_any_permission(organization_id, array['view_internal_documents', 'manage_company_users'])
    )
  );

drop policy if exists "members can read structured revisions" on public.structured_revision_requests;
create policy "members can read structured revisions" on public.structured_revision_requests
  for select
  using (public.can_read_order(order_id));

drop policy if exists "reviewers can manage structured revisions" on public.structured_revision_requests;
create policy "reviewers can manage structured revisions" on public.structured_revision_requests
  for all
  using (
    public.can_read_order(order_id)
    and public.has_any_permission(organization_id, array['review_reports', 'upload_order_documents'])
  )
  with check (
    public.can_read_order(order_id)
    and public.has_any_permission(organization_id, array['review_reports', 'upload_order_documents'])
  );

drop policy if exists "members can read structured revision items" on public.structured_revision_items;
create policy "members can read structured revision items" on public.structured_revision_items
  for select
  using (
    exists (
      select 1
      from public.structured_revision_requests request_record
      where request_record.id = structured_revision_items.revision_request_id
        and public.can_read_order(request_record.order_id)
    )
  );

drop policy if exists "reviewers can manage structured revision items" on public.structured_revision_items;
create policy "reviewers can manage structured revision items" on public.structured_revision_items
  for all
  using (
    exists (
      select 1
      from public.structured_revision_requests request_record
      where request_record.id = structured_revision_items.revision_request_id
        and public.can_read_order(request_record.order_id)
        and public.has_any_permission(request_record.organization_id, array['review_reports', 'upload_order_documents'])
    )
  )
  with check (
    exists (
      select 1
      from public.structured_revision_requests request_record
      where request_record.id = structured_revision_items.revision_request_id
        and public.can_read_order(request_record.order_id)
        and public.has_any_permission(request_record.organization_id, array['review_reports', 'upload_order_documents'])
    )
  );

drop policy if exists "members can read revision item events" on public.revision_item_events;
create policy "members can read revision item events" on public.revision_item_events
  for select
  using (
    exists (
      select 1
      from public.structured_revision_items item_record
      join public.structured_revision_requests request_record
        on request_record.id = item_record.revision_request_id
      where item_record.id = revision_item_events.revision_item_id
        and public.can_read_order(request_record.order_id)
    )
  );

drop policy if exists "revision actors can insert revision item events" on public.revision_item_events;
create policy "revision actors can insert revision item events" on public.revision_item_events
  for insert
  with check (
    exists (
      select 1
      from public.structured_revision_items item_record
      join public.structured_revision_requests request_record
        on request_record.id = item_record.revision_request_id
      where item_record.id = revision_item_events.revision_item_id
        and public.can_read_order(request_record.order_id)
    )
  );

drop policy if exists "members can read report submissions" on public.report_submissions;
create policy "members can read report submissions" on public.report_submissions
  for select
  using (public.can_read_order(order_id));

drop policy if exists "permitted users can manage report submissions" on public.report_submissions;
create policy "permitted users can manage report submissions" on public.report_submissions
  for all
  using (
    public.can_read_order(order_id)
    and public.has_any_permission(organization_id, array['review_reports', 'deliver_final_report', 'deliver_reports'])
  )
  with check (
    public.can_read_order(order_id)
    and public.has_any_permission(organization_id, array['review_reports', 'deliver_final_report', 'deliver_reports'])
  );

drop policy if exists "members can read report deliveries" on public.report_deliveries;
create policy "members can read report deliveries" on public.report_deliveries
  for select
  using (public.can_read_order(order_id));

drop policy if exists "delivery users can manage report deliveries" on public.report_deliveries;
create policy "delivery users can manage report deliveries" on public.report_deliveries
  for all
  using (
    public.can_read_order(order_id)
    and public.has_any_permission(organization_id, array['deliver_final_report', 'deliver_reports'])
  )
  with check (
    public.can_read_order(order_id)
    and public.has_any_permission(organization_id, array['deliver_final_report', 'deliver_reports'])
  );

drop policy if exists "members can read document audit events" on public.document_audit_events;
create policy "members can read document audit events" on public.document_audit_events
  for select
  using (
    public.is_org_member(organization_id)
    and (order_id is null or public.can_read_order(order_id))
  );

drop policy if exists "members can insert document audit events" on public.document_audit_events;
create policy "members can insert document audit events" on public.document_audit_events
  for insert
  with check (
    public.is_org_member(organization_id)
    and (order_id is null or public.can_read_order(order_id))
  );

drop policy if exists "members can insert audit logs" on public.audit_logs;
create policy "members can insert audit logs" on public.audit_logs
  for insert
  with check (public.is_org_member(organization_id));

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists "cas members can read private storage objects" on storage.objects';
    execute 'create policy "cas members can read private storage objects" on storage.objects for select using (
      bucket_id = ''cas-private-documents''
      and exists (
        select 1
        from public.documents document_record
        where document_record.storage_bucket = storage.objects.bucket_id
          and document_record.storage_path = storage.objects.name
          and public.can_read_document(document_record.id)
      )
    )';
  end if;
end $$;
