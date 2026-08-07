# Public Intake Storage

Public intake uploads use `/api/storage/public-intake-upload` and the `public-order-uploads` bucket.

## Behavior

1. Public user submits the intake form.
2. Server resolves the organization from the public slug.
3. Server creates a `public_order_requests` row.
4. Server creates a `public_order_request_documents` row for each file.
5. Server uploads bytes to `public-order-uploads`.
6. Staff can review the request and attach documents to an order later.

## Allowed Files

Public intake accepts:

- PDF
- CSV
- XLS/XLSX
- JPG/JPEG
- PNG

The limit is 25 MB per file.

## Security

- Anonymous users cannot list, read, overwrite, or delete public intake files.
- Paths are server-built as `intake/{requestId}/{uploadId}/{safeFileName}`.
- Storage insert policy verifies a matching metadata row, accepted consent, pending-review status, and a recent submission.
- Uploads remain quarantined as intake files until staff review them.
