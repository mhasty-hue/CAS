# Communication History

Order communication history is built from:

- `communication_events`
- `notification_queue`
- `email_deliveries`
- `order_messages`
- `report_deliveries`
- `document_audit_events`

The UI shows date/time, channel, recipient, event, delivery status, and related action.

External clients do not see internal recipients, provider payloads, private workfile links, storage paths, payroll, bid details, or reviewer-only notes.

Report delivery history confirms that the report was released through CAS. The actual file is fetched later through authorized signed-url generation.
