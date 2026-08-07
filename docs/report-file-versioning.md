# Report File Versioning

CAS treats appraisal reports as immutable evidence.

## Initial Upload

Uploading a report file stores the real bytes in `cas-private-documents`, creates a `document_versions` row, and creates an `appraisal_report_versions` row.

## Corrected Reports

Corrected report upload:

- creates a new object path
- creates a new document version
- creates a new report version
- leaves prior bytes untouched
- lets reviewers compare versions in the review workspace

## Delivery

Delivery uses the exact stored report files. CAS does not copy, rename, or rewrite report files during delivery. Only delivery-safe report categories are marked final and visible to the delivery recipient.

## Current Limits

Phase 10.8 stores durable report-version metadata. Deterministic review findings still run in the app's review model; a full persisted extraction/finding pipeline remains a later phase.
