# Revision Request Workflow

Phase 10.7 creates a reviewer-facing revision-request draft from selected open findings.

## Draft Content

The draft includes:

- Order identifier
- Property address
- Report version reviewed
- Request date
- Due date
- Requested items
- Plain-language explanations
- Source references
- Suggested resolution
- Submission instructions

## Visibility

Only appraiser-visible open findings are included by default. Internal-only findings stay internal unless a reviewer explicitly approves client or appraiser wording.

AI-assisted wording is not sent externally automatically. A human reviewer must confirm, edit, and approve any outward-facing language.

## Lifecycle

1. Reviewer opens the Review Workspace.
2. Reviewer filters and selects findings.
3. CAS drafts revision items from eligible findings.
4. Reviewer edits or removes items.
5. Appraiser responds or uploads a corrected immutable report version.
6. Reviewer compares versions and resolves findings.
7. Delivery readiness explains whether release is still blocked.

## Current Limits

The draft is local-state/demo workflow text in Phase 10.7. A future phase should persist revision-request drafts and approval history in the backend.
