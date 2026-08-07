# Email Production Setup

Required server-side environment:

- `CAS_EMAIL_PROVIDER=resend`
- `CAS_EMAIL_FROM=CAS <notifications@yourdomain.com>`
- `CAS_EMAIL_REPLY_TO=support@yourdomain.com`
- `RESEND_API_KEY`
- `CAS_NOTIFICATION_PROCESSOR_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Required public environment:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Manual deliverability setup:

- verify sending domain
- configure SPF
- configure DKIM
- configure DMARC
- monitor bounces and complaints
- create suppression-list handling
- verify provider webhooks before trusting bounce/open events

Do not configure provider secrets in public demo deployments.
