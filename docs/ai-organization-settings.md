# AI Organization Settings

Organization AI settings are represented by `OrganizationAiReviewSettings`.

## Settings Fields

- Enabled or disabled
- Provider id
- Model id
- Prompt template version
- Permitted report profiles
- Pre-submission appraiser review permission
- Reviewer-only mode
- Data-retention setting
- Human approval requirement
- Enabled categories
- Maximum content size
- Monthly cost-limit foundation
- Client-visible AI wording prohibition

## Defaults

`defaultAiReviewSettings` disables AI. It uses no provider, no model, no categories, and no content budget.

`demoAiReviewSettings` enables the deterministic `cas-demo-ai` provider for fictional demo data only.

## Administration

Only super admins, company admins, and AMC admins can manage AI review settings in the current permission foundation. Future production work should persist these settings per organization and change them only through server-side authorization.

## Release Checklist

- Confirm the organization explicitly opted in.
- Confirm the provider is approved.
- Confirm data retention and content limits.
- Confirm categories are permitted for the report profile.
- Confirm human approval is required.
- Confirm client-visible AI wording remains prohibited by default.
