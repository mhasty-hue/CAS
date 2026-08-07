export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  type: "appraisal_firm" | "solo_appraiser" | "amc" | "lender_client";
  status: string;
  logo_url: string | null;
  brand_color: string | null;
  primary_contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  settings: Json;
  created_at: string;
  updated_at: string | null;
};

export type UserProfileRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string | null;
};

export type RoleRow = {
  id: string;
  organization_id: string | null;
  name: string;
  system_key: string | null;
  description: string | null;
  created_at: string;
};

export type RolePermissionRow = {
  role_id: string;
  permission_key: string;
  enabled: boolean;
};

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string | null;
  status: "invited" | "active" | "suspended";
  title: string | null;
  permission_overrides: Json;
  manager_member_id: string | null;
  last_active_at: string | null;
  deactivated_at: string | null;
  created_at: string;
};

export type ClientRow = {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  status: string;
  primary_contact: string | null;
  email: string | null;
  phone: string | null;
  billing_terms: string | null;
  billing_email: string | null;
  default_turn_days: number | null;
  notes: string | null;
  client_rules: Json;
  created_at: string;
  updated_at: string | null;
};

export type ClientContactRow = {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
};

export type ClientFeeDefaultRow = {
  id: string;
  organization_id: string;
  client_id: string;
  product_type: string;
  fee: number;
  turn_time_days: number | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type AppraiserProfileRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_state: string | null;
  license_expires_at: string | null;
  eo_expires_at: string | null;
  default_split_percent: number | null;
  coverage_summary: string | null;
  capacity: number | null;
  active_orders: number | null;
  due_this_week: number | null;
  avg_turn_days: number | null;
  revision_rate: number | null;
  payout_due: number | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type OrderRow = {
  id: string;
  organization_id: string;
  client_id: string | null;
  file_number: string;
  product_type: string;
  borrower_name: string;
  subject_address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  loan_type: string | null;
  occupancy: string | null;
  property_type: string | null;
  ordered_at: string;
  due_at: string | null;
  inspection_at: string | null;
  status: string;
  priority: string;
  fee: number;
  tech_fee: number;
  appraiser_payout: number;
  appraiser_profile_id: string | null;
  reviewer_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  access_info: string | null;
  assignment_preference: string | null;
  lender_contact: string | null;
  parcel_number: string | null;
  commission_split_override: number | null;
  accounting_status: string | null;
  paid_at: string | null;
  completed_at: string | null;
  next_action: string | null;
  created_by: string | null;
  metadata: Json;
  last_activity_at: string | null;
  updated_at: string;
};

export type OrderNoteRow = {
  id: string;
  order_id: string;
  author_id: string | null;
  visibility: string;
  body: string;
  created_at: string;
};

export type OrderDocumentRow = {
  id: string;
  order_id: string;
  uploaded_by: string | null;
  document_type: string;
  file_name: string;
  storage_path: string;
  visibility: string;
  status: string;
  file_size_bytes: number | null;
  content_type: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  organization_id: string;
  order_id: string | null;
  client_id: string | null;
  vendor_profile_id: string | null;
  uploaded_by: string | null;
  name: string;
  document_type: string;
  storage_bucket: string;
  storage_path: string;
  visibility: string;
  status: string;
  content_type: string | null;
  file_size_bytes: number | null;
  expires_at: string | null;
  metadata: Json;
  display_name: string | null;
  category: string | null;
  source: string;
  version_number: number;
  parent_document_id: string | null;
  checksum: string | null;
  description: string | null;
  tags: string[];
  audit_metadata: Json;
  virus_scan_status: string;
  duplicate_detection: string;
  archived_at: string | null;
  restored_at: string | null;
  deleted_at: string | null;
  signed_url_last_requested_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type VendorProfileRow = {
  id: string;
  amc_organization_id: string;
  vendor_organization_id: string | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  status: string;
  specialties: string[];
  turn_time_days: number | null;
  capacity: number | null;
  workload: number | null;
  rating: number | null;
  office_address: string | null;
  coverage_zips: string[];
  radius_miles: number | null;
  roster: string[];
  fee_sheet: Json;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type AccountingEntryRow = {
  id: string;
  organization_id: string;
  order_id: string | null;
  client_id: string | null;
  appraiser_profile_id: string | null;
  entry_type: string;
  amount: number;
  memo: string | null;
  product_type: string | null;
  county: string | null;
  completed_at: string | null;
  fee: number | null;
  tech_fee: number | null;
  commission_split: number | null;
  appraiser_split: number | null;
  company_revenue: number | null;
  status: string | null;
  month: string | null;
  paid_at: string | null;
  posted_at: string;
};

export type InvoiceRow = {
  id: string;
  organization_id: string;
  client_id: string | null;
  order_id: string | null;
  invoice_number: string;
  amount: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  billing_party: string | null;
  bill_to_contact: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  balance_due: number | null;
  payment_terms: string | null;
  notes: string | null;
  draft_at: string | null;
  issued_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  partial_payment_amount: number | null;
  order_count: number;
  created_at: string;
};

export type PublicOrderSettingRow = {
  id: string;
  organization_id: string;
  enabled: boolean;
  public_slug: string;
  button_label: string;
  brand_name: string;
  brand_color: string | null;
  logo_url: string | null;
  confirmation_message: string;
  notification_recipients: string[];
  required_fields: string[];
  custom_questions: Json;
  created_at: string;
  updated_at: string;
};

export type PublicOrderRequestRow = {
  id: string;
  organization_id: string;
  requester_name: string;
  email: string;
  phone: string | null;
  property_address: string;
  property_type: string | null;
  purpose: string;
  intended_use: string | null;
  owner_borrower_name: string | null;
  access_contact: string | null;
  preferred_contact_method: string | null;
  requested_timing: string | null;
  comments: string | null;
  consent_accepted: boolean;
  document_count: number;
  status: string;
  converted_order_id: string | null;
  metadata: Json;
  submitted_at: string;
  updated_at: string;
};

export type NotificationPreferenceRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  event_key: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  cadence: string;
  created_at: string;
  updated_at: string;
};

export type EmailDeliveryRow = {
  id: string;
  organization_id: string;
  event_key: string;
  recipient: string;
  subject: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
};

export type InvoiceSettingsRow = {
  id: string;
  organization_id: string;
  company_name: string;
  company_address: string | null;
  logo_url: string | null;
  tax_id: string | null;
  invoice_prefix: string;
  next_invoice_number: number;
  default_payment_terms: string;
  default_invoice_notes: string | null;
  payment_instructions: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  organization_id: string;
  label: string;
  description: string | null;
  quantity: number;
  unit_amount: number;
  amount: number;
  line_type: string;
  sort_order: number;
  created_at: string;
};

export type IntegrationRow = {
  id: string;
  organization_id: string;
  provider_key: string;
  provider_label: string;
  status: string;
  credential_reference: string | null;
  config: Json;
  last_sync_at: string | null;
  sync_status: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
};

export type IntegrationMappingRow = {
  id: string;
  integration_id: string;
  organization_id: string;
  mapping_type: string;
  external_key: string;
  cas_key: string;
  direction: string | null;
  required: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type IntegrationLogRow = {
  id: string;
  integration_id: string;
  organization_id: string;
  event_type: string;
  status: string;
  detail: string | null;
  payload: Json;
  created_at: string;
};

export type OrderFormTemplateRow = {
  id: string;
  organization_id: string | null;
  owner_type: "default" | "company" | "solo_appraiser";
  name: string;
  description: string | null;
  is_default: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderImportTemplateRow = {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  source_type: string;
  column_mappings: Json;
  field_rules: Json;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderImportSessionRow = {
  id: string;
  organization_id: string;
  order_id: string | null;
  import_template_id: string | null;
  source_file_name: string;
  source_content_type: string | null;
  source_size_bytes: number | null;
  source_document_id: string | null;
  source_type: string;
  provider: string;
  extracted_fields: Json;
  mapping_decisions: Json;
  duplicate_candidates: Json;
  validation_errors: Json;
  validation_warnings: Json;
  confidence: number;
  status: string;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string;
};

export type CalendarPreferenceRow = {
  id: string;
  organization_id: string;
  appraiser_profile_id: string | null;
  google_connected: boolean;
  sync_inspections: boolean;
  sync_due_dates: boolean;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentVersionRow = {
  id: string;
  organization_id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  content_type: string | null;
  file_size_bytes: number | null;
  checksum: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
  change_note: string | null;
  metadata: Json;
};

export type RequiredDocumentRuleRow = {
  id: string;
  organization_id: string | null;
  client_id: string | null;
  product_type: string | null;
  county: string | null;
  category: string;
  label: string;
  required: boolean;
  visible_to: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StructuredRevisionRequestRow = {
  id: string;
  organization_id: string;
  order_id: string;
  requestor: string;
  source: string;
  category: string;
  priority: string;
  due_at: string | null;
  client_visible_wording: string;
  internal_reviewer_wording: string;
  assigned_appraiser_profile_id: string | null;
  status: string;
  received_at: string;
  created_at: string;
  updated_at: string;
};

export type StructuredRevisionItemRow = {
  id: string;
  organization_id: string;
  revision_request_id: string;
  label: string;
  related_page_section: string | null;
  related_document_id: string | null;
  response: string | null;
  completed: boolean;
  reviewer_approved: boolean;
  attachment_document_ids: string[];
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type RevisionItemEventRow = {
  id: string;
  organization_id: string;
  revision_request_id: string;
  revision_item_id: string | null;
  actor_id: string | null;
  actor_name: string;
  action: string;
  detail: string | null;
  created_at: string;
};

export type OrderMessageRow = {
  id: string;
  organization_id: string;
  order_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: string | null;
  channel: string;
  visibility: string;
  body: string;
  attachment_document_ids: string[];
  pinned: boolean;
  assigned_follow_up_owner: string | null;
  follow_up_due_at: string | null;
  related_revision_id: string | null;
  related_document_id: string | null;
  metadata: Json;
  created_at: string;
  edited_at: string | null;
};

export type MessageReadReceiptRow = {
  message_id: string;
  user_id: string;
  read_at: string;
};

export type ReportSubmissionRow = {
  id: string;
  organization_id: string;
  order_id: string;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_at: string;
  report_pdf_document_id: string | null;
  xml_document_id: string | null;
  env_document_id: string | null;
  invoice_document_id: string | null;
  supporting_document_ids: string[];
  submission_note: string | null;
  certification_accepted: boolean;
  status: string;
  metadata: Json;
  created_at: string;
};

export type ReportDeliveryRow = {
  id: string;
  organization_id: string;
  order_id: string;
  delivered_by: string | null;
  delivered_by_name: string | null;
  delivered_at: string;
  recipient_name: string;
  recipient_email: string | null;
  delivery_method: string;
  included_document_ids: string[];
  secure_delivery_url: string | null;
  status: string;
  metadata: Json;
};

export type DocumentAuditEventRow = {
  id: string;
  organization_id: string;
  order_id: string | null;
  document_id: string | null;
  message_id: string | null;
  revision_id: string | null;
  event: string;
  actor_id: string | null;
  actor_name: string;
  detail: string;
  metadata: Json;
  created_at: string;
};

export type AppraisalReportVersionRow = {
  id: string;
  organization_id: string;
  order_id: string;
  report_submission_id: string | null;
  version_number: number;
  profile_key: string;
  overlay_keys: string[];
  source_files: Json;
  original_storage_preserved: boolean;
  immutable: boolean;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
  status: string;
  extraction_summary: string | null;
  supersedes_report_version_id: string | null;
  created_at: string;
};

export type NormalizedAppraisalReportRow = {
  id: string;
  organization_id: string;
  order_id: string;
  report_version_id: string;
  profile_key: string;
  extracted_report: Json;
  extraction_provider: string;
  extraction_status: string;
  extraction_errors: string[];
  parsed_at: string;
  created_at: string;
};

export type AutomationRuleRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_key: string;
  trigger_label: string;
  execution_order: number;
  last_run_at: string | null;
  run_count: number;
  failure_count: number;
  created_by: string | null;
  audit_metadata: Json;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AutomationConditionRow = {
  id: string;
  organization_id: string;
  rule_id: string;
  field_key: string;
  operator: string;
  value: string;
  label: string;
  sort_order: number;
  created_at: string;
};

export type AutomationActionRow = {
  id: string;
  organization_id: string;
  rule_id: string;
  action_type: string;
  target: string;
  value: string;
  label: string;
  sort_order: number;
  created_at: string;
};

export type AutomationRunRow = {
  id: string;
  organization_id: string;
  rule_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  related_order_id: string | null;
  related_task_id: string | null;
  related_invoice_id: string | null;
  error_message: string | null;
  metadata: Json;
};

export type AutomationRunStepRow = {
  id: string;
  organization_id: string;
  run_id: string;
  action_label: string;
  status: string;
  detail: string | null;
  step_order: number;
  created_at: string;
};

export type TaskRow = {
  id: string;
  organization_id: string;
  related_order_id: string | null;
  related_client_id: string | null;
  related_vendor_id: string | null;
  related_invoice_id: string | null;
  title: string;
  description: string | null;
  assigned_user_id: string | null;
  assigned_role: string | null;
  created_by: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  source: string;
  automation_rule_id: string | null;
  completed_at: string | null;
  audit_history: Json;
  created_at: string;
  updated_at: string;
};

export type NotificationQueueRow = {
  id: string;
  organization_id: string;
  recipient_user_id: string | null;
  recipient_role: string | null;
  recipient_email: string | null;
  event_type: string;
  channel: string;
  status: string;
  attempt_count: number;
  failure_reason: string | null;
  related_order_id: string | null;
  related_task_id: string | null;
  related_invoice_id: string | null;
  related_vendor_id: string | null;
  digest_group: string | null;
  subject: string;
  preview: string | null;
  payload: Json;
  queued_at: string;
  sent_at: string | null;
  read_at: string | null;
};

export type ScheduledJobRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  job_type: string;
  enabled: boolean;
  schedule: string;
  provider: string;
  last_run_at: string | null;
  next_run_at: string | null;
  status: string;
  run_count: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type WebhookEventRow = {
  id: string;
  organization_id: string;
  provider: string;
  event_type: string;
  status: string;
  received_at: string;
  processed_at: string | null;
  related_order_id: string | null;
  payload: Json;
  payload_summary: string | null;
  error_message: string | null;
};

export type Database = {
  public: {
    Tables: {
      accounting_entries: TableDefinition<AccountingEntryRow>;
      appraiser_profiles: TableDefinition<AppraiserProfileRow>;
      appraiser_payouts: TableDefinition<Record<string, Json>>;
      audit_logs: TableDefinition<Record<string, Json>>;
      automation_actions: TableDefinition<AutomationActionRow>;
      automation_conditions: TableDefinition<AutomationConditionRow>;
      automation_run_steps: TableDefinition<AutomationRunStepRow>;
      automation_runs: TableDefinition<AutomationRunRow>;
      automation_rules: TableDefinition<AutomationRuleRow>;
      calendar_events: TableDefinition<Record<string, Json>>;
      calendar_preferences: TableDefinition<CalendarPreferenceRow>;
      client_contacts: TableDefinition<ClientContactRow>;
      client_fee_defaults: TableDefinition<ClientFeeDefaultRow>;
      clients: TableDefinition<ClientRow>;
      coverage_areas: TableDefinition<Record<string, Json>>;
      document_audit_events: TableDefinition<DocumentAuditEventRow>;
      document_versions: TableDefinition<DocumentVersionRow>;
      appraisal_report_versions: TableDefinition<AppraisalReportVersionRow>;
      normalized_appraisal_reports: TableDefinition<NormalizedAppraisalReportRow>;
      documents: TableDefinition<DocumentRow>;
      email_deliveries: TableDefinition<EmailDeliveryRow>;
      invitations: TableDefinition<Record<string, Json>>;
      integration_external_mappings: TableDefinition<Record<string, Json>>;
      integration_logs: TableDefinition<IntegrationLogRow>;
      integration_mappings: TableDefinition<IntegrationMappingRow>;
      integration_webhook_events: TableDefinition<Record<string, Json>>;
      integrations: TableDefinition<IntegrationRow>;
      invoice_line_items: TableDefinition<InvoiceLineItemRow>;
      invoice_payments: TableDefinition<Record<string, Json>>;
      invoice_settings: TableDefinition<InvoiceSettingsRow>;
      invoices: TableDefinition<InvoiceRow>;
      message_read_receipts: TableDefinition<MessageReadReceiptRow>;
      notification_queue: TableDefinition<NotificationQueueRow>;
      notifications: TableDefinition<Record<string, Json>>;
      notification_preferences: TableDefinition<NotificationPreferenceRow>;
      notification_templates: TableDefinition<Record<string, Json>>;
      order_assignments: TableDefinition<Record<string, Json>>;
      order_documents: TableDefinition<OrderDocumentRow>;
      order_form_template_fields: TableDefinition<Record<string, Json>>;
      order_form_template_sections: TableDefinition<Record<string, Json>>;
      order_form_templates: TableDefinition<OrderFormTemplateRow>;
      order_import_sessions: TableDefinition<OrderImportSessionRow>;
      order_import_templates: TableDefinition<OrderImportTemplateRow>;
      order_notes: TableDefinition<OrderNoteRow>;
      order_messages: TableDefinition<OrderMessageRow>;
      order_review_items: TableDefinition<Record<string, Json>>;
      order_reviews: TableDefinition<Record<string, Json>>;
      order_status_history: TableDefinition<Record<string, Json>>;
      organization_members: TableDefinition<OrganizationMemberRow>;
      organizations: TableDefinition<OrganizationRow>;
      payroll_run_items: TableDefinition<Record<string, Json>>;
      payroll_runs: TableDefinition<Record<string, Json>>;
      permissions: TableDefinition<Record<string, Json>>;
      public_order_request_documents: TableDefinition<Record<string, Json>>;
      public_order_requests: TableDefinition<PublicOrderRequestRow>;
      public_order_settings: TableDefinition<PublicOrderSettingRow>;
      report_deliveries: TableDefinition<ReportDeliveryRow>;
      report_submissions: TableDefinition<ReportSubmissionRow>;
      required_document_rules: TableDefinition<RequiredDocumentRuleRow>;
      revision_item_events: TableDefinition<RevisionItemEventRow>;
      revision_requests: TableDefinition<Record<string, Json>>;
      review_checklist_items: TableDefinition<Record<string, Json>>;
      review_checklists: TableDefinition<Record<string, Json>>;
      role_permissions: TableDefinition<RolePermissionRow>;
      roles: TableDefinition<RoleRow>;
      scheduled_jobs: TableDefinition<ScheduledJobRow>;
      structured_revision_items: TableDefinition<StructuredRevisionItemRow>;
      structured_revision_requests: TableDefinition<StructuredRevisionRequestRow>;
      tasks: TableDefinition<TaskRow>;
      user_profiles: TableDefinition<UserProfileRow>;
      vendor_documents: TableDefinition<Record<string, Json>>;
      vendor_profiles: TableDefinition<VendorProfileRow>;
      workflow_steps: TableDefinition<Record<string, Json>>;
      workflow_templates: TableDefinition<Record<string, Json>>;
      webhook_events: TableDefinition<WebhookEventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      current_organization_id: { Args: Record<string, never>; Returns: string | null };
      has_any_permission: { Args: { target_organization_id: string; target_permissions: string[] }; Returns: boolean };
      has_permission: { Args: { target_organization_id: string; target_permission: string }; Returns: boolean };
      is_org_admin: { Args: { target_organization_id: string }; Returns: boolean };
      is_org_member: { Args: { target_organization_id: string }; Returns: boolean };
    };
    Enums: {
      member_status: "invited" | "active" | "suspended";
      order_status:
        | "New"
        | "Unassigned"
        | "Assigned"
        | "Accepted"
        | "Inspection Scheduled"
        | "Inspected"
        | "Report In Progress"
        | "Submitted"
        | "In Review"
        | "Revisions Needed"
        | "Revision Sent to Appraiser"
        | "Ready for Delivery"
        | "Delivered"
        | "Completed"
        | "On Hold"
        | "Cancelled";
      organization_type: "appraisal_firm" | "solo_appraiser" | "amc" | "lender_client";
      vendor_status: "invited" | "pending_documents" | "under_review" | "approved" | "suspended" | "inactive";
    };
    CompositeTypes: Record<string, never>;
  };
};
