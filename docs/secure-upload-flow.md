# Secure Upload Flow

Production uploads go through `/api/storage/upload`.

## Authenticated Flow

1. Browser sends a real `File` object, order ID, category, optional visibility, and optional document ID.
2. Server verifies the Supabase session with the user's access token.
3. Server loads the order through RLS.
4. Server validates file size, extension, MIME type, and empty-file status.
5. Server calculates a SHA-256 checksum.
6. Server creates pending `documents` metadata when needed.
7. Server uploads bytes to `cas-private-documents`.
8. Server creates a short verification signed URL.
9. Server writes `document_versions`.
10. Server finalizes `documents` metadata.
11. Server creates `appraisal_report_versions` for report categories.
12. Server writes `document_audit_events`.
13. Browser receives a sanitized `ManagedDocument`.

## Report Uploads

Report categories are:

- `Appraisal report PDF`
- `Appraisal XML`
- `UAD 3.6 data package`
- `ENV file`

These create immutable document versions and immutable appraisal report version metadata.

## Failure Handling

Supabase mode reports storage, RLS, or metadata errors to the user. It does not create demo metadata after a failed production upload.
