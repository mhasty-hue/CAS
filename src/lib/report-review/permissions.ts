import type { Order, PortalUser } from "@/types/domain";
import type { ReportReviewResult, ReviewFinding, ReviewFindingStatus, ReportReviewVisibilityContext } from "@/types/report-review";
import { canReviewReports } from "@/lib/permissions";

const appraiserRoles = new Set(["appraiser", "solo_appraiser"]);
const internalRoles = new Set(["super_admin", "company_admin", "office_staff", "appraiser_manager", "amc_admin", "amc_staff"]);
const resolvedStatuses: ReviewFindingStatus[] = ["Accepted Explanation", "Corrected", "Dismissed", "Resolved", "Not Applicable"];

function isAssignedAppraiser(order: Order, user: PortalUser) {
  return Boolean(user.appraiserName) && order.appraiser === user.appraiserName;
}

export function canViewReportFinding(context: ReportReviewVisibilityContext, finding: ReviewFinding) {
  const { user, order } = context;
  const sameReviewOrganization = finding.organizationId === context.organization.id;
  if (!sameReviewOrganization && user.role !== "client_user") return false;
  if (user.role === "client_user") return user.clientName === order.client && finding.visibility.includes("client");
  if (appraiserRoles.has(user.role)) return isAssignedAppraiser(order, user) && finding.visibility.includes("appraiser");
  if (canReviewReports(user)) return finding.visibility.includes("internal") || finding.visibility.includes("appraiser");
  return internalRoles.has(user.role) && finding.visibility.includes("internal");
}

export function getVisibleReviewFindings(result: ReportReviewResult | undefined, context: ReportReviewVisibilityContext) {
  return (result?.findings ?? []).filter((finding) => canViewReportFinding(context, finding));
}

export function canRespondToFinding(context: ReportReviewVisibilityContext, finding: ReviewFinding) {
  return appraiserRoles.has(context.user.role) && isAssignedAppraiser(context.order, context.user) && finding.visibility.includes("appraiser") && !resolvedStatuses.includes(finding.status);
}

export function canReviewerManageFinding(context: ReportReviewVisibilityContext) {
  return canReviewReports(context.user) || context.user.role === "company_admin" || context.user.role === "super_admin";
}

export function canReleaseFindingToClient(context: ReportReviewVisibilityContext, finding: ReviewFinding) {
  return canReviewerManageFinding(context) && finding.severity !== "Passed";
}
