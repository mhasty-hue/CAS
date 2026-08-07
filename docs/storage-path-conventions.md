# Storage Path Conventions

CAS builds storage paths on the server. Browsers submit document IDs, order IDs, and files, never full object paths.

## Private Order Documents

```text
organizations/{organizationId}/orders/{orderId}/documents/{documentId}/versions/{versionNumber}/{safeFileName}
```

## Appraisal Report Versions

```text
organizations/{organizationId}/orders/{orderId}/reports/{reportVersionId}/v{versionNumber}/{safeFileName}
```

## Vendor Compliance

```text
organizations/{organizationId}/vendors/{vendorId}/compliance/{documentId}/versions/{versionNumber}/{safeFileName}
```

## Public Intake

```text
intake/{intakeSessionId}/{uploadId}/{safeFileName}
```

## Rules

- Object paths use immutable IDs, not borrower names, addresses, SSNs, or client instructions.
- File names are sanitized with `sanitizeStorageFileName`.
- `../`, double slashes, executable extensions, and unsupported file types are blocked.
- Original display file names remain in database metadata.
- Report paths use the report-version ID so corrected reports do not overwrite prior report bytes.
