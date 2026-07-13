create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);
