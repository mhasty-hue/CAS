insert into public.permissions (key, label, group_name) values
  ('view_all_orders', 'View all orders', 'Orders'),
  ('create_orders', 'Create orders', 'Orders'),
  ('assign_orders', 'Assign orders', 'Orders'),
  ('edit_due_dates', 'Edit due dates', 'Orders'),
  ('upload_documents', 'Upload documents', 'Documents'),
  ('delete_documents', 'Delete documents', 'Documents'),
  ('see_accounting', 'See accounting', 'Accounting'),
  ('see_appraiser_payouts', 'See appraiser payouts', 'Accounting'),
  ('manage_users', 'Manage users', 'Admin'),
  ('manage_clients', 'Manage clients', 'Admin'),
  ('review_reports', 'Review reports', 'Review'),
  ('deliver_reports', 'Deliver reports', 'Review'),
  ('invite_vendors', 'Invite vendors', 'AMC'),
  ('approve_vendors', 'Approve vendors', 'AMC'),
  ('manage_workflows', 'Manage workflows', 'Admin'),
  ('export_reports', 'Export reports', 'Reporting')
on conflict (key) do update set label = excluded.label, group_name = excluded.group_name;

insert into public.organizations (id, name, slug, type, brand_color) values
  ('11111111-1111-1111-1111-111111111111', 'CAA Valuation Group', 'caa-valuation-group', 'appraisal_firm', '#2276d2'),
  ('22222222-2222-2222-2222-222222222222', 'Pioneer AMC', 'pioneer-amc', 'amc', '#0f8b63')
on conflict (slug) do nothing;

insert into public.roles (id, organization_id, name, system_key, description) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Company Admin', 'company_admin', 'Full access inside the appraisal firm'),
  ('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Office Staff', 'office_staff', 'Order intake and operations'),
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Reviewer', 'reviewer', 'Review queue and delivery'),
  ('aaaaaaaa-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'Appraiser', 'appraiser', 'Assigned order portal'),
  ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'AMC Admin', 'amc_admin', 'Vendor panel and AMC orders')
on conflict (organization_id, name) do nothing;

insert into public.role_permissions (role_id, permission_key, enabled)
select 'aaaaaaaa-0000-4000-8000-000000000001', key, true from public.permissions
on conflict (role_id, permission_key) do update set enabled = excluded.enabled;

insert into public.role_permissions (role_id, permission_key, enabled) values
  ('aaaaaaaa-0000-4000-8000-000000000002', 'view_all_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'create_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'assign_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'edit_due_dates', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'upload_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'review_reports', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'deliver_reports', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'view_all_orders', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'invite_vendors', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'approve_vendors', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'create_orders', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'view_all_orders', true)
on conflict (role_id, permission_key) do update set enabled = excluded.enabled;

insert into public.clients (id, organization_id, name, type, primary_contact, email, billing_terms) values
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'HarborPoint Lending', 'lender', 'Claire Moon', 'claire@harborpoint.example', 'Net 30'),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Northstar Mortgage', 'lender', 'Sam Ortiz', 'sam@northstar.example', 'Net 15'),
  ('c0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Pioneer AMC', 'amc', 'Lina Ross', 'lina@pioneer.example', 'Monthly')
on conflict do nothing;

insert into public.appraiser_profiles (id, organization_id, display_name, license_number, license_state, license_expires_at, eo_expires_at, default_split_percent, coverage_summary) values
  ('d0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jordan Lee', 'GA-45621', 'GA', '2027-04-30', '2027-01-15', 60, 'Cobb, Paulding, Cherokee'),
  ('d0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Priya Shah', 'GA-49218', 'GA', '2026-07-27', '2027-03-01', 60, 'Fulton, DeKalb, Gwinnett'),
  ('d0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Marcus King', 'GA-41772', 'GA', '2027-10-09', '2027-09-12', 58, 'Cherokee, Bartow, Cobb')
on conflict do nothing;

insert into public.orders (id, organization_id, client_id, file_number, product_type, borrower_name, subject_address, city, state, zip, county, loan_type, occupancy, property_type, ordered_at, due_at, inspection_at, status, priority, fee, tech_fee, appraiser_payout, next_action) values
  ('e0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'CAA-26-1048', '1004 URAR', 'Avery Mitchell', '1840 Magnolia Trace', 'Marietta', 'GA', '30064', 'Cobb', 'Conventional', 'Primary residence', 'Single family', '2026-06-24 09:18:00-04', '2026-06-30 17:00:00-04', '2026-06-27 10:00:00-04', 'In Review', 'High', 575, 25, 345, 'Complete review checklist'),
  ('e0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000002', 'CAA-26-1049', 'FHA 1004', 'Sofia Grant', '72 Riverbend Court', 'Roswell', 'GA', '30076', 'Fulton', 'FHA', 'Primary residence', 'Single family', '2026-06-23 09:30:00-04', '2026-06-29 17:00:00-04', '2026-06-26 11:30:00-04', 'Revisions Needed', 'Rush', 650, 35, 390, 'Appraiser response due today'),
  ('e0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'CAA-26-1053', '1004 URAR', 'Mina Patel', '18 Cedar Grove Place', 'Smyrna', 'GA', '30080', 'Cobb', 'Conventional', 'Primary residence', 'Single family', '2026-06-29 10:31:00-04', '2026-07-05 17:00:00-04', null, 'Unassigned', 'Standard', 550, 25, 330, 'Assign appraiser')
on conflict (organization_id, file_number) do nothing;

insert into public.workflow_templates (id, organization_id, name, is_default) values
  ('f0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Default appraisal workflow', true)
on conflict do nothing;

insert into public.workflow_steps (workflow_template_id, name, sort_order, required_fields, required_documents, trigger_notifications, trigger_accounting_event) values
  ('f0000000-0000-4000-8000-000000000001', 'New Order', 1, array['client_id','borrower_name','subject_address'], array['engagement_letter'], true, false),
  ('f0000000-0000-4000-8000-000000000001', 'Assigned', 2, array['appraiser_profile_id'], array[]::text[], true, false),
  ('f0000000-0000-4000-8000-000000000001', 'Inspection Scheduled', 3, array['inspection_at'], array[]::text[], true, false),
  ('f0000000-0000-4000-8000-000000000001', 'Submitted', 4, array[]::text[], array['report'], true, false),
  ('f0000000-0000-4000-8000-000000000001', 'Ready for Delivery', 5, array[]::text[], array['final_report'], true, true)
on conflict do nothing;

insert into public.automation_rules (organization_id, name, trigger_event, conditions, actions, active) values
  ('11111111-1111-1111-1111-111111111111', 'Assign reviewer when report is submitted', 'order.status_changed', '{"to_status":"Submitted"}', '[{"type":"assign_reviewer","strategy":"least_loaded"}]', false),
  ('11111111-1111-1111-1111-111111111111', 'Notify appraiser before due date', 'schedule.daily', '{"due_in_days":1,"status_not_in":["Submitted","In Review","Ready for Delivery","Completed"]}', '[{"type":"send_notification","audience":"appraiser"}]', false)
on conflict do nothing;

insert into public.vendor_profiles (id, amc_organization_id, company_name, contact_name, contact_email, status, specialties, turn_time_days, capacity) values
  ('90000000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'North Metro Valuation', 'Renee Walker', 'renee@example.com', 'approved', array['FHA','Conventional','Luxury'], 5, 14),
  ('90000000-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', 'Peachtree Appraisal Group', 'Andre Holt', 'andre@example.com', 'pending_documents', array['VA','FHA','Rural'], 6, 9)
on conflict do nothing;
