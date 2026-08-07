# CAS Notification Architecture

Phase 10.9 centralizes operational communication around one pipeline:

Business event -> event key -> authorized recipients -> user/org preferences -> privacy rendering -> in-app notification -> email queue -> provider attempt -> communication history.

CAS now reuses the existing `notifications`, `notification_preferences`, `notification_templates`, `email_deliveries`, `notification_queue`, `scheduled_jobs`, `webhook_events`, `order_messages`, `report_deliveries`, and document audit tables. The Phase 10.9 migration adds organization notification defaults, reminder dedupe state, enriched queue metadata, and `communication_events`.

UI components should not send email directly. They should create or request notification artifacts, then let the queue/provider processor deliver email where configured.

Supabase mode loads persisted notification rows through the repository. Demo mode uses fictional fixtures and simulated email records only.
