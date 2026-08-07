# File Processing Lifecycle

Phase 10.8 adds the storage lifecycle foundation.

## Lifecycle States

```text
Uploaded
Stored
Validation Complete
Extraction Pending
Extracting
Extracted
Review Pending
Reviewed
Failed
```

## Current Implementation

The upload route currently records:

- processing status
- malware scan status foundation
- duplicate detection
- checksum
- content type
- byte size
- storage bucket and object path
- uploader identity
- immutable version number

## Malware Scanning Roadmap

CAS records scan states such as queued, unavailable, passed, or failed. A production malware scanning provider can be added behind the upload service without changing the document workspace UI.

## Error Handling

Storage and metadata failures are shown as plain-language errors. Production upload failures do not fall back to simulated demo records.
