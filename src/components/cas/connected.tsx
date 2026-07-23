import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, ClipboardCheck, Clock3, FileText, Gavel, Inbox, LockKeyhole, Mail, MapPin, ShieldCheck, Sparkles, UserRoundCheck, XCircle } from "lucide-react";
import {
  bidAwards,
  bidEmailPreview,
  bidRecipients,
  bidRequests,
  bidResponses,
  connectedInvitations,
  connectedOrderSummaries,
  connectedParticipants,
  connectedUpgradeHistory,
  organizationSubscriptions,
  subscriptionPlans,
  vendorCountyCoverage
} from "@/data/connected";
import { evaluateBidEligibility } from "@/lib/connected/eligibility";
import type { BidRecipient, BidResponse, ConnectedOrderSummary, Organization, PortalUser, VendorCountyCoverage } from "@/types/domain";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { MetricTile, SectionHeader } from "./shared";

function toneForStatus(status: string) {
  if (["active", "accepted", "responded", "eligible", "sent", "delivered"].includes(status.toLowerCase())) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["pending", "pending_acceptance", "invited", "viewed", "nearby", "busy"].includes(status.toLowerCase())) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["declined", "excluded", "failed", "expired", "revoked", "overloaded"].includes(status.toLowerCase())) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SoftChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-rose-200 bg-rose-50 text-rose-700",
    brand: "border-brand-100 bg-brand-50 text-brand-700"
  };
  return <span className={cn("chip", tones[tone])}>{children}</span>;
}

function ConnectedHero({ user, organization, onOpenIncoming, onOpenBids, onPlaceOrder }: { user: PortalUser; organization: Organization; onOpenIncoming: () => void; onOpenBids: () => void; onPlaceOrder: () => void }) {
  const subscription = organizationSubscriptions.find((candidate) => candidate.organizationId === organization.id) ?? organizationSubscriptions[0]!;
  const connectedOnly = subscription.planKey === "connected_free";
  const headline = connectedOnly ? "Shared work access" : "Full operating access";

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700">
            <Sparkles className="h-4 w-4" />
            Network
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Organizations you work with.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {organization.name} is running with {subscription.planName}. {headline} lets clients, vendors, appraisers, and reviewers work together while each person sees only the work they are invited to handle.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="primary-button" onClick={onOpenIncoming}><Inbox className="h-4 w-4" /> Incoming work</button>
            <button className="secondary-button" onClick={onOpenBids}><Gavel className="h-4 w-4" /> Bid requests</button>
            <button className="secondary-button" onClick={onPlaceOrder}><ArrowRight className="h-4 w-4" /> Place Order</button>
          </div>
        </div>
        <div className="rounded-md border border-line bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-950">{user.name}</div>
          <div className="mt-1 text-xs text-slate-500">{user.email}</div>
          <div className="mt-3 grid gap-2">
            <MetricTile label="User" value={user.title ?? user.role} />
            <MetricTile label="Organization" value={organization.type.replace("_", " ")} />
            <MetricTile label="Plan" value={subscription.planName} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SubscriptionPanel({ organization }: { organization: Organization }) {
  const subscription = organizationSubscriptions.find((candidate) => candidate.organizationId === organization.id) ?? organizationSubscriptions[0]!;
  const plan = subscriptionPlans.find((candidate) => candidate.key === subscription.planKey) ?? subscriptionPlans[0]!;
  const workspaceEntitlements = plan.entitlements.filter((entitlement) => !entitlement.startsWith("connected_"));
  const connectedEntitlements = plan.entitlements.filter((entitlement) => entitlement.startsWith("connected_"));

  return (
    <section className="panel p-5">
      <SectionHeader icon={BadgeCheck} title="Plan Access" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricTile label="Account" value="User profile" />
        <MetricTile label="Role" value={organization.type.replace("_", " ")} />
        <MetricTile label="Access" value={plan.audience === "connected" ? "Invited work" : "Full workspace"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UserRoundCheck className="h-4 w-4 text-brand-600" /> Shared work</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(connectedEntitlements.length ? connectedEntitlements : subscriptionPlans[0].entitlements).map((entitlement) => <SoftChip key={entitlement} tone="brand">{entitlement.replace("connected_", "").replaceAll("_", " ")}</SoftChip>)}
          </div>
        </div>
        <div className="rounded-md border border-line p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Building2 className="h-4 w-4 text-brand-600" /> Workspace tools</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workspaceEntitlements.length ? workspaceEntitlements.slice(0, 10).map((entitlement) => <SoftChip key={entitlement}>{entitlement.replaceAll("_", " ")}</SoftChip>) : <span className="text-sm text-slate-500">No paid workspace tools are required for invited shared work.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConnectedOrderCard({ order }: { order: ConnectedOrderSummary }) {
  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{order.fileNumber}</h3>
            <SoftChip tone="brand">{order.simplifiedStatus}</SoftChip>
          </div>
          <p className="mt-1 text-sm text-slate-600">{order.propertyAddress}, {order.city}, {order.state}</p>
          <p className="mt-1 text-xs text-slate-500">{order.borrowerName} - {order.productType} - {order.county} County</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Due {order.dueAt ? formatDate(order.dueAt) : "pending"}</div>
          <div className="mt-1">{order.assignedSummary}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MetricTile label="Next action" value={order.nextAction} />
        <MetricTile label="Documents" value={`${order.documentsShared} shared`} />
        <MetricTile label="Messages" value={`${order.messagesOpen} open`} />
      </div>
    </article>
  );
}

function ConnectedPortalPreview({ user }: { user: PortalUser }) {
  const isClient = user.role === "client_user";
  const title = isClient ? "Client Order Status" : "Shared Assignment View";
  const visibleOrders = isClient
    ? connectedOrderSummaries.filter((order) => order.visibleTo.includes("ordering_client"))
    : connectedOrderSummaries.filter((order) => order.visibleTo.includes("assigned_appraiser") || order.visibleTo.includes("appraisal_company"));

  return (
    <section className="panel p-5">
      <SectionHeader icon={isClient ? FileText : ClipboardCheck} title={title} />
      <div className="mt-4 grid gap-3">
        {visibleOrders.map((order) => <ConnectedOrderCard key={order.orderId} order={order} />)}
      </div>
      <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">
        {isClient
          ? "Clients see status, due dates when permitted, messages, requested documents, final reports, and invoice-ready information. Payroll, commissions, internal notes, and QC findings stay hidden."
          : "Shared appraisers can accept assignments, schedule inspections, download permitted documents, upload deliverables, and respond to revisions."}
      </div>
    </section>
  );
}

export function ConnectedOverviewView({ user, organization, onOpenIncoming, onOpenBids, onPlaceOrder }: { user: PortalUser; organization: Organization; onOpenIncoming: () => void; onOpenBids: () => void; onPlaceOrder: () => void }) {
  return (
    <div className="grid gap-5">
      <ConnectedHero user={user} organization={organization} onOpenIncoming={onOpenIncoming} onOpenBids={onOpenBids} onPlaceOrder={onPlaceOrder} />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          <SubscriptionPanel organization={organization} />
          <ConnectedPortalPreview user={user} />
        </div>
        <div className="grid gap-5">
          <section className="panel p-5">
            <SectionHeader icon={LockKeyhole} title="Shared Work Stays Private" />
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              {["Clients do not see payroll or commission", "Documents stay limited to the right people", "Bidders do not see other bidders", "Shared work stays attached after plan changes"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md border border-line px-3 py-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{item}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function IncomingOrdersView({ user, organization, onOpenBids, onOpenOrders }: { user: PortalUser; organization: Organization; onOpenBids: () => void; onOpenOrders: () => void }) {
  const incomingOrders = connectedOrderSummaries.filter((order) => order.visibleTo.includes("appraisal_company") || order.visibleTo.includes("assigned_appraiser"));
  const pendingParticipants = connectedParticipants.filter((participant) => participant.accessStatus === "pending_acceptance");
  const bidInvites = connectedInvitations.filter((invite) => invite.invitationType === "bid");
  const upgrade = connectedUpgradeHistory[0]!;

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="panel p-5">
        <SectionHeader icon={Inbox} title="Incoming Assignments" />
        <div className="mt-4 grid gap-3">
          {incomingOrders.map((order) => (
            <article key={order.orderId} className="rounded-md border border-line p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{order.fileNumber}</h3>
                    <SoftChip tone="warn">{order.simplifiedStatus}</SoftChip>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{order.propertyAddress}, {order.city} - {order.productType}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="primary-button"><CheckCircle2 className="h-4 w-4" /> Accept</button>
                  <button className="secondary-button"><XCircle className="h-4 w-4" /> Decline</button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MetricTile label="County" value={order.county} />
                <MetricTile label="Due" value={order.dueAt ? formatDate(order.dueAt) : "Pending"} />
                <MetricTile label="Documents" value={`${order.documentsShared} available`} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <aside className="grid gap-5">
        <section className="panel p-5">
          <SectionHeader icon={Clock3} title="Pending Acceptance" />
          <div className="mt-4 grid gap-2">
            {pendingParticipants.map((participant) => <div key={participant.id} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{participant.participantName} - {participant.role.replaceAll("_", " ")}</div>)}
          </div>
        </section>
        <section className="panel p-5">
          <SectionHeader icon={Gavel} title="Bid Requests" action="Open bids" onAction={onOpenBids} />
          <div className="mt-4 space-y-2">
            {bidInvites.map((invite) => <div key={invite.id} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">{invite.invitedEmail} - expires {formatDate(invite.expiresAt)}</div>)}
          </div>
        </section>
        <section className="panel p-5">
          <SectionHeader icon={Building2} title="Account History" action="Active orders" onAction={onOpenOrders} />
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {upgrade.preservedOrderCount} assignments, {upgrade.preservedDocumentCount} documents, and {upgrade.preservedMessageCount} messages stayed with this account after plan changes.
          </p>
          <div className="mt-3 text-xs text-slate-500">{organization.name} - {user.name}</div>
        </section>
      </aside>
    </section>
  );
}

function EligibilityRow({ coverage, selected, onToggle }: { coverage: VendorCountyCoverage; selected?: boolean; onToggle?: () => void }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-950">{coverage.displayName}</h4>
            <span className={cn("chip", toneForStatus(coverage.eligibilityStatus))}>{coverage.eligibilityStatus}</span>
            <SoftChip tone={coverage.coverageType === "direct" ? "good" : "warn"}>{coverage.county} County</SoftChip>
          </div>
          <p className="mt-1 text-sm text-slate-600">{coverage.reason}</p>
        </div>
        {onToggle && (
          <button className={selected ? "primary-button h-9" : "secondary-button h-9"} onClick={onToggle}>
            {selected ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {selected ? "Selected" : "Select"}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <MetricTile label="License" value={coverage.licenseStatus} />
        <MetricTile label="E&O" value={coverage.eoStatus} />
        <MetricTile label="W-9" value={coverage.w9Status} />
        <MetricTile label="Capacity" value={coverage.capacityStatus} />
      </div>
      {coverage.exclusionReasons.length > 0 && <div className="mt-3 text-xs text-rose-700">{coverage.exclusionReasons.join(" - ")}</div>}
    </div>
  );
}

function ResponseRow({ recipient, response }: { recipient: BidRecipient; response?: BidResponse }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3 font-medium text-slate-900">{recipient.recipientName}</td>
      <td className="px-4 py-3"><span className={cn("chip", toneForStatus(recipient.coverageMatch))}>{recipient.coverageMatch}</span></td>
      <td className="px-4 py-3">{response?.proposedFee ? formatCurrency(response.proposedFee) : "-"}</td>
      <td className="px-4 py-3">{response?.turnTimeDays ? `${response.turnTimeDays}d` : "-"}</td>
      <td className="px-4 py-3">{response?.responseStatus ?? recipient.invitationStatus}</td>
      <td className="px-4 py-3 text-slate-500">{response?.declineReason ?? response?.inspectionAvailability ?? "Awaiting details"}</td>
    </tr>
  );
}

export function BidManagementView({ user, organization }: { user: PortalUser; organization: Organization }) {
  const [county, setCounty] = useState("Cobb");
  const [productType, setProductType] = useState("1004 URAR");
  const [selectedIds, setSelectedIds] = useState(() => new Set(["cov-northmetro-cobb", "cov-talia-cobb"]));
  const activeBid = bidRequests[0]!;
  const responsesByRecipient = new Map(bidResponses.map((response) => [response.recipientId, response]));
  const award = bidAwards[0]!;
  const eligibility = useMemo(() => evaluateBidEligibility(vendorCountyCoverage, {
    state: "GA",
    county,
    productType,
    requiredSpecialties: productType === "1004 URAR" ? ["Conventional"] : [],
    capacityRulesEnabled: true,
    nearbyCounties: county === "Pickens" ? ["Cherokee"] : ["Fulton", "Cherokee", "Douglas"]
  }), [county, productType]);

  function toggleCoverage(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="grid gap-5">
      <div className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-brand-700"><Gavel className="h-4 w-4" /> Bid Requests</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Choose the right appraiser for the county.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {organization.name} can ask eligible vendors for availability and compare responses without exposing other bidders.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="control" value={county} onChange={(event) => setCounty(event.target.value)}>
              <option>Cobb</option>
              <option>Pickens</option>
              <option>Fulton</option>
            </select>
            <select className="control" value={productType} onChange={(event) => setProductType(event.target.value)}>
              <option>1004 URAR</option>
              <option>FHA 1004</option>
              <option>VA 1004</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <aside className="grid gap-5">
          <section className="panel p-5">
            <SectionHeader icon={MapPin} title="Bid Setup" />
            <div className="mt-4 grid gap-2">
              <MetricTile label="Order" value={activeBid.subjectAddress} />
              <MetricTile label="County" value={`${county}, GA`} />
              <MetricTile label="Product" value={productType} />
              <MetricTile label="Deadline" value={formatDate(activeBid.bidDeadlineAt)} />
            </div>
          </section>
          <section className="panel p-5">
            <SectionHeader icon={Mail} title="Email Privacy" />
            <p className="mt-3 text-sm leading-6 text-slate-600">{bidEmailPreview.body}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{bidEmailPreview.fields.map((field) => <SoftChip key={field} tone="brand">{field}</SoftChip>)}</div>
            <div className="mt-3 text-xs text-slate-500">Omitted: {bidEmailPreview.omitted.join(", ")}</div>
          </section>
        </aside>

        <div className="grid gap-5">
          <section className="panel p-5">
            <SectionHeader icon={ShieldCheck} title="Eligible Vendors" />
            <div className="mt-4 grid gap-3">
              {eligibility.eligible.map((coverage) => (
                <EligibilityRow key={coverage.id} coverage={coverage} selected={selectedIds.has(coverage.id)} onToggle={() => toggleCoverage(coverage.id)} />
              ))}
              {!eligibility.directCoverageFound && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  No approved vendor currently covers this county. Nearby candidates are suggestions only and will not be emailed automatically.
                </div>
              )}
              {!eligibility.directCoverageFound && eligibility.nearby.map((coverage) => (
                <EligibilityRow key={coverage.id} coverage={coverage} selected={selectedIds.has(coverage.id)} onToggle={() => toggleCoverage(coverage.id)} />
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <SectionHeader icon={XCircle} title="Excluded Vendors" />
            <div className="mt-4 grid gap-3">
              {eligibility.excluded.slice(0, 3).map((coverage) => <EligibilityRow key={coverage.id} coverage={coverage} />)}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="p-5">
              <SectionHeader icon={ClipboardCheck} title="Bid Comparison" />
              <p className="mt-2 text-sm text-slate-600">Lowest fee is not auto-awarded. Compliance, coverage, turn time, workload, notes, and lender preference stay visible for the sender only.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-y border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                  <tr><th className="px-4 py-3">Bidder</th><th className="px-4 py-3">Coverage</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3">Turn</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th></tr>
                </thead>
                <tbody>
                  {bidRecipients.map((recipient) => <ResponseRow key={recipient.id} recipient={recipient} response={responsesByRecipient.get(recipient.id)} />)}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel p-5">
            <SectionHeader icon={CheckCircle2} title="Award Workflow" />
            <div className="mt-4 rounded-md border border-line p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-semibold text-slate-950">{award.winnerName}</div>
                  <p className="mt-1 text-sm text-slate-600">Winning response becomes the assignment for this order.</p>
                </div>
                <span className={cn("chip", toneForStatus(award.status))}>{award.status.replace("_", " ")}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Signed-in as {user.name}. Non-winners receive a professional not-selected notice without the winning fee or bidder identity.
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
