import type { NotificationCategory, NotificationEventKey, NotificationPriority, NotificationVisibilityClassification } from "@/types/domain";

export type NotificationEventDefinition = {
  eventKey: NotificationEventKey;
  label: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  defaultAudience: string;
  requiresAction?: boolean;
  mandatory?: boolean;
  templateVersion: number;
  visibilityClassification: NotificationVisibilityClassification;
};

type DefinitionInput = Omit<NotificationEventDefinition, "templateVersion"> & { templateVersion?: number };

const definitions: DefinitionInput[] = [
  { eventKey: "new_order_received", label: "New order received", category: "orders", priority: "high", defaultAudience: "Order desk", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "new_public_order_received", label: "New public order received", category: "orders", priority: "high", defaultAudience: "Intake staff", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "new_private_order_received", label: "New private order received", category: "orders", priority: "high", defaultAudience: "Intake staff", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "new_connected_order_received", label: "New connected order received", category: "orders", priority: "high", defaultAudience: "Connected order staff", requiresAction: true, visibilityClassification: "shared" },
  { eventKey: "order_needs_intake_review", label: "Order needs intake review", category: "orders", priority: "high", defaultAudience: "Office staff", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "client_information_missing", label: "Client information missing", category: "orders", priority: "high", defaultAudience: "Order desk", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "client_document_uploaded", label: "Client document uploaded", category: "documents", priority: "normal", defaultAudience: "Order team", visibilityClassification: "client_safe" },
  { eventKey: "order_cancelled", label: "Order cancelled", category: "orders", priority: "high", defaultAudience: "Order participants", visibilityClassification: "shared" },
  { eventKey: "order_reopened", label: "Order reopened", category: "orders", priority: "high", defaultAudience: "Order participants", requiresAction: true, visibilityClassification: "shared" },
  { eventKey: "public_order_request_submitted", label: "Public order request submitted", category: "orders", priority: "high", defaultAudience: "Configured intake recipients", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "order_needs_assignment", label: "Order needs assignment", category: "assignments", priority: "high", defaultAudience: "Assignment desk", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "direct_assignment_sent", label: "Direct assignment sent", category: "assignments", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "order_assigned", label: "Order assigned", category: "assignments", priority: "high", defaultAudience: "Assigned appraiser and permitted client contacts", requiresAction: true, visibilityClassification: "shared" },
  { eventKey: "assignment_accepted", label: "Assignment accepted", category: "assignments", priority: "normal", defaultAudience: "Assigning organization", visibilityClassification: "shared" },
  { eventKey: "assignment_declined", label: "Assignment declined", category: "assignments", priority: "high", defaultAudience: "Assigning organization", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "assignment_withdrawn", label: "Assignment withdrawn", category: "assignments", priority: "high", defaultAudience: "Assigned appraiser", visibilityClassification: "appraiser_safe" },
  { eventKey: "assignment_reassigned", label: "Assignment reassigned", category: "assignments", priority: "high", defaultAudience: "Order participants", requiresAction: true, visibilityClassification: "shared" },
  { eventKey: "vendor_has_not_responded", label: "Vendor has not responded", category: "assignments", priority: "high", defaultAudience: "Assigning staff", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "assignment_acceptance_deadline_approaching", label: "Assignment deadline approaching", category: "assignments", priority: "high", defaultAudience: "Assigned appraiser and assigning staff", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "bid_request_sent", label: "Bid request sent", category: "bids", priority: "normal", defaultAudience: "Bid managers", visibilityClassification: "internal" },
  { eventKey: "bid_invitation_delivered", label: "Bid invitation delivered", category: "bids", priority: "normal", defaultAudience: "Bid managers", visibilityClassification: "internal" },
  { eventKey: "bid_invitation_failed", label: "Bid invitation failed", category: "bids", priority: "critical", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "bid_viewed", label: "Bid viewed", category: "bids", priority: "low", defaultAudience: "Bid managers", visibilityClassification: "internal" },
  { eventKey: "bid_submitted", label: "Bid submitted", category: "bids", priority: "high", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "bid_revised", label: "Bid revised", category: "bids", priority: "high", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "bid_declined", label: "Bid declined", category: "bids", priority: "normal", defaultAudience: "Bid managers", visibilityClassification: "internal" },
  { eventKey: "bid_deadline_approaching", label: "Bid deadline approaching", category: "bids", priority: "high", defaultAudience: "Bid recipients and managers", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "bid_expired", label: "Bid expired", category: "bids", priority: "high", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "new_bid_response_received", label: "New bid response received", category: "bids", priority: "high", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "bid_awarded", label: "Bid awarded", category: "bids", priority: "high", defaultAudience: "Winner and bid managers", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "bid_not_selected", label: "Bid not selected", category: "bids", priority: "normal", defaultAudience: "Non-winning bidders", visibilityClassification: "appraiser_safe" },
  { eventKey: "winning_bidder_accepted", label: "Winning bidder accepted", category: "bids", priority: "normal", defaultAudience: "Bid managers", visibilityClassification: "internal" },
  { eventKey: "winning_bidder_declined", label: "Winning bidder declined", category: "bids", priority: "high", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "bidding_reopened", label: "Bidding reopened", category: "bids", priority: "high", defaultAudience: "Bid managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "inspection_scheduling_requested", label: "Inspection scheduling requested", category: "inspections", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "inspection_scheduled", label: "Inspection scheduled", category: "inspections", priority: "normal", defaultAudience: "Order participants", visibilityClassification: "client_safe" },
  { eventKey: "inspection_rescheduled", label: "Inspection rescheduled", category: "inspections", priority: "high", defaultAudience: "Order participants", visibilityClassification: "client_safe" },
  { eventKey: "inspection_cancelled", label: "Inspection cancelled", category: "inspections", priority: "high", defaultAudience: "Order participants", requiresAction: true, visibilityClassification: "client_safe" },
  { eventKey: "inspection_occurring_today", label: "Inspection occurring today", category: "inspections", priority: "normal", defaultAudience: "Assigned appraiser and permitted clients", visibilityClassification: "client_safe" },
  { eventKey: "inspection_completed", label: "Inspection completed", category: "inspections", priority: "normal", defaultAudience: "Order participants", visibilityClassification: "client_safe" },
  { eventKey: "inspection_date_passed_without_completion", label: "Inspection date passed without completion", category: "inspections", priority: "critical", defaultAudience: "Assigned appraiser and office staff", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "report_due_soon", label: "Report due soon", category: "review", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "report_due_today", label: "Report due today", category: "review", priority: "critical", defaultAudience: "Assigned appraiser and office staff", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "report_overdue", label: "Report overdue", category: "review", priority: "critical", defaultAudience: "Assigned appraiser and office staff", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "due_date_warning", label: "Due-date warning", category: "review", priority: "high", defaultAudience: "Order participants", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "past_due_warning", label: "Past-due warning", category: "review", priority: "critical", defaultAudience: "Order participants", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "report_uploaded", label: "Report uploaded", category: "review", priority: "high", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "corrected_report_uploaded", label: "Corrected report uploaded", category: "revisions", priority: "high", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "report_submitted", label: "Report submitted", category: "review", priority: "high", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "automated_checks_completed", label: "Automated checks completed", category: "review", priority: "normal", defaultAudience: "Reviewer and submitter", visibilityClassification: "internal" },
  { eventKey: "critical_review_finding_created", label: "Critical review finding created", category: "review", priority: "critical", defaultAudience: "Reviewer and appraiser", requiresAction: true, visibilityClassification: "reviewer_only" },
  { eventKey: "report_entered_review", label: "Report entered review", category: "review", priority: "normal", defaultAudience: "Permitted client contacts", visibilityClassification: "client_safe" },
  { eventKey: "review_completed", label: "Review completed", category: "review", priority: "normal", defaultAudience: "Order participants", visibilityClassification: "shared" },
  { eventKey: "report_approved", label: "Report approved", category: "review", priority: "high", defaultAudience: "Delivery users", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "report_ready_for_delivery", label: "Report ready for delivery", category: "delivery", priority: "high", defaultAudience: "Delivery users", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "final_report_ready_for_delivery", label: "Final report ready for delivery", category: "delivery", priority: "high", defaultAudience: "Delivery users", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "report_delivered", label: "Report delivered", category: "delivery", priority: "normal", defaultAudience: "Delivery users", visibilityClassification: "client_safe" },
  { eventKey: "final_report_delivered", label: "Final report delivered", category: "delivery", priority: "high", defaultAudience: "Client delivery recipients", visibilityClassification: "client_safe" },
  { eventKey: "final_report_downloaded", label: "Final report downloaded", category: "delivery", priority: "low", defaultAudience: "Delivery users", visibilityClassification: "internal" },
  { eventKey: "revision_requested", label: "Revision requested", category: "revisions", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "revisions_requested", label: "Revisions requested", category: "revisions", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "revision_due_soon", label: "Revision due soon", category: "revisions", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "revision_overdue", label: "Revision overdue", category: "revisions", priority: "critical", defaultAudience: "Assigned appraiser and reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "appraiser_responded", label: "Appraiser responded", category: "revisions", priority: "high", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "revision_response_received", label: "Revision response received", category: "revisions", priority: "high", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "corrected_report_received", label: "Corrected report received", category: "revisions", priority: "high", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "revision_resolved", label: "Revision resolved", category: "revisions", priority: "normal", defaultAudience: "Order participants", visibilityClassification: "shared" },
  { eventKey: "additional_revision_required", label: "Additional revision required", category: "revisions", priority: "high", defaultAudience: "Assigned appraiser", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "document_requested", label: "Document requested", category: "documents", priority: "high", defaultAudience: "Document recipient", requiresAction: true, visibilityClassification: "shared" },
  { eventKey: "requested_document_uploaded", label: "Requested document uploaded", category: "documents", priority: "normal", defaultAudience: "Document requester", visibilityClassification: "shared" },
  { eventKey: "new_client_visible_document", label: "New client-visible document", category: "documents", priority: "normal", defaultAudience: "Client users", visibilityClassification: "client_safe" },
  { eventKey: "new_appraiser_visible_document", label: "New appraiser-visible document", category: "documents", priority: "normal", defaultAudience: "Appraiser users", visibilityClassification: "appraiser_safe" },
  { eventKey: "document_processing_failed", label: "Document processing failed", category: "documents", priority: "high", defaultAudience: "Document managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "required_document_missing", label: "Required document missing", category: "documents", priority: "high", defaultAudience: "Document managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "license_expiring", label: "License expiring", category: "compliance", priority: "high", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "license_expired", label: "License expired", category: "compliance", priority: "critical", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "eo_expiring", label: "E&O expiring", category: "compliance", priority: "high", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "eo_expired", label: "E&O expired", category: "compliance", priority: "critical", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "w9_missing", label: "W-9 missing", category: "compliance", priority: "high", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "vendor_compliance_document_expiring", label: "Vendor compliance document expiring", category: "compliance", priority: "high", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "compliance_document_requested", label: "Compliance document requested", category: "compliance", priority: "high", defaultAudience: "Vendor", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "compliance_document_uploaded", label: "Compliance document uploaded", category: "compliance", priority: "normal", defaultAudience: "Vendor manager", visibilityClassification: "internal" },
  { eventKey: "vendor_assignment_ineligible", label: "Vendor assignment-ineligible", category: "compliance", priority: "critical", defaultAudience: "Vendor manager", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "vendor_compliant_again", label: "Vendor compliant again", category: "compliance", priority: "normal", defaultAudience: "Vendor manager", visibilityClassification: "internal" },
  { eventKey: "invoice_created", label: "Invoice created", category: "accounting", priority: "normal", defaultAudience: "Accounting users", visibilityClassification: "accounting_restricted" },
  { eventKey: "invoice_generated", label: "Invoice generated", category: "accounting", priority: "normal", defaultAudience: "Accounting users", visibilityClassification: "accounting_restricted" },
  { eventKey: "invoice_sent", label: "Invoice sent", category: "accounting", priority: "normal", defaultAudience: "Accounting users", visibilityClassification: "accounting_restricted" },
  { eventKey: "invoice_due_soon", label: "Invoice due soon", category: "accounting", priority: "high", defaultAudience: "Accounting users", requiresAction: true, visibilityClassification: "accounting_restricted" },
  { eventKey: "invoice_overdue", label: "Invoice overdue", category: "accounting", priority: "critical", defaultAudience: "Accounting users", requiresAction: true, visibilityClassification: "accounting_restricted" },
  { eventKey: "invoice_paid", label: "Invoice paid", category: "accounting", priority: "normal", defaultAudience: "Accounting users", visibilityClassification: "accounting_restricted" },
  { eventKey: "vendor_payment_approved", label: "Vendor payment approved", category: "accounting", priority: "normal", defaultAudience: "Payroll users", visibilityClassification: "accounting_restricted" },
  { eventKey: "vendor_payment_issued", label: "Vendor payment issued", category: "accounting", priority: "normal", defaultAudience: "Payroll users", visibilityClassification: "accounting_restricted" },
  { eventKey: "payroll_ready_for_review", label: "Payroll ready for review", category: "accounting", priority: "high", defaultAudience: "Payroll reviewers", requiresAction: true, visibilityClassification: "accounting_restricted" },
  { eventKey: "new_internal_mention", label: "New internal mention", category: "messages", priority: "normal", defaultAudience: "Mentioned user", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "new_client_message", label: "New client message", category: "messages", priority: "normal", defaultAudience: "Client message participants", requiresAction: true, visibilityClassification: "client_safe" },
  { eventKey: "new_appraiser_message", label: "New appraiser message", category: "messages", priority: "normal", defaultAudience: "Appraiser message participants", requiresAction: true, visibilityClassification: "appraiser_safe" },
  { eventKey: "new_reviewer_comment", label: "New reviewer comment", category: "messages", priority: "normal", defaultAudience: "Reviewer", requiresAction: true, visibilityClassification: "reviewer_only" },
  { eventKey: "message_received", label: "Message received", category: "messages", priority: "normal", defaultAudience: "Message participants", requiresAction: true, visibilityClassification: "shared" },
  { eventKey: "user_invited", label: "User invited", category: "system", priority: "normal", defaultAudience: "Invited user", mandatory: true, visibilityClassification: "security" },
  { eventKey: "invitation_accepted", label: "Invitation accepted", category: "system", priority: "normal", defaultAudience: "Company admins", mandatory: true, visibilityClassification: "security" },
  { eventKey: "invitation_expiring", label: "Invitation expiring", category: "system", priority: "high", defaultAudience: "Invited user and admins", mandatory: true, requiresAction: true, visibilityClassification: "security" },
  { eventKey: "password_security_notification", label: "Password or security notification", category: "system", priority: "critical", defaultAudience: "Affected user", mandatory: true, visibilityClassification: "security" },
  { eventKey: "organization_membership_changed", label: "Organization membership changed", category: "system", priority: "normal", defaultAudience: "Affected user", mandatory: true, visibilityClassification: "security" },
  { eventKey: "permission_changed", label: "Permission changed", category: "system", priority: "normal", defaultAudience: "Affected user", mandatory: true, visibilityClassification: "security" },
  { eventKey: "integration_failure", label: "Integration failure", category: "system", priority: "high", defaultAudience: "Integration managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "file_upload_failed", label: "File upload failed", category: "system", priority: "high", defaultAudience: "Uploader and document managers", requiresAction: true, visibilityClassification: "internal" },
  { eventKey: "report_processing_failed", label: "Report processing failed", category: "system", priority: "high", defaultAudience: "Reviewer and uploader", requiresAction: true, visibilityClassification: "internal" }
];

export const notificationEventCatalog = definitions.reduce<Record<string, NotificationEventDefinition>>((map, definition) => {
  map[definition.eventKey] = { ...definition, templateVersion: definition.templateVersion ?? 1 };
  return map;
}, {});

export const notificationCenterCategories: Array<"all" | NotificationCategory> = [
  "all",
  "orders",
  "assignments",
  "bids",
  "inspections",
  "review",
  "revisions",
  "documents",
  "accounting",
  "compliance",
  "system"
];

export function getNotificationDefinition(eventKey: NotificationEventKey | string): NotificationEventDefinition {
  const existing = notificationEventCatalog[eventKey];
  if (existing) return existing;

  return {
    eventKey: eventKey as NotificationEventKey,
    label: eventKey.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase()),
    category: "system",
    priority: "normal",
    defaultAudience: "Configured organization recipients",
    templateVersion: 1,
    visibilityClassification: "internal"
  };
}

export function normalizeNotificationCategory(value: string | undefined): NotificationCategory {
  const categories = notificationCenterCategories.filter((category): category is NotificationCategory => category !== "all");
  return categories.includes(value as NotificationCategory) ? (value as NotificationCategory) : "system";
}
