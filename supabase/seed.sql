insert into public.permissions (key, label, group_name) values
  ('view_all_orders', 'View all orders', 'Orders'),
  ('create_orders', 'Create orders', 'Orders'),
  ('assign_orders', 'Assign orders', 'Orders'),
  ('edit_due_dates', 'Edit due dates', 'Orders'),
  ('upload_documents', 'Upload documents', 'Documents'),
  ('delete_documents', 'Delete documents', 'Documents'),
  ('upload_order_documents', 'canUploadOrderDocuments', 'Documents'),
  ('view_internal_documents', 'canViewInternalDocuments', 'Documents'),
  ('view_client_documents', 'canViewClientDocuments', 'Documents'),
  ('archive_documents', 'canArchiveDocuments', 'Documents'),
  ('manage_document_visibility', 'canManageDocumentVisibility', 'Documents'),
  ('deliver_final_report', 'canDeliverFinalReport', 'Documents'),
  ('view_vendor_compliance_documents', 'canViewVendorComplianceDocuments', 'Documents'),
  ('download_xml', 'canDownloadXML', 'Documents'),
  ('view_workfile_documents', 'canViewWorkfileDocuments', 'Documents'),
  ('see_accounting', 'See accounting', 'Accounting'),
  ('see_appraiser_payouts', 'See appraiser payouts', 'Accounting'),
  ('manage_users', 'Manage users', 'Admin'),
  ('manage_clients', 'Manage clients', 'Admin'),
  ('review_reports', 'Review reports', 'Review'),
  ('deliver_reports', 'Deliver reports', 'Review'),
  ('invite_vendors', 'Invite vendors', 'AMC'),
  ('approve_vendors', 'Approve vendors', 'AMC'),
  ('manage_workflows', 'Manage workflows', 'Admin'),
  ('export_reports', 'Export reports', 'Reporting'),
  ('view_own_orders_only', 'View own orders only', 'Orders'),
  ('invite_users', 'canInviteUsers', 'Company users'),
  ('manage_company_users', 'canManageCompanyUsers', 'Company users'),
  ('manage_accounting', 'canManageAccounting', 'Accounting'),
  ('customize_order_forms', 'canCustomizeOrderForms', 'Order intake')
on conflict (key) do update set label = excluded.label, group_name = excluded.group_name;

insert into public.organizations (id, name, slug, type, status, primary_contact, email, phone, address, brand_color, settings) values
  ('11111111-1111-1111-1111-111111111111', 'CAA Valuation Group', 'caa-valuation-group', 'appraisal_firm', 'active', 'Nora Fields', 'ops@caavaluation.example', '(404) 555-0100', '1100 Circle 75 Pkwy, Atlanta, GA', '#2276d2', '{"timezone":"America/New_York","demoMode":true}'),
  ('22222222-2222-2222-2222-222222222222', 'Pioneer AMC', 'pioneer-amc', 'amc', 'active', 'Derek Sloan', 'vendors@pioneeramc.example', '(404) 555-0191', '2555 Cumberland Pkwy, Atlanta, GA', '#0f8b63', '{"timezone":"America/New_York"}'),
  ('33333333-3333-3333-3333-333333333333', 'HarborPoint Lending', 'harborpoint-lending', 'lender_client', 'active', 'Claire Moon', 'orders@harborpoint.example', '(404) 555-0144', '200 Market Street, Savannah, GA', '#2d6cdf', '{"preferredDelivery":["PDF","XML"]}'),
  ('44444444-4444-4444-4444-444444444444', 'North Metro Valuation', 'north-metro-valuation', 'solo_appraiser', 'active', 'Renee Walker', 'renee@northmetro.example', '(678) 555-0185', '44 Church Street, Marietta, GA', '#455a64', '{}')
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  status = excluded.status,
  primary_contact = excluded.primary_contact,
  email = excluded.email,
  phone = excluded.phone,
  address = excluded.address,
  brand_color = excluded.brand_color,
  settings = excluded.settings;

insert into public.roles (id, organization_id, name, system_key, description) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Company Admin', 'company_admin', 'Full access inside the appraisal firm'),
  ('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Office Staff', 'office_staff', 'Order intake and operations'),
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Reviewer', 'reviewer', 'Review queue and delivery'),
  ('aaaaaaaa-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'Appraiser', 'appraiser', 'Assigned order portal'),
  ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'AMC Admin', 'amc_admin', 'Vendor panel and AMC orders')
on conflict (organization_id, name) do update set system_key = excluded.system_key, description = excluded.description;

insert into public.role_permissions (role_id, permission_key, enabled)
select 'aaaaaaaa-0000-4000-8000-000000000001', key, true from public.permissions
on conflict (role_id, permission_key) do update set enabled = excluded.enabled;

insert into public.role_permissions (role_id, permission_key, enabled) values
  ('aaaaaaaa-0000-4000-8000-000000000002', 'view_all_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'create_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'assign_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'edit_due_dates', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'upload_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'upload_order_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'view_internal_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'view_client_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'archive_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'manage_document_visibility', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'deliver_final_report', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'download_xml', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'manage_clients', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'view_all_orders', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'upload_order_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'view_internal_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'view_workfile_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'download_xml', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'review_reports', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'deliver_reports', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'deliver_final_report', true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'upload_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'upload_order_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'view_workfile_documents', true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'download_xml', true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'see_appraiser_payouts', true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'view_own_orders_only', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'invite_vendors', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'approve_vendors', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'create_orders', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'view_all_orders', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'upload_order_documents', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'view_client_documents', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'view_vendor_compliance_documents', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'deliver_final_report', true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'export_reports', true)
on conflict (role_id, permission_key) do update set enabled = excluded.enabled;

insert into public.invitations (id, organization_id, invited_email, invited_name, role_id, token, expires_at, status, permission_overrides, note) values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'sam@caavaluation.example', 'Sam Ortega', 'aaaaaaaa-0000-4000-8000-000000000004', 'demo-sam-ortega-invite', now() + interval '14 days', 'pending', '{"view_own_orders_only":true}', 'Pending appraiser invite from demo company users.')
on conflict (token) do update set invited_name = excluded.invited_name, role_id = excluded.role_id, status = excluded.status, permission_overrides = excluded.permission_overrides, note = excluded.note;

insert into public.clients (id, organization_id, name, type, status, primary_contact, email, phone, billing_terms, billing_email, default_turn_days, notes, client_rules) values
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'HarborPoint Lending', 'lender', 'active', 'Claire Moon', 'claire@harborpoint.example', '(404) 555-0144', 'Net 30', 'ap@harborpoint.example', 5, 'Prefers XML and final PDF delivered together. Rush orders require processor approval.', '{"delivery":["PDF","XML"],"rushRequiresApproval":true}'),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Northstar Mortgage', 'lender', 'active', 'Mallory Chen', 'orders@northstar.example', '(678) 555-0108', 'Net 15', 'accounting@northstar.example', 6, 'FHA files need repair commentary highlighted in client comments before delivery.', '{"fhaReview":true}'),
  ('c0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Pioneer AMC', 'amc', 'active', 'Lina Ross', 'lina@pioneer.example', '(404) 555-0191', 'Monthly', 'ap@pioneeramc.example', 5, 'AMC orders require status updates at inspection scheduled, inspected, and submitted.', '{"statusMilestones":["Inspection Scheduled","Inspected","Submitted"]}'),
  ('c0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'Seaside Bank', 'lender', 'active', 'Gina Porter', 'gina@seaside.example', '(912) 555-0177', 'Net 30', 'ap@seaside.example', 7, 'Coastal and flood-zone files often need secondary review before client delivery.', '{"secondaryReviewForFloodZone":true}'),
  ('c0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'RidgeLine Bank', 'lender', 'inactive', 'Elliot Shaw', 'elliot@ridgeline.example', '(706) 555-0182', 'Net 30', 'ap@ridgeline.example', 8, 'Inactive while fee schedule is under renegotiation.', '{}')
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  status = excluded.status,
  primary_contact = excluded.primary_contact,
  email = excluded.email,
  phone = excluded.phone,
  billing_terms = excluded.billing_terms,
  billing_email = excluded.billing_email,
  default_turn_days = excluded.default_turn_days,
  notes = excluded.notes,
  client_rules = excluded.client_rules;

insert into public.client_contacts (id, organization_id, client_id, name, title, email, phone, is_primary) values
  ('cc000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'Claire Moon', 'VP Mortgage Ops', 'claire@harborpoint.example', '(404) 555-0144', true),
  ('cc000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'Jon Reyes', 'Processor', 'jon@harborpoint.example', '(404) 555-0199', false),
  ('cc000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000002', 'Mallory Chen', 'Order Desk', 'orders@northstar.example', '(678) 555-0108', true),
  ('cc000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000004', 'Gina Porter', 'Collateral Manager', 'gina@seaside.example', '(912) 555-0177', true),
  ('cc000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000005', 'Elliot Shaw', 'Credit Admin', 'elliot@ridgeline.example', '(706) 555-0182', true)
on conflict (id) do update set name = excluded.name, title = excluded.title, email = excluded.email, phone = excluded.phone, is_primary = excluded.is_primary;

insert into public.client_fee_defaults (id, organization_id, client_id, product_type, fee, turn_time_days, active) values
  ('cf000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', '1004 URAR', 575, 5, true),
  ('cf000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'FHA 1004', 650, 6, true),
  ('cf000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000002', '1004 URAR', 595, 6, true),
  ('cf000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000002', 'Desktop Review', 250, 2, true),
  ('cf000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000004', 'Luxury 1004', 925, 8, true),
  ('cf000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000005', '2055 Exterior', 425, 4, true)
on conflict (client_id, product_type) do update set fee = excluded.fee, turn_time_days = excluded.turn_time_days, active = excluded.active;

insert into public.appraiser_profiles (id, organization_id, display_name, role, email, license_number, license_state, license_expires_at, eo_expires_at, default_split_percent, coverage_summary, capacity, active_orders, due_this_week, avg_turn_days, revision_rate, payout_due, active) values
  ('d0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jordan Lee', 'Staff', 'jordan@caavaluation.example', 'GA-45621', 'GA', '2027-04-30', '2027-01-15', 60, 'Cobb, Paulding, Cherokee', 12, 10, 6, 5.2, 4.8, 6320, true),
  ('d0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Priya Shah', 'Panel', 'priya@example.com', 'GA-49218', 'GA', '2026-07-27', '2027-03-01', 58, 'Fulton, DeKalb, Gwinnett', 10, 8, 5, 5.6, 5.9, 4875, true),
  ('d0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Marcus King', 'Staff', 'marcus@caavaluation.example', 'GA-41772', 'GA', '2027-10-09', '2027-09-12', 62, 'Cherokee, Bartow, Cobb', 9, 6, 3, 4.9, 3.2, 3920, true),
  ('d0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'Talia Morris', 'Solo', 'talia@appraisals.example', 'GA-50112', 'GA', '2027-12-31', '2027-06-30', 70, 'Fulton, Cobb, DeKalb', 7, 5, 3, 6.1, 7.4, 2880, true),
  ('d0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'Ari Bennett', 'Panel', 'ari@example.com', 'GA-47771', 'GA', '2028-03-31', '2027-05-15', 55, 'Douglas, Paulding, Cobb', 8, 3, 1, 5.4, 4.1, 1410, true)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  email = excluded.email,
  license_number = excluded.license_number,
  license_state = excluded.license_state,
  license_expires_at = excluded.license_expires_at,
  eo_expires_at = excluded.eo_expires_at,
  default_split_percent = excluded.default_split_percent,
  coverage_summary = excluded.coverage_summary,
  capacity = excluded.capacity,
  active_orders = excluded.active_orders,
  due_this_week = excluded.due_this_week,
  avg_turn_days = excluded.avg_turn_days,
  revision_rate = excluded.revision_rate,
  payout_due = excluded.payout_due,
  active = excluded.active;

insert into public.orders (id, organization_id, client_id, file_number, product_type, borrower_name, subject_address, city, state, zip, county, loan_type, occupancy, property_type, ordered_at, due_at, inspection_at, status, priority, fee, tech_fee, appraiser_payout, appraiser_profile_id, contact_name, contact_phone, access_info, assignment_preference, lender_contact, parcel_number, commission_split_override, accounting_status, completed_at, paid_at, next_action, metadata, last_activity_at) values
  ('e0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'CAA-26-1048', '1004 URAR', 'Avery Mitchell', '1840 Magnolia Trace', 'Marietta', 'GA', '30064', 'Cobb', 'Conventional', 'Primary residence', 'Single family', '2026-06-24 09:18:00-04', '2026-06-30 17:00:00-04', '2026-06-27 10:00:00-04', 'In Review', 'High', 575, 25, 345, 'd0000000-0000-4000-8000-000000000001', 'Avery Mitchell', '(404) 555-0128', 'Borrower available after 10 AM. Lockbox at side gate.', 'Preferred staff appraiser', 'Claire Moon', '17-0216-0-081-0', null, 'Ready to invoice', '2026-06-30 10:48:00-04', null, 'Complete review checklist', '{"amc":"Direct Lender","documents":9}', '2026-06-30 10:48:00-04'),
  ('e0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000002', 'CAA-26-1049', 'FHA 1004', 'Sofia Grant', '72 Riverbend Court', 'Roswell', 'GA', '30076', 'Fulton', 'FHA', 'Primary residence', 'Single family', '2026-06-23 09:30:00-04', '2026-06-30 17:00:00-04', '2026-06-26 11:30:00-04', 'Revisions Needed', 'Rush', 650, 35, 390, 'd0000000-0000-4000-8000-000000000002', 'Sofia Grant', '(678) 555-0183', 'Owner will meet appraiser. FHA utilities are on.', 'FHA-certified panel appraiser', 'Sam Ortiz', '12-3114-0-229-0', 60, 'Payout pending', '2026-06-30 09:04:00-04', null, 'Appraiser response due today', '{"amc":"Pioneer AMC","documents":11}', '2026-06-30 09:04:00-04'),
  ('e0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000004', 'CAA-26-1050', '2055 Exterior', 'Noah Turner', '913 Laurel Park Lane', 'Woodstock', 'GA', '30188', 'Cherokee', 'Conventional', 'Investment', 'Townhome', '2026-06-25 11:10:00-04', '2026-07-02 17:00:00-04', '2026-06-30 09:30:00-04', 'Inspection Scheduled', 'Standard', 425, 20, 255, 'd0000000-0000-4000-8000-000000000003', 'Noah Turner', '(770) 555-0144', 'Exterior only. Community gate code 1749.', 'Best coverage fit', 'Janelle Price', '15N09-108-A', null, 'Unpaid', null, null, 'Mark inspected', '{"amc":"Direct Lender","documents":5}', '2026-06-30 09:30:00-04'),
  ('e0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000003', 'CAA-26-1051', 'VA 1004', 'Elena Ruiz', '440 Brookstone Way', 'Kennesaw', 'GA', '30144', 'Cobb', 'VA', 'Primary residence', 'Single family', '2026-06-20 08:45:00-04', '2026-06-28 17:00:00-04', '2026-06-24 14:00:00-04', 'Report In Progress', 'Rush', 700, 35, 420, 'd0000000-0000-4000-8000-000000000001', 'Elena Ruiz', '(404) 555-0199', 'Seller agent will provide access. Confirm MPR utilities.', 'VA panel', 'Miles Carter', '20-0135-0-047-0', null, 'Unpaid', null, null, 'Escalate overdue report', '{"amc":"Cobalt AMC","documents":9}', '2026-06-30 08:00:00-04'),
  ('e0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000003', 'CAA-26-1052', 'Desktop Review', 'Liam Carter', '268 Oak Hall Drive', 'Alpharetta', 'GA', '30004', 'Fulton', 'HELOC', 'Owner occupied', 'Condo', '2026-06-26 12:20:00-04', '2026-07-01 17:00:00-04', null, 'Report In Progress', 'Watch', 325, 15, 195, 'd0000000-0000-4000-8000-000000000004', 'Liam Carter', '(470) 555-0137', 'Desktop review. No inspection contact needed.', 'Desktop specialist', 'Megan Hall', '22-4871-0-089-0', null, 'Paid', '2026-06-21 16:00:00-04', '2026-06-28 12:00:00-04', 'Submit report', '{"amc":"Pioneer AMC","documents":4}', '2026-06-29 12:27:00-04'),
  ('e0000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'CAA-26-1053', '1004 URAR', 'Mina Patel', '18 Cedar Grove Place', 'Smyrna', 'GA', '30080', 'Cobb', 'Conventional', 'Primary residence', 'Single family', '2026-06-30 10:31:00-04', '2026-07-05 17:00:00-04', null, 'Unassigned', 'Standard', 550, 25, 330, null, 'Mina Patel', '(678) 555-0110', 'Borrower prefers Friday afternoon.', 'Lowest workload in Cobb', 'Claire Moon', '17-0188-0-043-0', null, 'Unpaid', null, null, 'Assign appraiser', '{"amc":"Direct Lender","documents":6}', '2026-06-30 10:31:00-04'),
  ('e0000000-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000005', 'CAA-26-1054', 'Final Inspection', 'Daniel Brooks', '602 Garden Mill Road', 'Canton', 'GA', '30114', 'Cherokee', 'Construction', 'Primary residence', 'Single family', '2026-06-29 13:05:00-04', '2026-06-30 17:00:00-04', '2026-06-30 15:00:00-04', 'Assigned', 'High', 175, 10, 105, 'd0000000-0000-4000-8000-000000000003', 'Site supervisor', '(770) 555-0122', 'Builder lockbox. Verify repairs are complete.', 'Original appraiser', 'Iris Grant', '14N23-124-B', null, 'Unpaid', null, null, 'Upload completion photos', '{"amc":"Direct Lender","documents":3}', '2026-06-30 08:20:00-04'),
  ('e0000000-0000-4000-8000-000000000008', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000002', 'CAA-26-1055', '1004 URAR', 'Grace Lin', '1452 Hidden Creek Drive', 'Duluth', 'GA', '30097', 'Gwinnett', 'Conventional', 'Primary residence', 'Single family', '2026-06-28 09:00:00-04', '2026-07-04 17:00:00-04', '2026-07-01 10:00:00-04', 'Accepted', 'Standard', 560, 25, 336, 'd0000000-0000-4000-8000-000000000002', 'Grace Lin', '(678) 555-0188', 'Borrower needs 24 hour notice.', 'Preferred by client', 'Sam Ortiz', 'R7258-144', null, 'Unpaid', null, null, 'Schedule inspection', '{"amc":"Pioneer AMC","documents":7}', '2026-06-29 15:42:00-04'),
  ('e0000000-0000-4000-8000-000000000009', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000005', 'CAA-26-1056', '2055 Exterior', 'Theo James', '31 Valley Ridge Lane', 'Canton', 'GA', '30115', 'Cherokee', 'Conventional', 'Second home', 'Single family', '2026-06-27 14:15:00-04', '2026-07-03 17:00:00-04', '2026-06-30 13:00:00-04', 'Completed', 'Standard', 550, 25, 330, 'd0000000-0000-4000-8000-000000000001', 'Theo James', '(770) 555-0162', 'Exterior access only.', 'County specialist', 'Elliot Shaw', '15N12-009-B', null, 'Unpaid', '2026-07-03 15:04:00-04', null, 'Invoice client', '{"amc":"Direct Lender","documents":8}', '2026-07-03 15:04:00-04')
on conflict (organization_id, file_number) do update set
  status = excluded.status,
  priority = excluded.priority,
  due_at = excluded.due_at,
  inspection_at = excluded.inspection_at,
  fee = excluded.fee,
  tech_fee = excluded.tech_fee,
  appraiser_payout = excluded.appraiser_payout,
  appraiser_profile_id = excluded.appraiser_profile_id,
  contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone,
  access_info = excluded.access_info,
  assignment_preference = excluded.assignment_preference,
  lender_contact = excluded.lender_contact,
  parcel_number = excluded.parcel_number,
  commission_split_override = excluded.commission_split_override,
  accounting_status = excluded.accounting_status,
  completed_at = excluded.completed_at,
  paid_at = excluded.paid_at,
  next_action = excluded.next_action,
  metadata = excluded.metadata,
  last_activity_at = excluded.last_activity_at;

insert into public.order_notes (id, order_id, visibility, body, created_at) values
  ('71000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'internal', 'Reviewer requested contract addendum before final approval.', '2026-06-30 11:16:00-04'),
  ('71000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'appraiser', 'FHA repair commentary needs stronger support and photo reference.', '2026-06-30 09:04:00-04'),
  ('71000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004', 'internal', 'Due date alert sent to appraiser and manager.', '2026-06-30 08:00:00-04'),
  ('71000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001', 'client', 'Please deliver the final PDF and XML together.', '2026-06-29 15:10:00-04')
on conflict (id) do update set visibility = excluded.visibility, body = excluded.body, created_at = excluded.created_at;

insert into public.order_documents (id, order_id, document_type, file_name, storage_path, visibility, status, content_type) values
  ('72000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Engagement', 'Engagement letter.pdf', 'orders/CAA-26-1048/engagement-letter.pdf', 'internal', 'Ready', 'application/pdf'),
  ('72000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Report', 'Appraisal report.pdf', 'orders/CAA-26-1048/appraisal-report.pdf', 'internal', 'Needs review', 'application/pdf'),
  ('72000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'Report', 'FHA appraisal report.pdf', 'orders/CAA-26-1049/report.pdf', 'internal', 'Needs review', 'application/pdf'),
  ('72000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000006', 'Order package', 'Client order package.pdf', 'orders/CAA-26-1053/order-package.pdf', 'internal', 'Ready', 'application/pdf')
on conflict (id) do update set document_type = excluded.document_type, file_name = excluded.file_name, storage_path = excluded.storage_path, visibility = excluded.visibility, status = excluded.status, content_type = excluded.content_type;

insert into public.order_status_history (id, order_id, from_status, to_status, note, created_at) values
  ('73000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Submitted', 'In Review', 'Report entered quality review.', '2026-06-30 10:48:00-04'),
  ('73000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'In Review', 'Revisions Needed', 'FHA repair commentary returned.', '2026-06-30 09:04:00-04'),
  ('73000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000006', 'New', 'Unassigned', 'Intake complete and ready for assignment.', '2026-06-30 10:31:00-04')
on conflict (id) do update set from_status = excluded.from_status, to_status = excluded.to_status, note = excluded.note, created_at = excluded.created_at;

insert into public.order_reviews (id, order_id, status, checklist_state, reviewer_notes, started_at, risk_score) values
  ('74000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'in_review', '{"openItems":1}', 'Contract addendum pending before delivery.', '2026-06-30 10:48:00-04', 42),
  ('74000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'returned', '{"openItems":2}', 'FHA repair comments need support.', '2026-06-30 09:04:00-04', 76)
on conflict (id) do update set status = excluded.status, checklist_state = excluded.checklist_state, reviewer_notes = excluded.reviewer_notes, started_at = excluded.started_at, risk_score = excluded.risk_score;

insert into public.order_review_items (id, review_id, category, label, complete, severity, note) values
  ('75000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001', 'Required exhibits', 'Subject photos present', true, null, null),
  ('75000000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000001', 'Contract', 'Contract addendum attached', false, 'warning', 'Waiting on lender addendum.'),
  ('75000000-0000-4000-8000-000000000003', '74000000-0000-4000-8000-000000000002', 'FHA', 'Repair condition commentary', false, 'blocker', 'Needs stronger support and photo reference.')
on conflict (id) do update set category = excluded.category, label = excluded.label, complete = excluded.complete, severity = excluded.severity, note = excluded.note;

insert into public.revision_requests (id, order_id, review_id, body, status, created_at) values
  ('76000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000002', 'Clarify FHA repair condition and add photo reference.', 'open', '2026-06-30 09:04:00-04')
on conflict (id) do update set body = excluded.body, status = excluded.status, created_at = excluded.created_at;

insert into public.accounting_entries (id, organization_id, order_id, client_id, appraiser_profile_id, entry_type, amount, memo, product_type, county, completed_at, fee, tech_fee, commission_split, appraiser_split, company_revenue, status, month, paid_at) values
  ('80000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'order_fee', 575, 'Ready to invoice after review.', '1004 URAR', 'Cobb', '2026-06-30', 575, 25, 60, 345, 205, 'Ready to invoice', '2026-06', null),
  ('80000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'order_fee', 650, 'Payout pending after revision return.', 'FHA 1004', 'Fulton', '2026-06-30', 650, 35, 60, 369, 246, 'Payout pending', '2026-06', null),
  ('80000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004', 'order_fee', 325, 'Paid June desktop review.', 'Desktop Review', 'Fulton', '2026-06-21', 325, 15, 70, 217, 93, 'Paid', '2026-06', '2026-06-28 12:00:00-04'),
  ('80000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'order_fee', 550, 'Completed July exterior order.', '2055 Exterior', 'Cherokee', '2026-07-03', 550, 25, 60, 315, 210, 'Unpaid', '2026-07', null)
on conflict (id) do update set
  order_id = excluded.order_id,
  client_id = excluded.client_id,
  appraiser_profile_id = excluded.appraiser_profile_id,
  amount = excluded.amount,
  memo = excluded.memo,
  product_type = excluded.product_type,
  county = excluded.county,
  completed_at = excluded.completed_at,
  fee = excluded.fee,
  tech_fee = excluded.tech_fee,
  commission_split = excluded.commission_split,
  appraiser_split = excluded.appraiser_split,
  company_revenue = excluded.company_revenue,
  status = excluded.status,
  month = excluded.month,
  paid_at = excluded.paid_at;

insert into public.payroll_runs (id, organization_id, name, period_start, period_end, status, total_gross_fee, total_tech_fee, total_payout, marked_paid_at) values
  ('81000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'June 2026 Appraiser Payroll', '2026-06-01', '2026-06-30', 'paid', 1550, 75, 931, '2026-06-30 17:00:00-04'),
  ('81000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'July 2026 Pending Payouts', '2026-07-01', '2026-07-15', 'draft', 550, 25, 315, null)
on conflict (id) do update set name = excluded.name, period_start = excluded.period_start, period_end = excluded.period_end, status = excluded.status, total_gross_fee = excluded.total_gross_fee, total_tech_fee = excluded.total_tech_fee, total_payout = excluded.total_payout, marked_paid_at = excluded.marked_paid_at;

insert into public.payroll_run_items (id, payroll_run_id, organization_id, order_id, appraiser_profile_id, gross_fee, tech_fee, commission_split, payout_amount, status, paid_at) values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 575, 25, 60, 345, 'paid', '2026-06-30 17:00:00-04'),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 650, 35, 60, 369, 'pending', null),
  ('82000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000001', 550, 25, 60, 315, 'pending', null)
on conflict (id) do update set gross_fee = excluded.gross_fee, tech_fee = excluded.tech_fee, commission_split = excluded.commission_split, payout_amount = excluded.payout_amount, status = excluded.status, paid_at = excluded.paid_at;

insert into public.invoices (id, organization_id, client_id, invoice_number, amount, status, due_at, paid_at, order_count) values
  ('83000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'INV-2026-1001', 3275, 'Sent', '2026-07-15 17:00:00-04', null, 5),
  ('83000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000003', 'INV-2026-1002', 4180, 'Overdue', '2026-06-28 17:00:00-04', null, 6),
  ('83000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000004', 'INV-2026-1003', 2210, 'Paid', '2026-06-30 17:00:00-04', '2026-06-30 11:00:00-04', 3)
on conflict (organization_id, invoice_number) do update set amount = excluded.amount, status = excluded.status, due_at = excluded.due_at, paid_at = excluded.paid_at, order_count = excluded.order_count;

insert into public.vendor_profiles (id, amc_organization_id, vendor_organization_id, company_name, contact_name, contact_email, phone, status, specialties, turn_time_days, capacity, workload, rating, office_address, coverage_zips, radius_miles, roster, fee_sheet, notes) values
  ('90000000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'North Metro Valuation', 'Renee Walker', 'renee@example.com', '(678) 555-0185', 'approved', array['FHA','Conventional','Luxury'], 5, 14, 9, 4.8, '44 Church Street, Marietta, GA', array['30064','30339','30144'], 35, array['Renee Walker','Owen Walker','Lena Cruz'], '[{"product":"1004 URAR","fee":575,"turnDays":5},{"product":"FHA 1004","fee":650,"turnDays":6},{"product":"Luxury 1004","fee":925,"turnDays":8}]', 'Strong metro Atlanta panel coverage.'),
  ('90000000-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', null, 'Peachtree Appraisal Group', 'Andre Holt', 'andre@example.com', '(404) 555-0131', 'pending_documents', array['VA','FHA','Rural'], 6, 9, 6, 4.3, '725 Peachtree Street, Atlanta, GA', array['30305','30319','30030','30097'], 45, array['Andre Holt','Monica Perez'], '[{"product":"VA 1004","fee":700,"turnDays":6},{"product":"FHA 1004","fee":650,"turnDays":6}]', 'Waiting on W-9 before full approval.'),
  ('90000000-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222', null, 'Blue Ridge Review Partners', 'Hannah Cole', 'hannah@example.com', '(706) 555-0140', 'under_review', array['Review','Complex','Acreage'], 7, 6, 4, 4.6, '300 Main Street, Canton, GA', array['30114','30115','30143'], 60, array['Hannah Cole','Bryce Eaton'], '[{"product":"Desktop Review","fee":225,"turnDays":2},{"product":"Complex 1004","fee":850,"turnDays":8}]', 'Review panel candidate.')
on conflict (id) do update set
  vendor_organization_id = excluded.vendor_organization_id,
  company_name = excluded.company_name,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  phone = excluded.phone,
  status = excluded.status,
  specialties = excluded.specialties,
  turn_time_days = excluded.turn_time_days,
  capacity = excluded.capacity,
  workload = excluded.workload,
  rating = excluded.rating,
  office_address = excluded.office_address,
  coverage_zips = excluded.coverage_zips,
  radius_miles = excluded.radius_miles,
  roster = excluded.roster,
  fee_sheet = excluded.fee_sheet,
  notes = excluded.notes;

insert into public.documents (id, organization_id, order_id, client_id, vendor_profile_id, name, document_type, storage_path, visibility, status, content_type, metadata) values
  ('91000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'Engagement letter.pdf', 'Engagement', 'orders/CAA-26-1048/engagement-letter.pdf', 'internal', 'Ready', 'application/pdf', '{"source":"seed"}'),
  ('91000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'Appraisal report.pdf', 'Report', 'orders/CAA-26-1048/appraisal-report.pdf', 'internal', 'Needs review', 'application/pdf', '{"source":"seed"}'),
  ('91000000-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222', null, null, '90000000-0000-4000-8000-000000000001', 'North Metro W-9.pdf', 'W-9', 'vendors/north-metro/w9.pdf', 'internal', 'Ready', 'application/pdf', '{"source":"seed"}')
on conflict (id) do update set name = excluded.name, document_type = excluded.document_type, storage_path = excluded.storage_path, visibility = excluded.visibility, status = excluded.status, content_type = excluded.content_type, metadata = excluded.metadata;

insert into public.order_form_templates (id, organization_id, owner_type, name, description, is_default, active) values
  ('f1000000-0000-4000-8000-000000000001', null, 'default', 'Default appraisal intake', 'CAS baseline order intake template.', true, true),
  ('f1000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'company', 'CAA Valuation intake', 'Company customized appraisal intake template.', true, true)
on conflict (id) do update set organization_id = excluded.organization_id, owner_type = excluded.owner_type, name = excluded.name, description = excluded.description, is_default = excluded.is_default, active = excluded.active;

insert into public.order_form_template_sections (id, template_id, title, hidden, sort_order) values
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'Client and Loan', false, 1),
  ('f2000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'Borrower and Property', false, 2),
  ('f2000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000002', 'Fees and Assignment', false, 3),
  ('f2000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000002', 'Documents', false, 4)
on conflict (id) do update set title = excluded.title, hidden = excluded.hidden, sort_order = excluded.sort_order;

insert into public.order_form_template_fields (id, section_id, field_key, label, field_type, required, options, sort_order) values
  ('f3000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'client_id', 'Client', 'select', true, '["HarborPoint Lending","Northstar Mortgage","Seaside Bank","RidgeLine Bank"]', 1),
  ('f3000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'loan_type', 'Loan type', 'select', true, '["Conventional","FHA","VA","USDA","Jumbo","Portfolio"]', 2),
  ('f3000000-0000-4000-8000-000000000003', 'f2000000-0000-4000-8000-000000000001', 'product_type', 'Product type', 'select', true, '["1004 URAR","FHA 1004","VA 1004","2055 Exterior","Desktop Review","Final Inspection","Luxury 1004"]', 3),
  ('f3000000-0000-4000-8000-000000000004', 'f2000000-0000-4000-8000-000000000002', 'borrower_name', 'Borrower', 'text', true, '[]', 1),
  ('f3000000-0000-4000-8000-000000000005', 'f2000000-0000-4000-8000-000000000002', 'subject_address', 'Property address', 'text', true, '[]', 2),
  ('f3000000-0000-4000-8000-000000000006', 'f2000000-0000-4000-8000-000000000003', 'fee', 'Fee', 'currency', true, '[]', 1),
  ('f3000000-0000-4000-8000-000000000007', 'f2000000-0000-4000-8000-000000000003', 'assignment_preference', 'Assignment preference', 'select', false, '["Best workload fit","Preferred appraiser","County specialist","Manual assignment"]', 2),
  ('f3000000-0000-4000-8000-000000000008', 'f2000000-0000-4000-8000-000000000004', 'documents', 'Document upload placeholder', 'upload', false, '[]', 1)
on conflict (id) do update set label = excluded.label, field_type = excluded.field_type, required = excluded.required, options = excluded.options, sort_order = excluded.sort_order;

insert into public.calendar_preferences (id, organization_id, appraiser_profile_id, google_connected, sync_inspections, sync_due_dates, google_calendar_id) values
  ('ca100000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-4000-8000-000000000001', true, true, true, 'jordan-demo-calendar'),
  ('ca100000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-4000-8000-000000000002', false, true, false, null),
  ('ca100000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-4000-8000-000000000003', false, false, true, null),
  ('ca100000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-4000-8000-000000000004', true, true, true, 'talia-demo-calendar')
on conflict (organization_id, appraiser_profile_id) do update set google_connected = excluded.google_connected, sync_inspections = excluded.sync_inspections, sync_due_dates = excluded.sync_due_dates, google_calendar_id = excluded.google_calendar_id;

insert into public.calendar_events (id, organization_id, order_id, appraiser_profile_id, event_type, title, starts_at, ends_at, location, notes, sync_status) values
  ('ca200000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'inspection', 'Inspection: CAA-26-1048', '2026-06-27 10:00:00-04', '2026-06-27 11:00:00-04', '1840 Magnolia Trace, Marietta, GA', 'Borrower available after 10 AM.', 'synced'),
  ('ca200000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000006', null, 'due_date', 'Due: CAA-26-1053', '2026-07-05 17:00:00-04', null, '18 Cedar Grove Place, Smyrna, GA', 'Unassigned due-soon file.', 'local_only'),
  ('ca200000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', null, 'd0000000-0000-4000-8000-000000000001', 'workload', 'Jordan Lee workload hold', '2026-07-02 09:00:00-04', '2026-07-02 11:00:00-04', null, 'Capacity planning placeholder.', 'local_only')
on conflict (id) do update set title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at, location = excluded.location, notes = excluded.notes, sync_status = excluded.sync_status;

insert into public.audit_logs (id, organization_id, entity_type, entity_id, action, changes, created_at) values
  ('aa000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'order', 'e0000000-0000-4000-8000-000000000001', 'Order created', '{"source":"seed"}', '2026-06-24 09:18:00-04'),
  ('aa000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'order', 'e0000000-0000-4000-8000-000000000002', 'Revision requested', '{"status":"Revisions Needed"}', '2026-06-30 09:04:00-04'),
  ('aa000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'accounting', '80000000-0000-4000-8000-000000000001', 'Accounting entry created', '{"status":"Ready to invoice"}', '2026-06-30 10:48:00-04')
on conflict (id) do update set entity_type = excluded.entity_type, entity_id = excluded.entity_id, action = excluded.action, changes = excluded.changes, created_at = excluded.created_at;

insert into public.notifications (id, organization_id, title, body, type, action_url, metadata, created_at) values
  ('bb000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Revision requested', 'CAA-26-1049 needs FHA repair commentary updated.', 'warning', '/orders/CAA-26-1049', '{"order":"CAA-26-1049"}', '2026-06-30 09:04:00-04'),
  ('bb000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Report submitted', 'CAA-26-1048 is ready for review.', 'success', '/orders/CAA-26-1048', '{"order":"CAA-26-1048"}', '2026-06-30 10:48:00-04'),
  ('bb000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Past due order', 'CAA-26-1051 needs escalation.', 'danger', '/orders/CAA-26-1051', '{"order":"CAA-26-1051"}', '2026-06-30 08:00:00-04')
on conflict (id) do update set title = excluded.title, body = excluded.body, type = excluded.type, action_url = excluded.action_url, metadata = excluded.metadata, created_at = excluded.created_at;

insert into public.documents (id, organization_id, order_id, client_id, vendor_profile_id, name, display_name, document_type, category, storage_bucket, storage_path, visibility, source, status, content_type, file_size_bytes, version_number, checksum, description, tags, audit_metadata, virus_scan_status, duplicate_detection, metadata) values
  ('91000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'Engagement letter.pdf', 'HarborPoint engagement letter', 'Engagement', 'Engagement letter', 'cas-private-documents', 'organizations/11111111-1111-1111-1111-111111111111/orders/e0000000-0000-4000-8000-000000000001/documents/engagement-letter.pdf', 'Organization internal', 'Internal staff upload', 'Uploaded', 'application/pdf', 318000, 1, 'sha256-demo-engagement', 'Signed lender engagement terms for CAA-26-1048.', array['engagement','harborpoint'], '{"createdBy":"Nora Fields","lastAction":"Uploaded","lastActionAt":"2026-06-24 09:20","virusScanStatus":"Passed","duplicateDetection":"Unique"}', 'Passed', 'Unique', '{"source":"phase8-seed"}'),
  ('91000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'CAA-26-1048 final report.pdf', 'Final appraisal report PDF', 'Report', 'Appraisal report PDF', 'cas-private-documents', 'organizations/11111111-1111-1111-1111-111111111111/orders/e0000000-0000-4000-8000-000000000001/documents/final-report-v2.pdf', 'Delivery recipient', 'Appraiser upload', 'Final', 'application/pdf', 5820000, 2, 'sha256-demo-report-v2', 'Final PDF awaiting secure lender delivery.', array['final-report','pdf'], '{"createdBy":"Jordan Lee","lastAction":"Version replaced","lastActionAt":"2026-06-30 10:42","virusScanStatus":"Passed","duplicateDetection":"Unique"}', 'Passed', 'Unique', '{"source":"phase8-seed"}'),
  ('91000000-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222', null, null, '90000000-0000-4000-8000-000000000001', 'North Metro W-9.pdf', 'North Metro W-9', 'W-9', 'W-9', 'cas-private-documents', 'organizations/22222222-2222-2222-2222-222222222222/vendors/90000000-0000-4000-8000-000000000001/compliance/w9.pdf', 'Organization internal', 'Vendor upload', 'Uploaded', 'application/pdf', 214000, 1, 'sha256-demo-w9', 'Vendor compliance W-9 retained for AMC panel.', array['vendor','w9'], '{"createdBy":"Renee Walker","lastAction":"Uploaded","lastActionAt":"2026-06-20 13:08","virusScanStatus":"Passed","duplicateDetection":"Unique"}', 'Passed', 'Unique', '{"source":"phase8-seed"}'),
  ('91000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'CAA-26-1048 MISMO XML.xml', 'MISMO XML package', 'XML', 'Appraisal XML', 'cas-private-documents', 'organizations/11111111-1111-1111-1111-111111111111/orders/e0000000-0000-4000-8000-000000000001/documents/mismo.xml', 'Delivery recipient', 'Appraiser upload', 'Uploaded', 'application/xml', 742000, 1, 'sha256-demo-xml', 'XML delivery package for HarborPoint Lending.', array['xml','delivery'], '{"createdBy":"Jordan Lee","lastAction":"Uploaded","lastActionAt":"2026-06-30 10:44","virusScanStatus":"Passed","duplicateDetection":"Unique"}', 'Passed', 'Unique', '{"source":"phase8-seed"}'),
  ('91000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'FHA repair revision request.pdf', 'FHA repair revision request', 'Revision', 'Revision request', 'cas-private-documents', 'organizations/11111111-1111-1111-1111-111111111111/orders/e0000000-0000-4000-8000-000000000002/documents/fha-revision-request.pdf', 'Reviewer', 'Reviewer upload', 'Uploaded', 'application/pdf', 508000, 1, 'sha256-demo-revision', 'Reviewer revision package for FHA repair condition.', array['revision','fha'], '{"createdBy":"Nora Fields","lastAction":"Uploaded","lastActionAt":"2026-06-30 09:04","virusScanStatus":"Passed","duplicateDetection":"Unique"}', 'Passed', 'Unique', '{"source":"phase8-seed"}')
on conflict (id) do update set
  display_name = excluded.display_name,
  category = excluded.category,
  storage_bucket = excluded.storage_bucket,
  storage_path = excluded.storage_path,
  visibility = excluded.visibility,
  source = excluded.source,
  status = excluded.status,
  file_size_bytes = excluded.file_size_bytes,
  version_number = excluded.version_number,
  checksum = excluded.checksum,
  description = excluded.description,
  tags = excluded.tags,
  audit_metadata = excluded.audit_metadata,
  virus_scan_status = excluded.virus_scan_status,
  duplicate_detection = excluded.duplicate_detection,
  metadata = excluded.metadata;

insert into public.document_versions (id, organization_id, document_id, version_number, file_name, storage_bucket, storage_path, content_type, file_size_bytes, checksum, uploaded_by_name, uploaded_at, change_note) values
  ('91100000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '91000000-0000-4000-8000-000000000002', 1, 'CAA-26-1048 draft report.pdf', 'cas-private-documents', 'organizations/11111111-1111-1111-1111-111111111111/orders/e0000000-0000-4000-8000-000000000001/documents/draft-report-v1.pdf', 'application/pdf', 5560000, 'sha256-demo-report-v1', 'Jordan Lee', '2026-06-30 09:45:00-04', 'Initial report submitted for review.'),
  ('91100000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '91000000-0000-4000-8000-000000000002', 2, 'CAA-26-1048 final report.pdf', 'cas-private-documents', 'organizations/11111111-1111-1111-1111-111111111111/orders/e0000000-0000-4000-8000-000000000001/documents/final-report-v2.pdf', 'application/pdf', 5820000, 'sha256-demo-report-v2', 'Jordan Lee', '2026-06-30 10:42:00-04', 'Reviewer conditions cleared.')
on conflict (document_id, version_number) do update set file_name = excluded.file_name, storage_path = excluded.storage_path, checksum = excluded.checksum, uploaded_by_name = excluded.uploaded_by_name, uploaded_at = excluded.uploaded_at, change_note = excluded.change_note;

insert into public.required_document_rules (id, organization_id, client_id, product_type, county, category, label, required, visible_to, sort_order) values
  ('92000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', null, '1004 URAR', null, 'Engagement letter', 'Signed engagement letter', true, array['Organization internal','Reviewer'], 1),
  ('92000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', null, '1004 URAR', null, 'Appraisal report PDF', 'Final report PDF', true, array['Reviewer','Delivery recipient'], 2),
  ('92000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-4000-8000-000000000001', null, null, 'Appraisal XML', 'Client XML package', true, array['Delivery recipient'], 3),
  ('92000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', null, 'FHA 1004', null, 'Revision response', 'FHA revision response', true, array['Reviewer','AMC'], 4)
on conflict (id) do update set category = excluded.category, label = excluded.label, required = excluded.required, visible_to = excluded.visible_to, sort_order = excluded.sort_order;

insert into public.structured_revision_requests (id, organization_id, order_id, requestor, source, category, priority, due_at, client_visible_wording, internal_reviewer_wording, assigned_appraiser_profile_id, status, received_at) values
  ('94000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'Nora Fields', 'Reviewer', 'FHA condition clarification', 'Rush', '2026-06-30 17:00:00-04', 'Please clarify the FHA repair condition and add the referenced photo.', 'Reviewer needs repair commentary tied to photo exhibit and final condition language.', 'd0000000-0000-4000-8000-000000000002', 'In Progress', '2026-06-30 09:04:00-04')
on conflict (id) do update set status = excluded.status, due_at = excluded.due_at, client_visible_wording = excluded.client_visible_wording, internal_reviewer_wording = excluded.internal_reviewer_wording;

insert into public.structured_revision_items (id, organization_id, revision_request_id, label, related_page_section, related_document_id, response, completed, reviewer_approved, attachment_document_ids) values
  ('94100000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '94000000-0000-4000-8000-000000000001', 'Add FHA repair condition commentary', 'Improvements / Condition', '91000000-0000-4000-8000-000000000005', null, false, false, '{}'::uuid[]),
  ('94100000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '94000000-0000-4000-8000-000000000001', 'Reference supporting photo exhibit', 'Photo addendum', '91000000-0000-4000-8000-000000000005', 'Photo exhibit identified; waiting on final appraiser wording.', true, false, array['91000000-0000-4000-8000-000000000005']::uuid[])
on conflict (id) do update set label = excluded.label, response = excluded.response, completed = excluded.completed, reviewer_approved = excluded.reviewer_approved, attachment_document_ids = excluded.attachment_document_ids;

insert into public.revision_item_events (id, organization_id, revision_request_id, revision_item_id, actor_name, action, detail, created_at) values
  ('94200000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '94000000-0000-4000-8000-000000000001', '94100000-0000-4000-8000-000000000001', 'Nora Fields', 'Revision item created', 'Reviewer created FHA condition clarification item.', '2026-06-30 09:04:00-04')
on conflict (id) do update set action = excluded.action, detail = excluded.detail, created_at = excluded.created_at;

insert into public.order_messages (id, organization_id, order_id, sender_name, sender_role, channel, visibility, body, attachment_document_ids, pinned, assigned_follow_up_owner, follow_up_due_at, related_revision_id, related_document_id, created_at) values
  ('93000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'Nora Fields', 'office_staff', 'System activity', 'Internal team', 'Final report package submitted for review with PDF and XML attached.', array['91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004']::uuid[], true, null, null, null, '91000000-0000-4000-8000-000000000002', '2026-06-30 10:48:00-04'),
  ('93000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'Nora Fields', 'reviewer', 'Revision request', 'Reviewer', '@Priya please update the FHA repair condition language and return the revision today.', array['91000000-0000-4000-8000-000000000005']::uuid[], true, 'Priya Shah', '2026-06-30 17:00:00-04', '94000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000005', '2026-06-30 09:04:00-04'),
  ('93000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'Priya Shah', 'appraiser', 'Revision response', 'Internal team', 'I have the photo exhibit and am updating the condition paragraph now.', '{}'::uuid[], false, null, null, '94000000-0000-4000-8000-000000000001', null, '2026-06-30 10:02:00-04')
on conflict (id) do update set body = excluded.body, attachment_document_ids = excluded.attachment_document_ids, pinned = excluded.pinned, assigned_follow_up_owner = excluded.assigned_follow_up_owner, follow_up_due_at = excluded.follow_up_due_at, related_revision_id = excluded.related_revision_id, related_document_id = excluded.related_document_id, created_at = excluded.created_at;

insert into public.report_submissions (id, organization_id, order_id, submitted_by_name, submitted_at, report_pdf_document_id, xml_document_id, supporting_document_ids, submission_note, certification_accepted, status) values
  ('95000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'Jordan Lee', '2026-06-30 10:48:00-04', '91000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000004', array['91000000-0000-4000-8000-000000000001']::uuid[], 'Final package submitted with certification accepted.', true, 'Approved')
on conflict (id) do update set submitted_at = excluded.submitted_at, report_pdf_document_id = excluded.report_pdf_document_id, xml_document_id = excluded.xml_document_id, supporting_document_ids = excluded.supporting_document_ids, submission_note = excluded.submission_note, certification_accepted = excluded.certification_accepted, status = excluded.status;

insert into public.report_deliveries (id, organization_id, order_id, delivered_by_name, delivered_at, recipient_name, recipient_email, delivery_method, included_document_ids, secure_delivery_url, status) values
  ('96000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', 'Nora Fields', '2026-06-30 11:05:00-04', 'Claire Moon', 'claire@harborpoint.example', 'Secure link', array['91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004']::uuid[], '/deliveries/CAA-26-1048-demo', 'Delivered')
on conflict (id) do update set delivered_at = excluded.delivered_at, recipient_name = excluded.recipient_name, recipient_email = excluded.recipient_email, included_document_ids = excluded.included_document_ids, secure_delivery_url = excluded.secure_delivery_url, status = excluded.status;

insert into public.document_audit_events (id, organization_id, order_id, document_id, message_id, revision_id, event, actor_name, detail, created_at) values
  ('97000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000001', null, 'Uploaded', 'Jordan Lee', 'Final report PDF uploaded to org-scoped private storage.', '2026-06-30 10:42:00-04'),
  ('97000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', null, null, 'Delivered', 'Nora Fields', 'Final report package delivered by secure link.', '2026-06-30 11:05:00-04'),
  ('97000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'e0000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000005', '93000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001', 'Revision created', 'Nora Fields', 'Structured FHA revision request created with attached PDF.', '2026-06-30 09:04:00-04')
on conflict (id) do update set event = excluded.event, actor_name = excluded.actor_name, detail = excluded.detail, created_at = excluded.created_at;
