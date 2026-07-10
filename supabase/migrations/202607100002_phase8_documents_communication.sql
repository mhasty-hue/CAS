create extension if not exists pgcrypto;

alter table public.documents
  add column if not exists display_name text,
  add column if not exists category text,
  add column if not exists source text not null default 'Internal staff upload',
  add column if not exists version_number integer not null default 1,
  add column if not exists parent_document_id uuid references public.documents(id) on delete set null,
  add column if not exists checksum text,
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists audit_metadata jsonb not null default '{}'::jsonb,
  add column if not exists virus_scan_status text not null default 'Queued',
  add column if not exists duplicate_detection text not null default 'Not checked',
  add column if not exists archived_at timestamptz,
  add column if not exists restored_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists signed_url_last_requested_at timestamptz;

alter table public.documents alter column storage_bucket set default 'cas-private-documents';

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null,
  file_name text not null,
  storage_bucket text not null default 'cas-private-documents',
  storage_path text not null,
  content_type text,
  file_size_bytes bigint,
  checksum text,
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_at timestamptz not null default now(),
  change_note text,
  metadata jsonb not null default '{}'::jsonb,
  unique (document_id, version_number)
);

create table if not exists public.required_document_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  product_type text,
  county text,
  category text not null,
  label text not null,
  required boolean not null default true,
  visible_to text[] not null default array['Organization internal', 'Reviewer', 'Appraiser']::text[],
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.structured_revision_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  requestor text not null,
  source text not null,
  category text not null,
  priority text not null default 'Standard',
  due_at timestamptz,
  client_visible_wording text not null,
  internal_reviewer_wording text not null,
  assigned_appraiser_profile_id uuid references public.appraiser_profiles(id) on delete set null,
  status text not null default 'New',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.structured_revision_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  revision_request_id uuid not null references public.structured_revision_requests(id) on delete cascade,
  label text not null,
  related_page_section text,
  related_document_id uuid references public.documents(id) on delete set null,
  response text,
  completed boolean not null default false,
  reviewer_approved boolean not null default false,
  attachment_document_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revision_item_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  revision_request_id uuid not null references public.structured_revision_requests(id) on delete cascade,
  revision_item_id uuid references public.structured_revision_items(id) on delete cascade,
  actor_id uuid references public.user_profiles(id) on delete set null,
  actor_name text not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid references public.user_profiles(id) on delete set null,
  sender_name text not null,
  sender_role text,
  channel text not null,
  visibility text not null default 'Internal team',
  body text not null,
  attachment_document_ids uuid[] not null default '{}'::uuid[],
  pinned boolean not null default false,
  assigned_follow_up_owner text,
  follow_up_due_at timestamptz,
  related_revision_id uuid references public.structured_revision_requests(id) on delete set null,
  related_document_id uuid references public.documents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.message_read_receipts (
  message_id uuid not null references public.order_messages(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.report_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  submitted_by uuid references public.user_profiles(id) on delete set null,
  submitted_by_name text,
  submitted_at timestamptz not null default now(),
  report_pdf_document_id uuid references public.documents(id) on delete set null,
  xml_document_id uuid references public.documents(id) on delete set null,
  env_document_id uuid references public.documents(id) on delete set null,
  invoice_document_id uuid references public.documents(id) on delete set null,
  supporting_document_ids uuid[] not null default '{}'::uuid[],
  submission_note text,
  certification_accepted boolean not null default false,
  status text not null default 'Submitted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  delivered_by uuid references public.user_profiles(id) on delete set null,
  delivered_by_name text,
  delivered_at timestamptz not null default now(),
  recipient_name text not null,
  recipient_email text,
  delivery_method text not null default 'Secure link',
  included_document_ids uuid[] not null default '{}'::uuid[],
  secure_delivery_url text,
  status text not null default 'Delivered',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.document_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  message_id uuid references public.order_messages(id) on delete set null,
  revision_id uuid references public.structured_revision_requests(id) on delete set null,
  event text not null,
  actor_id uuid references public.user_profiles(id) on delete set null,
  actor_name text not null,
  detail text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.permissions (key, label, group_name) values
  ('upload_order_documents', 'canUploadOrderDocuments', 'Documents'),
  ('view_internal_documents', 'canViewInternalDocuments', 'Documents'),
  ('view_client_documents', 'canViewClientDocuments', 'Documents'),
  ('archive_documents', 'canArchiveDocuments', 'Documents'),
  ('manage_document_visibility', 'canManageDocumentVisibility', 'Documents'),
  ('deliver_final_report', 'canDeliverFinalReport', 'Documents'),
  ('view_vendor_compliance_documents', 'canViewVendorComplianceDocuments', 'Documents'),
  ('download_xml', 'canDownloadXML', 'Documents'),
  ('view_workfile_documents', 'canViewWorkfileDocuments', 'Documents')
on conflict (key) do update set
  label = excluded.label,
  group_name = excluded.group_name;

create index if not exists documents_org_category_idx on public.documents (organization_id, category, status);
create index if not exists documents_order_visibility_idx on public.documents (order_id, visibility, created_at desc);
create index if not exists document_versions_document_idx on public.document_versions (document_id, version_number desc);
create index if not exists required_document_rules_scope_idx on public.required_document_rules (organization_id, client_id, product_type, county, active);
create index if not exists order_messages_order_idx on public.order_messages (order_id, created_at desc);
create index if not exists order_messages_org_channel_idx on public.order_messages (organization_id, channel, created_at desc);
create index if not exists structured_revision_requests_order_idx on public.structured_revision_requests (order_id, status, due_at);
create index if not exists structured_revision_items_revision_idx on public.structured_revision_items (revision_request_id, completed);
create index if not exists report_submissions_order_idx on public.report_submissions (order_id, submitted_at desc);
create index if not exists report_deliveries_order_idx on public.report_deliveries (order_id, delivered_at desc);
create index if not exists document_audit_events_org_order_idx on public.document_audit_events (organization_id, order_id, created_at desc);

drop trigger if exists required_document_rules_set_updated_at on public.required_document_rules;
create trigger required_document_rules_set_updated_at before update on public.required_document_rules for each row execute function public.set_updated_at();

drop trigger if exists structured_revision_requests_set_updated_at on public.structured_revision_requests;
create trigger structured_revision_requests_set_updated_at before update on public.structured_revision_requests for each row execute function public.set_updated_at();

drop trigger if exists structured_revision_items_set_updated_at on public.structured_revision_items;
create trigger structured_revision_items_set_updated_at before update on public.structured_revision_items for each row execute function public.set_updated_at();

alter table public.document_versions enable row level security;
alter table public.required_document_rules enable row level security;
alter table public.structured_revision_requests enable row level security;
alter table public.structured_revision_items enable row level security;
alter table public.revision_item_events enable row level security;
alter table public.order_messages enable row level security;
alter table public.message_read_receipts enable row level security;
alter table public.report_submissions enable row level security;
alter table public.report_deliveries enable row level security;
alter table public.document_audit_events enable row level security;

drop policy if exists "members can read documents" on public.documents;
drop policy if exists "document users can manage documents" on public.documents;
create policy "members can read visible documents" on public.documents for select using (
  public.is_org_member(organization_id)
  and (
    visibility in ('Lender/client', 'Client', 'Public requester', 'Delivery recipient')
    or public.has_any_permission(organization_id, array['view_internal_documents', 'view_client_documents', 'view_workfile_documents', 'download_xml', 'deliver_final_report'])
  )
);
create policy "document users can insert documents" on public.documents for insert with check (
  public.has_any_permission(organization_id, array['upload_order_documents', 'upload_documents'])
);
create policy "document managers can update documents" on public.documents for update using (
  public.has_any_permission(organization_id, array['upload_order_documents', 'archive_documents', 'manage_document_visibility', 'deliver_final_report'])
) with check (
  public.has_any_permission(organization_id, array['upload_order_documents', 'archive_documents', 'manage_document_visibility', 'deliver_final_report'])
);
create policy "document deleters can delete documents" on public.documents for delete using (
  public.has_any_permission(organization_id, array['delete_documents'])
);

create policy "members can read document versions" on public.document_versions for select using (public.is_org_member(organization_id));
create policy "uploaders can manage document versions" on public.document_versions for all using (
  public.has_any_permission(organization_id, array['upload_order_documents', 'upload_documents'])
) with check (
  public.has_any_permission(organization_id, array['upload_order_documents', 'upload_documents'])
);

create policy "members can read required document rules" on public.required_document_rules for select using (
  organization_id is null or public.is_org_member(organization_id)
);
create policy "document managers can manage required document rules" on public.required_document_rules for all using (
  organization_id is not null and public.has_any_permission(organization_id, array['manage_document_visibility', 'customize_order_forms'])
) with check (
  organization_id is not null and public.has_any_permission(organization_id, array['manage_document_visibility', 'customize_order_forms'])
);

create policy "members can read order messages" on public.order_messages for select using (public.is_org_member(organization_id));
create policy "members can create order messages" on public.order_messages for insert with check (public.is_org_member(organization_id));
create policy "senders and managers can update order messages" on public.order_messages for update using (
  sender_id = auth.uid() or public.has_any_permission(organization_id, array['view_internal_documents', 'manage_company_users'])
) with check (
  sender_id = auth.uid() or public.has_any_permission(organization_id, array['view_internal_documents', 'manage_company_users'])
);

create policy "users can manage own read receipts" on public.message_read_receipts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members can read message read receipts" on public.message_read_receipts for select using (
  exists (
    select 1
    from public.order_messages message
    where message.id = message_read_receipts.message_id
      and public.is_org_member(message.organization_id)
  )
);

create policy "members can read structured revisions" on public.structured_revision_requests for select using (public.is_org_member(organization_id));
create policy "reviewers can manage structured revisions" on public.structured_revision_requests for all using (
  public.has_any_permission(organization_id, array['review_reports', 'upload_order_documents'])
) with check (
  public.has_any_permission(organization_id, array['review_reports', 'upload_order_documents'])
);

create policy "members can read structured revision items" on public.structured_revision_items for select using (public.is_org_member(organization_id));
create policy "reviewers can manage structured revision items" on public.structured_revision_items for all using (
  public.has_any_permission(organization_id, array['review_reports', 'upload_order_documents'])
) with check (
  public.has_any_permission(organization_id, array['review_reports', 'upload_order_documents'])
);

create policy "members can read revision item events" on public.revision_item_events for select using (public.is_org_member(organization_id));
create policy "revision actors can insert revision item events" on public.revision_item_events for insert with check (public.is_org_member(organization_id));

create policy "members can read report submissions" on public.report_submissions for select using (public.is_org_member(organization_id));
create policy "permitted users can manage report submissions" on public.report_submissions for all using (
  public.has_any_permission(organization_id, array['review_reports', 'deliver_final_report', 'deliver_reports'])
) with check (
  public.has_any_permission(organization_id, array['review_reports', 'deliver_final_report', 'deliver_reports'])
);

create policy "members can read report deliveries" on public.report_deliveries for select using (public.is_org_member(organization_id));
create policy "delivery users can manage report deliveries" on public.report_deliveries for all using (
  public.has_any_permission(organization_id, array['deliver_final_report', 'deliver_reports'])
) with check (
  public.has_any_permission(organization_id, array['deliver_final_report', 'deliver_reports'])
);

create policy "members can read document audit events" on public.document_audit_events for select using (public.is_org_member(organization_id));
create policy "members can insert document audit events" on public.document_audit_events for insert with check (public.is_org_member(organization_id));

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('cas-private-documents', 'cas-private-documents', false, 52428800, array['application/pdf', 'application/xml', 'image/jpeg', 'image/png', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
      ('cas-public-order-uploads', 'cas-public-order-uploads', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "cas members can read private storage objects" on storage.objects';
    execute 'create policy "cas members can read private storage objects" on storage.objects for select using (
      bucket_id = ''cas-private-documents''
      and exists (
        select 1 from public.documents document_record
        where document_record.storage_bucket = bucket_id
          and document_record.storage_path = storage.objects.name
          and public.is_org_member(document_record.organization_id)
      )
    )';

    execute 'drop policy if exists "cas uploaders can insert private storage objects" on storage.objects';
    execute 'create policy "cas uploaders can insert private storage objects" on storage.objects for insert with check (
      bucket_id = ''cas-private-documents''
      and exists (
        select 1 from public.organizations organization_record
        where storage.objects.name like ''organizations/'' || organization_record.id::text || ''/%''
          and public.has_any_permission(organization_record.id, array[''upload_order_documents'', ''upload_documents''])
      )
    )';
  end if;
end $$;
