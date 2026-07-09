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
  slug: string;
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
  invoice_number: string;
  amount: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  order_count: number;
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

export type Database = {
  public: {
    Tables: {
      accounting_entries: TableDefinition<AccountingEntryRow>;
      appraiser_profiles: TableDefinition<AppraiserProfileRow>;
      appraiser_payouts: TableDefinition<Record<string, Json>>;
      audit_logs: TableDefinition<Record<string, Json>>;
      automation_rules: TableDefinition<Record<string, Json>>;
      calendar_events: TableDefinition<Record<string, Json>>;
      calendar_preferences: TableDefinition<CalendarPreferenceRow>;
      client_contacts: TableDefinition<ClientContactRow>;
      client_fee_defaults: TableDefinition<ClientFeeDefaultRow>;
      clients: TableDefinition<ClientRow>;
      coverage_areas: TableDefinition<Record<string, Json>>;
      documents: TableDefinition<Record<string, Json>>;
      invitations: TableDefinition<Record<string, Json>>;
      invoices: TableDefinition<InvoiceRow>;
      notifications: TableDefinition<Record<string, Json>>;
      order_assignments: TableDefinition<Record<string, Json>>;
      order_documents: TableDefinition<OrderDocumentRow>;
      order_form_template_fields: TableDefinition<Record<string, Json>>;
      order_form_template_sections: TableDefinition<Record<string, Json>>;
      order_form_templates: TableDefinition<OrderFormTemplateRow>;
      order_notes: TableDefinition<OrderNoteRow>;
      order_review_items: TableDefinition<Record<string, Json>>;
      order_reviews: TableDefinition<Record<string, Json>>;
      order_status_history: TableDefinition<Record<string, Json>>;
      organization_members: TableDefinition<OrganizationMemberRow>;
      organizations: TableDefinition<OrganizationRow>;
      payroll_run_items: TableDefinition<Record<string, Json>>;
      payroll_runs: TableDefinition<Record<string, Json>>;
      permissions: TableDefinition<Record<string, Json>>;
      revision_requests: TableDefinition<Record<string, Json>>;
      review_checklist_items: TableDefinition<Record<string, Json>>;
      review_checklists: TableDefinition<Record<string, Json>>;
      role_permissions: TableDefinition<RolePermissionRow>;
      roles: TableDefinition<RoleRow>;
      user_profiles: TableDefinition<UserProfileRow>;
      vendor_documents: TableDefinition<Record<string, Json>>;
      vendor_profiles: TableDefinition<VendorProfileRow>;
      workflow_steps: TableDefinition<Record<string, Json>>;
      workflow_templates: TableDefinition<Record<string, Json>>;
    };
    Views: Record<string, never>;
    Functions: {
      current_organization_id: { Args: Record<string, never>; Returns: string | null };
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
