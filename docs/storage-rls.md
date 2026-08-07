# Storage RLS

CAS uses application authorization and Supabase Storage RLS together.

## Private Bucket

Bucket: `cas-private-documents`

Rules:

- no public reads
- no anonymous reads
- insert requires authenticated upload permissions
- insert path must match CAS private path conventions
- select requires matching document metadata and organization membership
- update is not granted for immutable document versions

## Public Intake Bucket

Bucket: `public-order-uploads`

Rules:

- anonymous insert is constrained to public-intake metadata and path validation
- no broad anonymous read
- no overwrite
- receiving organization can read through metadata policies

## Important Notes

Storage object paths are not the only authorization boundary. The database metadata and RLS policies must agree with the object path before a user can upload or download.

Security Advisor should be run after applying Phase 10.8 migrations.
