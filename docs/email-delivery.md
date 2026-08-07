# Email Delivery

Email delivery is server-side only.

The shared notification service creates sanitized queue items and email messages. The server-side provider boundary lives in `src/lib/notifications/email-provider.ts`.

Supported behavior:

- `development-log`: records a simulated delivery for development/demo.
- `resend`: sends through the Resend HTTP API when `CAS_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `CAS_EMAIL_FROM` are configured.
- missing or unsupported provider: records `Configuration required` and does not pretend the email was sent.

The recurring processor endpoint is `POST /api/notifications/process`. It requires `CAS_NOTIFICATION_PROCESSOR_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` server-side. Never expose those values to browser code.

Emails contain CAS action links, not attached appraisal PDFs and not permanent signed storage URLs.
