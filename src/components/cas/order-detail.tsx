import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Gavel,
  History,
  Mail,
  MapPin,
  MessageSquare,
  ReceiptText,
  RotateCcw,
  Send,
  UploadCloud,
  UserCheck,
  XCircle
} from "lucide-react";
import type {
  DeliveryRecord,
  DocumentCategory,
  DocumentVisibility,
  InspectionInfo,
  ManagedDocument,
  MessageChannel,
  Order,
  OrderMessage,
  OrderStatus,
  Organization,
  OrganizationOrderStatus,
  PortalUser,
  RequiredDocumentRule,
  RevisionRequest,
  RevisionStatus,
  VendorCountyCoverage
} from "@/types/domain";
import type { AppraisalReportVersion, ReportReviewResult, ReviewFindingStatus, ReviewSeverity } from "@/types/report-review";
import {
  buildBidRequestDraft,
  buildDirectAssignmentDraft,
  buildOrderRelationshipSummary,
  buildPlainOrderHistory,
  canManageOrderAssignment,
  canViewBidComparison,
  canViewOrderAccounting,
  getOrderAssignmentDisplayState,
  getOrderBidEligibility,
  getOrderBidState,
  getOrderDetailAlert,
  getOrderDetailSections,
  getPrimaryOrderAction,
  getVisibleBidRecipientsForUser,
  isAssignedOrderAppraiser,
  orderDetailSectionLabels,
  type OrderBidContext,
  type OrderConnectedContext,
  type OrderDetailSectionId,
  type OrderBidWorkflowDraft
} from "@/lib/orders/detail";
import { statusDefinitions } from "@/lib/orders/workflow";
import { getAuthorizedOrderFees, getOrderFinancials } from "@/lib/orders/fees";
import { canUseCustomerTrackingView, clientTrackingStages, getClientTrackingStage, getOrganizationStatusLabel } from "@/lib/orders/status-config";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { DetailSection, DueChip, InfoRow, ListOrEmpty, MetricTile, PriorityChip, StatusChip, SummaryItem } from "./shared";
import { OrderDocumentWorkspace, RequiredDocumentSummary } from "./documents/workspace";
import { OrderConversationPanel } from "./messages/conversation";
import { InspectionPanel, ReportMetadataSection } from "./orders";
import { ReportReviewPanel } from "./report-review";
import { RevisionSummary, RevisionWorkflowPanel } from "./revisions/workflow";

type InspectionAction = "schedule" | "reschedule" | "complete" | "cancel" | "note";

type OrderDetailPageProps = {
  order: Order;
  user: PortalUser;
  organization: Organization;
  statusConfigs: OrganizationOrderStatus[];
  onBack: () => void;
  onAssignOrder: (orderId: string, appraiserName: string, note: string, vendorFee?: number) => void;
  onStatusChange: (orderId: string, status: OrderStatus, reason?: string, organizationStatusId?: string) => void;
  onUpdateInspection: (orderId: string, inspection: InspectionInfo, action: InspectionAction, note: string) => void;
  onAddNote: (orderId: string) => void;
  onGenerateInvoice: (orderId: string) => void;
  managedDocuments: ManagedDocument[];
  requiredDocumentRules: RequiredDocumentRule[];
  orderMessages: OrderMessage[];
  revisionRequests: RevisionRequest[];
  reportVersions: AppraisalReportVersion[];
  reportReviewResults: ReportReviewResult[];
  deliveryRecords: DeliveryRecord[];
  realUploadsEnabled?: boolean;
  onUploadDocument: (orderId: string, category: DocumentCategory, files?: File[], visibility?: DocumentVisibility) => void;
  onArchiveDocument: (documentId: string) => void;
  onRestoreDocument: (documentId: string) => void;
  onReplaceDocumentVersion: (documentId: string, files?: File[]) => void;
  onOpenSignedUrl?: (documentId: string, versionId?: string) => void;
  onSubmitReport: (orderId: string) => void;
  onDeliverReport: (orderId: string) => void;
  onSendMessage: (orderId: string, channel: MessageChannel, body: string) => void;
  onToggleMessagePinned: (messageId: string) => void;
  onToggleMessageRead: (messageId: string) => void;
  onUpdateRevisionStatus: (revisionId: string, status: RevisionStatus) => void;
  onRespondToRevisionItem: (revisionId: string, itemId: string) => void;
  onRunReportReview: (orderId: string, files?: File[]) => void;
  onUploadCorrectedReport: (orderId: string, files?: File[]) => void;
  onRespondToReportFinding: (findingId: string, response: string) => void;
  onUpdateReportFindingStatus: (findingId: string, status: ReviewFindingStatus, severity?: ReviewSeverity) => void;
  onReleaseReportFindingToClient: (findingId: string) => void;
  onMarkReportReadyForDelivery: (orderId: string) => void;
  bids: OrderBidContext;
  connected: OrderConnectedContext;
  vendorCoverage: VendorCountyCoverage[];
};

function SoftChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-rose-200 bg-rose-50 text-rose-700",
    brand: "border-brand-100 bg-brand-50 text-brand-700"
  };
  return <span className={cn("chip", tones[tone])}>{children}</span>;
}

function statusChipTone(value: string) {
  const normalized = value.toLowerCase();
  if (["current", "on_file", "approved", "eligible", "direct", "submitted", "responded", "accepted"].includes(normalized)) return "good";
  if (["nearby", "balanced", "busy", "pending", "pending_acceptance", "viewed", "sent"].includes(normalized)) return "warn";
  if (["expired", "missing", "blocked", "suspended", "inactive", "declined", "excluded", "not_approved"].includes(normalized)) return "bad";
  return "neutral";
}

function StatusLabelChip({ order, user, organization, statusConfigs }: { order: Order; user: PortalUser; organization: Organization; statusConfigs: OrganizationOrderStatus[] }) {
  const label = getOrganizationStatusLabel(order, statusConfigs, organization, user);
  if (user.role === "client_user" || label !== order.status) {
    return <SoftChip tone="brand">{label}</SoftChip>;
  }
  return <StatusChip status={order.status} />;
}

function RelationshipSummary({ order, user, organization, connected }: Pick<OrderDetailPageProps, "order" | "user" | "organization" | "connected">) {
  const items = buildOrderRelationshipSummary({ order, user, organization, connected });
  return (
    <section className="panel p-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-950">Order Relationships</h2>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <SummaryItem key={`${item.label}-${item.value}`} label={item.label} value={item.value} />)}
      </div>
    </section>
  );
}

function CoverageRow({
  coverage,
  selected,
  onToggle,
  disabled
}: {
  coverage: VendorCountyCoverage;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("rounded-md border border-line bg-white p-3", disabled && "opacity-70")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-950">{coverage.displayName}</h4>
            <SoftChip tone={coverage.coverageType === "direct" ? "good" : "warn"}>{coverage.coverageType === "direct" ? "Direct county" : "Nearby county"}</SoftChip>
            <SoftChip tone={statusChipTone(coverage.eligibilityStatus)}>{coverage.eligibilityStatus}</SoftChip>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">{coverage.reason}</p>
        </div>
        {onToggle && (
          <button className={selected ? "primary-button h-9" : "secondary-button h-9"} onClick={onToggle} disabled={disabled}>
            {selected ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {selected ? "Selected" : "Select"}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <MetricTile label="License" value={coverage.licenseStatus.replaceAll("_", " ")} />
        <MetricTile label="E&O" value={coverage.eoStatus.replaceAll("_", " ")} />
        <MetricTile label="W-9" value={coverage.w9Status.replaceAll("_", " ")} />
        <MetricTile label="Capacity" value={`${coverage.currentWorkload}/${coverage.capacityLimit ?? "?"} ${coverage.capacityStatus}`} />
      </div>
      {coverage.exclusionReasons.length > 0 && <div className="mt-3 text-xs text-rose-700">{coverage.exclusionReasons.join(" - ")}</div>}
    </div>
  );
}

function BidComparisonTable({
  order,
  user,
  organization,
  bids,
  onAssignOrder,
  onSuccess
}: {
  order: Order;
  user: PortalUser;
  organization: Organization;
  bids: OrderBidContext;
  onAssignOrder: (orderId: string, appraiserName: string, note: string, vendorFee?: number) => void;
  onSuccess: (message: string) => void;
}) {
  const bidState = getOrderBidState(order, bids);
  const visibleRecipients = getVisibleBidRecipientsForUser(order, bids, user, organization);
  const responsesByRecipient = new Map(bidState.responses.map((response) => [response.recipientId, response]));
  const canCompare = canViewBidComparison(order, user, organization);

  if (!visibleRecipients.length) {
    return <div className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500">No bid invitations are visible for your role on this order.</div>;
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Gavel className="h-4 w-4 text-brand-600" /> Bid Responses</div>
          <p className="mt-1 text-sm text-slate-600">
            {canCompare ? "Compare vendor fee, turn time, coverage, compliance, capacity, and notes. Lowest vendor fee is not automatically selected." : "Only your own invitation and response are shown."}
          </p>
          {canCompare && <p className="mt-1 text-xs text-slate-500">Non-winners receive a professional not-selected notice without the winning vendor fee or other bidder identities.</p>}
        </div>
        {bidState.openRequest && <SoftChip tone="brand">Deadline {formatDate(bidState.openRequest.bidDeadlineAt.slice(0, 10))}</SoftChip>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-y border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Coverage</th>
              <th className="px-4 py-3">Proposed Vendor Fee</th>
              <th className="px-4 py-3">Turn</th>
              <th className="px-4 py-3">Compliance</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              {canCompare && <th className="px-4 py-3">Award</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRecipients.map((recipient) => {
              const response = responsesByRecipient.get(recipient.id);
              const coverage = recipient.eligibilitySnapshot;
              return (
                <tr key={recipient.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{recipient.recipientName}</td>
                  <td className="px-4 py-3"><SoftChip tone={recipient.coverageMatch === "direct" ? "good" : "warn"}>{recipient.coverageMatch.replaceAll("_", " ")}</SoftChip></td>
                  <td className="px-4 py-3">{response?.proposedFee ? formatCurrency(response.proposedFee) : "-"}</td>
                  <td className="px-4 py-3">{response?.turnTimeDays ? `${response.turnTimeDays} days` : "-"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {coverage.licenseStatus.replaceAll("_", " ")} / {coverage.eoStatus.replaceAll("_", " ")} / {coverage.w9Status.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">{coverage.capacityStatus}</td>
                  <td className="px-4 py-3"><SoftChip tone={statusChipTone(response?.responseStatus ?? recipient.invitationStatus)}>{response?.responseStatus ?? recipient.invitationStatus}</SoftChip></td>
                  <td className="px-4 py-3 text-slate-600">{response?.declineReason ?? response?.notes ?? response?.inspectionAvailability ?? "Awaiting response"}</td>
                  {canCompare && (
                    <td className="px-4 py-3">
                      <button
                        className="secondary-button h-8 px-2 text-xs"
                        disabled={!response || response.responseStatus === "declined"}
                        onClick={() => {
                          const vendorFee = response?.proposedFee ?? getOrderFinancials(order).vendorFee;
                          onAssignOrder(order.id, recipient.recipientName, `Awarded bid response for ${formatCurrency(vendorFee)} with ${response?.turnTimeDays ?? "pending"} day turn time.`, vendorFee);
                          onSuccess(`${recipient.recipientName} was selected. The same order is now awaiting acceptance; no duplicate order was created.`);
                        }}
                      >
                        Select winner
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BidderResponsePanel({
  order,
  user,
  organization,
  bids
}: {
  order: Order;
  user: PortalUser;
  organization: Organization;
  bids: OrderBidContext;
}) {
  const visibleRecipients = getVisibleBidRecipientsForUser(order, bids, user, organization);
  const bidState = getOrderBidState(order, bids);
  const responsesByRecipient = new Map(bidState.responses.map((response) => [response.recipientId, response]));
  const [declineReason, setDeclineReason] = useState("");

  if (!visibleRecipients.length) return null;

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Mail className="h-4 w-4 text-brand-600" /> Your Bid Invitation</div>
      <div className="mt-3 grid gap-3">
        {visibleRecipients.map((recipient) => {
          const response = responsesByRecipient.get(recipient.id);
          return (
            <div key={recipient.id} className="rounded-md border border-line p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-semibold text-slate-950">{order.address}</div>
                  <p className="mt-1 text-sm text-slate-600">{order.productType} - requested due {formatDate(order.dueDate)}</p>
                  <p className="mt-1 text-xs text-slate-500">You cannot see other bidders or their responses.</p>
                </div>
                <SoftChip tone={statusChipTone(response?.responseStatus ?? recipient.invitationStatus)}>{response?.responseStatus ?? recipient.invitationStatus}</SoftChip>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input className="control" placeholder="Proposed vendor fee" defaultValue={response?.proposedFee ? String(response.proposedFee) : ""} />
                <input className="control" placeholder="Turn time days" defaultValue={response?.turnTimeDays ? String(response.turnTimeDays) : ""} />
                <input className="control" placeholder="Inspection availability" defaultValue={response?.inspectionAvailability ?? ""} />
              </div>
              <textarea className="control mt-2 min-h-20 w-full py-3" placeholder="Notes or alternate terms" defaultValue={response?.notes ?? ""} />
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <select className="control" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)}>
                  <option value="">Decline reason required if declining</option>
                  <option>Outside coverage area</option>
                  <option>Unable to meet due date</option>
                  <option>Vendor fee is insufficient</option>
                  <option>Capacity/workload</option>
                  <option>Conflict of interest</option>
                  <option>Other</option>
                </select>
                <button className="primary-button justify-center"><Send className="h-4 w-4" /> Submit bid</button>
                <button
                  className="secondary-button justify-center"
                  onClick={() => {
                    if (!declineReason) window.alert("Choose a decline reason before declining this bid opportunity.");
                  }}
                >
                  <XCircle className="h-4 w-4" /> Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AssignmentWorkspace({
  order,
  user,
  organization,
  bids,
  vendorCoverage,
  onAssignOrder,
  onStatusChange,
  onSuccess
}: {
  order: Order;
  user: PortalUser;
  organization: Organization;
  bids: OrderBidContext;
  vendorCoverage: VendorCountyCoverage[];
  onAssignOrder: (orderId: string, appraiserName: string, note: string, vendorFee?: number) => void;
  onStatusChange: (orderId: string, status: OrderStatus, reason?: string, organizationStatusId?: string) => void;
  onSuccess: (message: string) => void;
}) {
  const eligibility = useMemo(() => getOrderBidEligibility(order, vendorCoverage), [order, vendorCoverage]);
  const bidState = getOrderBidState(order, bids);
  const canManage = canManageOrderAssignment(user, organization);
  const ownAppraiserOrder = isAssignedOrderAppraiser(order, user);
  const financials = getOrderFinancials(order);
  const [method, setMethod] = useState<"direct" | "bid">("direct");
  const [selectedDirectId, setSelectedDirectId] = useState(eligibility.eligible[0]?.id ?? "");
  const [selectedBidIds, setSelectedBidIds] = useState<string[]>(eligibility.eligible.slice(0, 3).map((coverage) => coverage.id));
  const [fee, setFee] = useState(String(financials.vendorFee || Math.round(financials.clientFee * 0.6)));
  const [dueDate, setDueDate] = useState(order.dueDate);
  const [deadline, setDeadline] = useState(order.dueDate);
  const [instructions, setInstructions] = useState(`Please review ${order.productType} for ${order.address}. Access: ${order.accessInfo}`);
  const [coverageConfirmation, setCoverageConfirmation] = useState("");
  const [localBidDraft, setLocalBidDraft] = useState<OrderBidWorkflowDraft | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const allSelectableBidCoverages = useMemo(
    () => eligibility.directCoverageFound ? eligibility.eligible : [...eligibility.eligible, ...eligibility.nearby],
    [eligibility.directCoverageFound, eligibility.eligible, eligibility.nearby]
  );
  const selectedDirectCoverage = eligibility.eligible.find((coverage) => coverage.id === selectedDirectId);
  const selectedBidCoverages = allSelectableBidCoverages.filter((coverage) => selectedBidIds.includes(coverage.id));

  useEffect(() => {
    setSelectedDirectId(eligibility.eligible[0]?.id ?? "");
    setSelectedBidIds((current) => current.length ? current.filter((id) => allSelectableBidCoverages.some((coverage) => coverage.id === id)) : allSelectableBidCoverages.slice(0, 3).map((coverage) => coverage.id));
  }, [allSelectableBidCoverages, eligibility.eligible]);

  function toggleBidCoverage(id: string) {
    setSelectedBidIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function sendDirectAssignment() {
    if (!selectedDirectCoverage) {
      window.alert("Choose an eligible direct county vendor before sending the assignment.");
      return;
    }
    const draft = buildDirectAssignmentDraft(order, selectedDirectCoverage);
    const vendorFee = Number(fee) || financials.vendorFee;
    onAssignOrder(order.id, selectedDirectCoverage.displayName, `Secure assignment invitation sent from order detail. Vendor fee ${formatCurrency(vendorFee)}. Due ${formatDate(dueDate)}. ${instructions}`, vendorFee);
    onSuccess(`${draft.selectedVendorNames[0]} received the assignment invitation. The order is awaiting acceptance and no duplicate order was created.`);
  }

  function sendBidRequest() {
    if (!selectedBidCoverages.length) {
      window.alert("Choose at least one eligible vendor before sending a bid request.");
      return;
    }
    const draft = buildBidRequestDraft(order, selectedBidCoverages);
    if (draft.requiresCoverageConfirmation && !coverageConfirmation) {
      window.alert("Nearby county candidates must confirm coverage before the bid can be sent.");
      return;
    }
    setLocalBidDraft(draft);
    if (order.status === "New") onStatusChange(order.id, "Unassigned", "Bid request prepared from order detail.");
    else if (order.status === "Unassigned") onStatusChange(order.id, "Unassigned", "Bid request sent from order detail; order is in bidding.");
    onSuccess(`Bid request prepared for ${draft.recipientCount} recipient${draft.recipientCount === 1 ? "" : "s"} from this order. Nearby candidates are not contacted unless manually selected.`);
  }

  if (!canManage) {
    return (
      <div className="grid gap-4">
        {ownAppraiserOrder && order.status === "Assigned" && (
          <section className="panel p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UserCheck className="h-4 w-4 text-brand-600" /> Assignment Acceptance</div>
            <p className="mt-2 text-sm text-slate-600">Review the assignment package before accepting. Declines require a reason so the office can reassign quickly.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select className="control" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)}>
                <option value="">Decline reason required if declining</option>
                <option>Unable to meet due date</option>
                <option>Capacity/workload</option>
                <option>Conflict of interest</option>
                <option>Lack of competency</option>
                <option>Access/contact issue</option>
                <option>Other</option>
              </select>
              <button className="primary-button justify-center" onClick={() => onStatusChange(order.id, "Accepted", "Assignment accepted by appraiser.")}><CheckCircle2 className="h-4 w-4" /> Accept</button>
              <button
                className="secondary-button justify-center"
                onClick={() => {
                  if (!declineReason) {
                    window.alert("Choose a decline reason before declining this assignment.");
                    return;
                  }
                  onStatusChange(order.id, "Unassigned", `Assignment declined: ${declineReason}`);
                }}
              >
                <XCircle className="h-4 w-4" /> Decline
              </button>
            </div>
          </section>
        )}
        <BidderResponsePanel order={order} user={user} organization={organization} bids={bids} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UserCheck className="h-4 w-4 text-brand-600" /> Assignment Status</div>
            <p className="mt-1 text-sm text-slate-600">{getOrderAssignmentDisplayState(order, bids)} - {order.appraiser === "Unassigned" ? "No appraiser assigned yet." : `Currently assigned to ${order.appraiser}.`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SoftChip tone={bidState.isBidding || localBidDraft ? "warn" : "neutral"}>{localBidDraft ? "Bidding prepared" : bidState.isBidding ? "Bidding" : order.status}</SoftChip>
            {bidState.pendingAward && <SoftChip tone="warn">Award pending acceptance</SoftChip>}
          </div>
        </div>
      </section>

      {order.status === "Unassigned" || order.status === "New" ? (
        <section className="panel p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><MapPin className="h-4 w-4 text-brand-600" /> Find an Appraiser</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                CAS is using this order&apos;s property, county, product, due date, client, assignment terms, and documents. No duplicate order or manual re-entry is needed.
              </p>
            </div>
            <div className="flex rounded-md border border-line bg-slate-50 p-1">
              <button className={cn("rounded px-3 py-1.5 text-sm font-medium", method === "direct" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600")} onClick={() => setMethod("direct")}>Assign Directly</button>
              <button className={cn("rounded px-3 py-1.5 text-sm font-medium", method === "bid" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600")} onClick={() => setMethod("bid")}>Request Bids</button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-4">
              <div className="rounded-md border border-line bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SoftChip tone="good">{eligibility.eligible.length} eligible vendors</SoftChip>
                  <SoftChip>{eligibility.excluded.length} additional vendors excluded</SoftChip>
                  {!eligibility.directCoverageFound && <SoftChip tone="warn">No direct county coverage</SoftChip>}
                </div>
                {!eligibility.directCoverageFound && (
                  <p className="mt-2 text-sm text-amber-800">
                    No approved vendor currently covers {order.county} County. Nearby candidates are shown separately and are never contacted automatically.
                  </p>
                )}
              </div>

              {method === "direct" && (
                <div className="grid gap-3">
                  {eligibility.eligible.length ? eligibility.eligible.map((coverage) => (
                    <CoverageRow key={coverage.id} coverage={coverage} selected={selectedDirectId === coverage.id} onToggle={() => setSelectedDirectId(coverage.id)} />
                  )) : (
                    <div className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500">No directly eligible vendors are available. Use Request Bids to manually ask nearby compliant candidates for coverage confirmation.</div>
                  )}
                </div>
              )}

              {method === "bid" && (
                <div className="grid gap-3">
                  {allSelectableBidCoverages.map((coverage) => (
                    <CoverageRow key={coverage.id} coverage={coverage} selected={selectedBidIds.includes(coverage.id)} onToggle={() => toggleBidCoverage(coverage.id)} />
                  ))}
                  {!eligibility.directCoverageFound && eligibility.nearby.length > 0 && (
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Coverage confirmation required for nearby candidates
                      <select className="control" value={coverageConfirmation} onChange={(event) => setCoverageConfirmation(event.target.value)}>
                        <option value="">Choose confirmation requirement</option>
                        <option>Yes, I cover this county</option>
                        <option>Yes, for this assignment only</option>
                        <option>Yes, with an additional travel fee</option>
                        <option>No, outside my coverage area</option>
                      </select>
                    </label>
                  )}
                </div>
              )}

              <details className="rounded-md border border-line bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">Excluded vendors ({eligibility.excluded.length})</summary>
                <div className="mt-3 grid gap-3">
                  {eligibility.excluded.map((coverage) => <CoverageRow key={coverage.id} coverage={coverage} disabled />)}
                </div>
              </details>
            </div>

            <aside className="rounded-md border border-line bg-white p-4">
              <div className="text-sm font-semibold text-slate-950">Confirm Terms</div>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Vendor fee
                  <input className="control" value={fee} inputMode="decimal" onChange={(event) => setFee(event.target.value)} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Requested due date
                  <input className="control" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </label>
                {method === "bid" && (
                  <label className="grid gap-1 text-xs font-medium text-slate-600">
                    Bid deadline
                    <input className="control" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
                  </label>
                )}
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Vendor-visible instructions
                  <textarea className="control min-h-28 py-3" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
                </label>
                <div className="rounded-md border border-line bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Review before sending: {order.fileNumber}, {order.address}, {order.county} County, {order.productType}, due {formatDate(dueDate)}, vendor fee {formatCurrency(Number(fee) || financials.vendorFee)}.
                </div>
                <button className="primary-button justify-center" onClick={method === "direct" ? sendDirectAssignment : sendBidRequest}>
                  <Send className="h-4 w-4" />
                  {method === "direct" ? "Send Assignment Invitation" : "Send Bid Request"}
                </button>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {(bidState.requests.length > 0 || localBidDraft) && (
        <BidComparisonTable order={order} user={user} organization={organization} bids={bids} onAssignOrder={onAssignOrder} onSuccess={onSuccess} />
      )}
    </div>
  );
}

function CustomerOrderTracker({
  order,
  user,
  organization,
  statusConfigs,
  onBack,
  managedDocuments,
  orderMessages,
  revisionRequests,
  deliveryRecords
}: Pick<OrderDetailPageProps, "order" | "user" | "organization" | "statusConfigs" | "onBack" | "managedDocuments" | "orderMessages" | "revisionRequests" | "deliveryRecords">) {
  const currentStage = getClientTrackingStage(order, statusConfigs, organization);
  const currentIndex = clientTrackingStages.indexOf(currentStage);
  const authorizedFees = getAuthorizedOrderFees(order, user, organization);
  const visibleDocuments = managedDocuments.filter((document) =>
    document.orderId === order.id &&
    ["Lender/client", "Delivery recipient", "Public requester"].includes(document.visibility) &&
    document.status !== "Archived"
  );
  const visibleMessages = orderMessages.filter((message) =>
    message.orderId === order.id &&
    (message.visibility === "Lender/client" || message.channel === "Lender/client message")
  );
  const clientVisibleRevisions = revisionRequests.filter((revision) => revision.orderId === order.id && revision.clientVisibleWording);
  const completedDelivery = deliveryRecords.find((record) => record.orderId === order.id && ["Delivered", "Viewed"].includes(record.status));

  return (
    <div className="grid gap-5">
      <section className="panel overflow-hidden">
        <div className="border-b border-line bg-white p-5">
          <button className="secondary-button h-9 px-3" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back to orders</button>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-950">{order.fileNumber}</span>
                <SoftChip tone="brand">{currentStage}</SoftChip>
                <PriorityChip priority={order.priority} />
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{order.address}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {order.productType} for {order.borrower}. CAS will show the next clear client action here as the report moves forward.
              </p>
            </div>
            <aside className="rounded-md border border-line bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-normal text-brand-700">Current client status</div>
              <div className="mt-2 text-xl font-semibold text-slate-950">{currentStage}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{statusDefinitions[order.status].clientLabel}</p>
              <div className="mt-3 rounded-md border border-line bg-white p-3 text-sm text-slate-700">{order.nextAction}</div>
            </aside>
          </div>
        </div>
        <div className="grid gap-3 bg-slate-50 p-4 lg:grid-cols-3">
          <SummaryItem label="Due" value={formatDate(order.dueDate)} />
          <SummaryItem label="Inspection" value={order.inspection?.scheduledDate ? formatDate(order.inspection.scheduledDate) : order.inspectionDate ? formatDate(order.inspectionDate) : "Not scheduled"} />
          <SummaryItem label={authorizedFees[0]?.label ?? "Invoice"} value={authorizedFees[0] ? formatCurrency(authorizedFees[0].amount) : "Not available"} />
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Clock3 className="h-4 w-4 text-brand-600" /> Order Progress</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {clientTrackingStages.map((stage, index) => {
            const complete = index < currentIndex;
            const current = index === currentIndex;
            return (
              <div key={stage} className={cn("rounded-md border p-3 text-sm", complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : current ? "border-brand-200 bg-brand-50 text-brand-700" : "border-line bg-white text-slate-500")}>
                <div className="flex items-center gap-2">
                  {complete ? <CheckCircle2 className="h-4 w-4" /> : <span className={cn("h-2.5 w-2.5 rounded-full", current ? "bg-brand-600" : "bg-slate-300")} />}
                  <span className="font-medium">{stage}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="panel p-5">
          <DetailSection icon={MapPin} title="Order Details">
            <div className="grid gap-2 text-sm">
              <InfoRow label="Property" value={`${order.address}, ${order.city}, ${order.state} ${order.zip}`} />
              <InfoRow label="Borrower" value={order.borrower} />
              <InfoRow label="Product" value={order.productType} />
              <InfoRow label="Client contact" value={order.lenderContact} />
              <InfoRow label="Access" value={order.inspection?.scheduledDate ? `Inspection scheduled for ${formatDate(order.inspection.scheduledDate)}` : "The inspection has not been scheduled yet."} />
            </div>
          </DetailSection>
        </section>
        <aside className="grid gap-5">
          <section className="panel p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><FileCheck2 className="h-4 w-4 text-brand-600" /> Client Documents</div>
            <div className="mt-3">
              <ListOrEmpty empty="No client-visible documents are available yet." items={visibleDocuments.map((document) => `${document.displayName} - ${document.status}`)} />
            </div>
            {completedDelivery && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Completed report delivery: {completedDelivery.status}</div>}
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><MessageSquare className="h-4 w-4 text-brand-600" /> Client Updates</div>
            <div className="mt-3 grid gap-2">
              <ListOrEmpty
                empty="No client-visible comments yet."
                items={[
                  ...order.clientComments.map((comment) => `${comment.createdAt} - ${comment.body}`),
                  ...visibleMessages.map((message) => `${message.createdAt} - ${message.body}`),
                  ...clientVisibleRevisions.map((revision) => `${formatDate(revision.receivedAt)} - ${revision.clientVisibleWording}`)
                ]}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function OrderDetailPage({
  order,
  user,
  organization,
  statusConfigs,
  onBack,
  onAssignOrder,
  onStatusChange,
  onUpdateInspection,
  onAddNote,
  onGenerateInvoice,
  managedDocuments,
  requiredDocumentRules,
  orderMessages,
  revisionRequests,
  reportVersions,
  reportReviewResults,
  deliveryRecords,
  realUploadsEnabled,
  onUploadDocument,
  onArchiveDocument,
  onRestoreDocument,
  onReplaceDocumentVersion,
  onOpenSignedUrl,
  onSubmitReport,
  onDeliverReport,
  onSendMessage,
  onToggleMessagePinned,
  onToggleMessageRead,
  onUpdateRevisionStatus,
  onRespondToRevisionItem,
  onRunReportReview,
  onUploadCorrectedReport,
  onRespondToReportFinding,
  onUpdateReportFindingStatus,
  onReleaseReportFindingToClient,
  onMarkReportReadyForDelivery,
  bids,
  connected,
  vendorCoverage
}: OrderDetailPageProps) {
  const [successMessage, setSuccessMessage] = useState("");
  const sections = useMemo(() => getOrderDetailSections(order, user, organization), [order, organization, user]);
  const [activeSection, setActiveSection] = useState<OrderDetailSectionId>(sections[0] ?? "overview");
  const relationships = useMemo(() => buildOrderRelationshipSummary({ order, user, organization, connected }), [connected, order, organization, user]);
  const primaryAction = getPrimaryOrderAction(order, user, organization, bids);
  const alert = getOrderDetailAlert(order, user, bids);
  const historyItems = buildPlainOrderHistory(order, user, relationships);
  const reviewComplete = order.reviewItems.filter((item) => item.complete).length;
  const authorizedFees = getAuthorizedOrderFees(order, user, organization);
  const financials = getOrderFinancials(order);
  const canSeeInternalAccounting = authorizedFees.some((fee) => fee.key === "clientFee" || fee.key === "margin");

  useEffect(() => {
    if (!sections.includes(activeSection)) setActiveSection(sections[0] ?? "overview");
  }, [activeSection, sections]);

  function runPrimaryAction() {
    if (primaryAction.label === "Generate Invoice") {
      onGenerateInvoice(order.id);
      setActiveSection("accounting");
      setSuccessMessage("Draft invoice generated from this order.");
      return;
    }
    if (primaryAction.status) {
      onStatusChange(order.id, primaryAction.status, primaryAction.description);
      setSuccessMessage(`${primaryAction.label} recorded for ${order.fileNumber}.`);
      return;
    }
    setActiveSection(primaryAction.targetSection);
  }

  if (canUseCustomerTrackingView(user, organization)) {
    return (
      <CustomerOrderTracker
        order={order}
        user={user}
        organization={organization}
        statusConfigs={statusConfigs}
        onBack={onBack}
        managedDocuments={managedDocuments}
        orderMessages={orderMessages}
        revisionRequests={revisionRequests}
        deliveryRecords={deliveryRecords}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className="panel overflow-hidden">
        <div className="border-b border-line bg-white p-5">
          <button className="secondary-button h-9 px-3" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back to orders</button>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-950">{order.fileNumber}</span>
                <StatusLabelChip order={order} user={user} organization={organization} statusConfigs={statusConfigs} />
                <PriorityChip priority={order.priority} />
                <SoftChip tone="brand">{order.productType}</SoftChip>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{order.address}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {order.borrower} - {order.city}, {order.state} {order.zip} - {order.county} County
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <DueChip date={order.dueDate} />
                <SoftChip>{getOrderAssignmentDisplayState(order, bids)}</SoftChip>
                <SoftChip>{order.appraiser === "Unassigned" ? "No appraiser assigned" : `Assigned to ${order.appraiser}`}</SoftChip>
              </div>
            </div>
            <aside className="rounded-md border border-line bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-normal text-brand-700">Most important next step</div>
              <div className="mt-2 text-xl font-semibold text-slate-950">{primaryAction.label}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{primaryAction.description}</p>
              <div className="mt-3 rounded-md border border-line bg-white p-3 text-sm text-slate-700">{alert}</div>
              <button className="primary-button mt-4 w-full justify-center" onClick={runPrimaryAction}>{primaryAction.label}</button>
            </aside>
          </div>
        </div>

        {successMessage && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto bg-slate-50 px-4 py-2">
          {sections.map((section) => (
            <button
              key={section}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
                activeSection === section ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
              onClick={() => setActiveSection(section)}
            >
              {orderDetailSectionLabels[section]}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "overview" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="grid gap-5">
            <RelationshipSummary order={order} user={user} organization={organization} connected={connected} />
            <section className="panel p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile label="Current stage" value={getOrganizationStatusLabel(order, statusConfigs, organization, user)} />
                <MetricTile label="Next action" value={primaryAction.label} />
                <MetricTile label="Assignment" value={order.appraiser === "Unassigned" ? "Needs appraiser" : order.appraiser} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <DetailSection icon={MapPin} title="Property">
                  <div className="grid gap-2 text-sm">
                    <InfoRow label="Subject" value={`${order.address}, ${order.city}, ${order.state} ${order.zip}`} />
                    <InfoRow label="County / parcel" value={`${order.county} / ${order.parcelNumber}`} />
                    <InfoRow label="Property type" value={order.propertyType} />
                    <InfoRow label="Occupancy" value={order.occupancy} />
                  </div>
                </DetailSection>
                <DetailSection icon={ClipboardCheck} title="Order">
                  <div className="grid gap-2 text-sm">
                    <InfoRow label="Client" value={order.client} />
                    <InfoRow label="Borrower" value={order.borrower} />
                    <InfoRow label="Loan type" value={order.loanType} />
                    <InfoRow label="Preference" value={order.assignmentPreference} />
                  </div>
                </DetailSection>
              </div>
            </section>
          </div>
          <aside className="grid gap-5">
            <RequiredDocumentSummary order={order} documents={managedDocuments} rules={requiredDocumentRules} />
            <RevisionSummary order={order} revisions={revisionRequests} />
            <ReportMetadataSection order={order} />
          </aside>
        </div>
      )}

      {activeSection === "assignment" && (
        <AssignmentWorkspace
          order={order}
          user={user}
          organization={organization}
          bids={bids}
          vendorCoverage={vendorCoverage}
          onAssignOrder={onAssignOrder}
          onStatusChange={onStatusChange}
          onSuccess={setSuccessMessage}
        />
      )}

      {activeSection === "schedule" && (
        <section className="panel p-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <InspectionPanel order={order} user={user} onUpdateInspection={onUpdateInspection} />
            <aside className="rounded-md border border-line bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><CalendarClock className="h-4 w-4 text-brand-600" /> Schedule Snapshot</div>
              <div className="mt-3 grid gap-2">
                <MetricTile label="Due date" value={formatDate(order.dueDate)} />
                <MetricTile label="Inspection" value={order.inspection?.scheduledDate ? formatDate(order.inspection.scheduledDate) : order.inspectionDate ? formatDate(order.inspectionDate) : "Not scheduled"} />
                <MetricTile label="Calendar" value={order.inspection?.calendarSyncStatus ?? "Not synced"} />
              </div>
              {user.role !== "client_user" && <p className="mt-3 text-sm leading-6 text-slate-600">{order.accessInfo}</p>}
            </aside>
          </div>
        </section>
      )}

      {activeSection === "documents" && (
        <section className="panel p-5">
          <OrderDocumentWorkspace
            order={order}
            user={user}
            documents={managedDocuments}
            requiredRules={requiredDocumentRules}
            deliveryRecords={deliveryRecords}
            realUploadsEnabled={realUploadsEnabled}
            onUploadDocument={onUploadDocument}
            onArchiveDocument={onArchiveDocument}
            onRestoreDocument={onRestoreDocument}
            onReplaceDocumentVersion={onReplaceDocumentVersion}
            onOpenSignedUrl={onOpenSignedUrl}
            onSubmitReport={onSubmitReport}
            onDeliverReport={onDeliverReport}
          />
        </section>
      )}

      {activeSection === "messages" && (
        <section className="panel p-5">
          <OrderConversationPanel
            order={order}
            user={user}
            messages={orderMessages}
            onSendMessage={onSendMessage}
            onTogglePinned={onToggleMessagePinned}
            onToggleRead={onToggleMessageRead}
          />
        </section>
      )}

      {activeSection === "review" && (
        <div className="grid gap-5">
          <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
            <section className="panel p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><FileCheck2 className="h-4 w-4 text-brand-600" /> Review State</div>
              <div className="mt-4 grid gap-3">
                <MetricTile label="Checklist" value={`${reviewComplete}/${Math.max(order.reviewItems.length, 1)} complete`} />
                <MetricTile label="Reviewer" value={order.reviewer} />
                <MetricTile label="Status" value={statusDefinitions[order.status].stage} />
              </div>
              <button className="secondary-button mt-4 w-full justify-center" onClick={() => onAddNote(order.id)}><MessageSquare className="h-4 w-4" /> Add review note</button>
            </section>
            <section className="panel p-5">
              <RevisionWorkflowPanel
                order={order}
                revisions={revisionRequests}
                documents={managedDocuments}
                onUpdateRevisionStatus={onUpdateRevisionStatus}
                onRespondToRevisionItem={onRespondToRevisionItem}
              />
            </section>
          </div>
          <section className="panel p-5">
            <ReportReviewPanel
              order={order}
              user={user}
              organization={organization}
              versions={reportVersions}
              results={reportReviewResults}
              realUploadsEnabled={realUploadsEnabled}
              onRunReview={onRunReportReview}
              onUploadCorrectedReport={onUploadCorrectedReport}
              onRespondToFinding={onRespondToReportFinding}
              onUpdateFindingStatus={onUpdateReportFindingStatus}
              onReleaseFindingToClient={onReleaseReportFindingToClient}
              onMarkReadyForDelivery={onMarkReportReadyForDelivery}
            />
          </section>
        </div>
      )}

      {activeSection === "delivery" && (
        <section className="panel p-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <DetailSection icon={UploadCloud} title="Delivery Package">
              <div className="grid gap-3">
                <ListOrEmpty
                  empty="No delivery records yet."
                  items={deliveryRecords.filter((record) => record.orderId === order.id).map((record) => `${record.deliveredAt} - ${record.recipientName}: ${record.status}`)}
                />
                <div className="flex flex-wrap gap-2">
                  <button className="secondary-button" onClick={() => onSubmitReport(order.id)}><UploadCloud className="h-4 w-4" /> Submit report</button>
                  <button className="primary-button" onClick={() => onDeliverReport(order.id)}><Send className="h-4 w-4" /> Deliver report</button>
                  <button className="secondary-button" onClick={() => onStatusChange(order.id, "Completed", "Order administratively completed from delivery tab.")}><CheckCircle2 className="h-4 w-4" /> Complete order</button>
                </div>
              </div>
            </DetailSection>
            <aside className="rounded-md border border-line bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">Delivery Recipients</div>
              <div className="mt-3 grid gap-2">
                {relationships.filter((item) => item.label === "Delivery recipient" || item.label === "Ordered by").map((item) => <MetricTile key={item.label} label={item.label} value={item.value} />)}
              </div>
            </aside>
          </div>
        </section>
      )}

      {activeSection === "accounting" && canViewOrderAccounting(order, user) && (
        <section className="panel p-5">
          <DetailSection icon={ReceiptText} title="Fee and Accounting Snapshot">
            <div className="grid gap-2 sm:grid-cols-4">
              {authorizedFees.map((fee) => <MetricTile key={fee.key} label={fee.label} value={formatCurrency(fee.amount)} />)}
              {canSeeInternalAccounting && <MetricTile label="Tech fee" value={formatCurrency(financials.techFee)} />}
              {canSeeInternalAccounting && <MetricTile label="Split" value={`${order.commissionSplitOverride ?? order.payrollSnapshot?.defaultAppraiserSplit ?? 0}%`} />}
            </div>
            {canSeeInternalAccounting ? (
              <div className="mt-3 grid gap-2 text-sm">
                <InfoRow label="Commissionable base" value={formatCurrency(financials.commissionableBase)} />
                <InfoRow label="Calculation source" value={order.payrollSnapshot?.calculationSource ?? "Accounting workspace calculation pending"} />
                <InfoRow label="Approved" value={order.payrollSnapshot?.approvedBy ? `${order.payrollSnapshot.approvedBy} on ${formatDate(order.payrollSnapshot.approvedDate ?? order.paidAt ?? order.dueDate)}` : "Not approved"} />
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">Only fee fields permitted for your role are shown here.</div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="secondary-button" onClick={() => onGenerateInvoice(order.id)}><ReceiptText className="h-4 w-4" /> Generate invoice</button>
              <button className="secondary-button"><CreditCard className="h-4 w-4" /> Mark payout reviewed</button>
            </div>
          </DetailSection>
        </section>
      )}

      {activeSection === "history" && (
        <section className="panel p-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <DetailSection icon={History} title="Plain-Language History">
              <ListOrEmpty empty="No order history yet." items={historyItems} />
            </DetailSection>
            <aside className="rounded-md border border-line bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><RotateCcw className="h-4 w-4 text-brand-600" /> Assignment Attempts</div>
              <div className="mt-3">
                <ListOrEmpty
                  empty="No assignment attempts yet."
                  items={order.assignmentHistory.map((item) => `${item.at} - ${item.action} ${item.appraiser}: ${item.note}`)}
                />
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
