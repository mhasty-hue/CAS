# Secure Download Flow

Production downloads go through `/api/storage/signed-url`.

## Flow

1. Browser sends only `documentId` and optional `versionId`.
2. Server verifies the user session.
3. Server loads `documents` and optional `document_versions` through RLS.
4. Server uses the stored bucket and storage path from metadata.
5. Server asks Supabase Storage for a short-lived signed URL.
6. Server writes a download audit event.
7. Browser opens the signed URL.

## Security Rules

- Browser never supplies bucket or object path.
- URLs expire quickly.
- No service-role keys are exposed to the browser.
- Storage select policies also require matching database metadata.
- Demo documents show a clear message because they do not contain production bytes.

Server streaming can replace signed URLs later if CAS needs one-time links or stricter download auditing.
