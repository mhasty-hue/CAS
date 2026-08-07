# Reminder And Escalation Engine

Reminder logic lives in `src/lib/notifications/reminders.ts`.

The engine currently evaluates:

- report due soon, due today, and overdue
- assignment acceptance reminders
- revision due reminders
- invoice due soon and overdue
- license/E&O expiration reminders

`notification_reminder_state` stores reminder keys so recurring processors do not double-send the same condition on every run.

Default schedules are stored in `organization_notification_settings`, including due-date warning hours, bid reminders, assignment acceptance target, inspection reminders, revision reminders, invoice reminders, and compliance warning days.

Escalation recipients are role-aware and default to `company_admin`.
