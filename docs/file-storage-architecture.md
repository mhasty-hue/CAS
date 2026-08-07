# CAS File Storage Architecture

Phase 10.8 moves production file handling from simulated metadata to Supabase Storage.

## Buckets

- `cas-private-documents`: private bucket for authenticated CAS files, including order documents, report files, workfiles, invoices, and compliance documents.
- `public-order-uploads`: private bucket for anonymous public-intake uploads. The bucket name includes "public", but objects are not broadly readable.

The old `cas-public-order-uploads` name is no longer used by application code.

## Data Model

Supabase Storage stores file bytes. PostgreSQL stores metadata, versioning, visibility, audit, delivery, and processing state.

Reused tables:

- `documents`
- `document_versions`
- `report_submissions`
- `report_deliveries`
- `document_audit_events`
- `appraisal_report_versions`
- `public_order_requests`
- `public_order_request_documents`

## Production Versus Demo

Demo mode continues to create fictional upload metadata. Supabase mode uses `/api/storage/*` routes and never silently falls back to demo upload behavior when production storage fails.

## Current Limits

The storage foundation records malware scan status, duplicate detection, processing state, checksums, and immutable versions. A full antivirus provider, OCR pipeline, and long-term retention/cleanup jobs are not included in Phase 10.8.
