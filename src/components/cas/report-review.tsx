import { AlertTriangle, BotOff, CheckCircle2, Eye, FileSearch, GitCompare, MessageSquare, RotateCcw, UploadCloud } from "lucide-react";
import type { AppraisalReportVersion, ReportReviewResult, ReviewFinding, ReviewFindingStatus, ReviewSeverity } from "@/types/report-review";
import type { Order, Organization, PortalUser } from "@/types/domain";
import { canReleaseFindingToClient, canRespondToFinding, canReviewerManageFinding, getVisibleReviewFindings } from "@/lib/report-review/permissions";
import { cn } from "@/lib/utils";
import { MetricTile, SectionHeader } from "./shared";

type ReportReviewPanelProps = {
  order: Order;
  user: PortalUser;
  organization: Organization;
  versions: AppraisalReportVersion[];
  results: ReportReviewResult[];
  onRunReview: (orderId: string) => void;
  onUploadCorrectedReport: (orderId: string) => void;
  onRespondToFinding: (findingId: string, response: string) => void;
  onUpdateFindingStatus: (findingId: string, status: ReviewFindingStatus, severity?: ReviewSeverity) => void;
  onReleaseFindingToClient: (findingId: string) => void;
};

const severityTone: Record<ReviewSeverity, string> = {
  Critical: "border-rose-200 bg-rose-50 text-rose-700",
  Warning: "border-amber-200 bg-amber-50 text-amber-800",
  Advisory: "border-sky-200 bg-sky-50 text-sky-700",
  Passed: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

const statusTone: Record<ReviewFindingStatus, string> = {
  Open: "border-rose-200 bg-rose-50 text-rose-700",
  "Appraiser Responded": "border-blue-200 bg-blue-50 text-blue-700",
  Corrected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Accepted Explanation": "border-emerald-200 bg-emerald-50 text-emerald-700",
  Dismissed: "border-slate-200 bg-slate-50 text-slate-600",
  Escalated: "border-purple-200 bg-purple-50 text-purple-700",
  "Revision Requested": "border-orange-200 bg-orange-50 text-orange-800",
  Resolved: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={cn("chip", className)}>{children}</span>;
}

function latestResultForOrder(orderId: string, versions: AppraisalReportVersion[], results: ReportReviewResult[]) {
  const orderVersions = versions.filter((version) => version.orderId === orderId).sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = orderVersions[0];
  const latestResult = latestVersion ? results.find((result) => result.reportVersionId === latestVersion.id) : results.filter((result) => result.orderId === orderId).at(-1);
  return { orderVersions, latestVersion, latestResult };
}

function FindingRow({
  finding,
  canRespond,
  canManage,
  canRelease,
  onRespondToFinding,
  onUpdateFindingStatus,
  onReleaseFindingToClient
}: {
  finding: ReviewFinding;
  canRespond: boolean;
  canManage: boolean;
  canRelease: boolean;
  onRespondToFinding: (findingId: string, response: string) => void;
  onUpdateFindingStatus: (findingId: string, status: ReviewFindingStatus, severity?: ReviewSeverity) => void;
  onReleaseFindingToClient: (findingId: string) => void;
}) {
  const primaryEvidence = finding.evidence[0];
  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={severityTone[finding.severity]}>{finding.severity}</Chip>
            <Chip className={statusTone[finding.status]}>{finding.status}</Chip>
            {finding.requiresHumanJudgment && <Chip className="border-slate-200 bg-slate-50 text-slate-600">Human judgment</Chip>}
            {finding.visibility.includes("client") && <Chip className="border-brand-100 bg-brand-50 text-brand-700">Client visible</Chip>}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-950">{finding.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{finding.description}</p>
        </div>
        {canManage && (
          <select
            className="control h-9 min-w-36 text-xs"
            value={finding.severity}
            aria-label={`Change severity for ${finding.title}`}
            onChange={(event) => onUpdateFindingStatus(finding.id, finding.status, event.target.value as ReviewSeverity)}
          >
            {["Critical", "Warning", "Advisory", "Passed"].map((severity) => <option key={severity}>{severity}</option>)}
          </select>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
          <div className="text-xs font-medium text-slate-500">Source</div>
          <div className="mt-1 text-sm text-slate-800">
            {primaryEvidence?.sourceFileName ?? "Structured review rule"}
            {primaryEvidence?.sourcePage ? `, p. ${primaryEvidence.sourcePage}` : ""}
            {primaryEvidence?.xmlPath ? `, ${primaryEvidence.xmlPath}` : ""}
          </div>
        </div>
        <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
          <div className="text-xs font-medium text-slate-500">Rule</div>
          <div className="mt-1 text-sm text-slate-800">{finding.ruleSource}</div>
        </div>
        <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
          <div className="text-xs font-medium text-slate-500">Suggested next step</div>
          <div className="mt-1 text-sm text-slate-800">{finding.suggestedResolution}</div>
        </div>
      </div>

      {finding.evidence.length > 1 && (
        <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
          {finding.evidence.slice(0, 4).map((item) => (
            <div key={`${finding.id}-${item.label}-${item.value}`} className="rounded-md border border-line px-3 py-2">
              <span className="font-medium text-slate-700">{item.label}:</span> {item.value}
            </div>
          ))}
        </div>
      )}

      {(finding.appraiserResponse || finding.reviewerResponse) && (
        <div className="mt-3 grid gap-2 text-sm">
          {finding.appraiserResponse && <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-800">Appraiser: {finding.appraiserResponse}</div>}
          {finding.reviewerResponse && <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800">Reviewer: {finding.reviewerResponse}</div>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canRespond && (
          <>
            <button className="secondary-button h-8 px-2 text-xs" onClick={() => onRespondToFinding(finding.id, "Appraiser explanation added. Reviewer should confirm whether the issue is resolved.")}>
              <MessageSquare className="h-3.5 w-3.5" />
              Explain
            </button>
            <button className="secondary-button h-8 px-2 text-xs" onClick={() => onUpdateFindingStatus(finding.id, "Accepted Explanation")}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Not applicable
            </button>
            <button className="secondary-button h-8 px-2 text-xs" onClick={() => onUpdateFindingStatus(finding.id, "Escalated")}>
              <AlertTriangle className="h-3.5 w-3.5" />
              Escalate
            </button>
          </>
        )}
        {canManage && (
          <>
            <button className="secondary-button h-8 px-2 text-xs" onClick={() => onUpdateFindingStatus(finding.id, "Revision Requested")}>Revision request</button>
            <button className="secondary-button h-8 px-2 text-xs" onClick={() => onUpdateFindingStatus(finding.id, "Dismissed")}>Dismiss</button>
            <button className="secondary-button h-8 px-2 text-xs" onClick={() => onUpdateFindingStatus(finding.id, "Resolved")}>Resolve</button>
          </>
        )}
        {canRelease && !finding.visibility.includes("client") && (
          <button className="secondary-button h-8 px-2 text-xs" onClick={() => onReleaseFindingToClient(finding.id)}>
            <Eye className="h-3.5 w-3.5" />
            Client visible
          </button>
        )}
      </div>
    </article>
  );
}

export function ReportReviewPanel({
  order,
  user,
  organization,
  versions,
  results,
  onRunReview,
  onUploadCorrectedReport,
  onRespondToFinding,
  onUpdateFindingStatus,
  onReleaseFindingToClient
}: ReportReviewPanelProps) {
  const { orderVersions, latestVersion, latestResult } = latestResultForOrder(order.id, versions, results);
  const context = { user, organization, order };
  const visibleFindings = getVisibleReviewFindings(latestResult, context);
  const canManage = canReviewerManageFinding(context);
  const canRun = user.role !== "client_user";
  const openVisibleFindings = visibleFindings.filter((finding) => finding.severity !== "Passed" && !["Dismissed", "Resolved", "Accepted Explanation", "Corrected"].includes(finding.status));

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-line bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <SectionHeader icon={FileSearch} title="Report Ingestion and Automated QC" />
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              CAS preserves each uploaded report version, extracts structured fields with source evidence, runs deterministic QC checks, and keeps final judgment with the assigned reviewer.
            </p>
          </div>
          {canRun && (
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button" onClick={() => onRunReview(order.id)}>
                <FileSearch className="h-4 w-4" />
                Run review checks
              </button>
              <button className="primary-button" onClick={() => onUploadCorrectedReport(order.id)}>
                <UploadCloud className="h-4 w-4" />
                Upload corrected version
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricTile label="Profile" value={latestVersion?.profileId.replaceAll("-", " ") ?? "Not run"} />
          <MetricTile label="Version" value={latestVersion ? `v${latestVersion.versionNumber}` : "No report version"} />
          <MetricTile label="Open findings" value={String(openVisibleFindings.length)} />
          <MetricTile label="AI provider" value={latestResult?.aiProviderStatus === "enabled" ? "Enabled" : "Disabled"} />
        </div>

        {latestResult && (
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            <MetricTile label="Critical" value={String(latestResult.summary.Critical)} />
            <MetricTile label="Warnings" value={String(latestResult.summary.Warning)} />
            <MetricTile label="Advisory" value={String(latestResult.summary.Advisory)} />
            <MetricTile label="Passed" value={String(latestResult.summary.Passed)} />
            <MetricTile label="Overall" value={latestResult.summary.overallStatus} />
          </div>
        )}

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          <div className="flex items-start gap-2">
            <BotOff className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>{latestResult?.safetyNotice ?? "Automated findings are quality-control aids only. CAS will not determine value, alter conclusions, or reject a report without human review."}</span>
          </div>
        </div>
      </div>

      {!latestResult && (
        <div className="rounded-md border border-dashed border-line bg-white px-4 py-6 text-sm text-slate-500">
          No report review has been run for this order yet. Upload or preserve the report package, then run review checks before final delivery.
        </div>
      )}

      {latestResult && !visibleFindings.length && (
        <div className="rounded-md border border-dashed border-line bg-white px-4 py-6 text-sm text-slate-500">
          No findings are visible to your role for this report version.
        </div>
      )}

      {visibleFindings.length > 0 && (
        <div className="grid gap-3">
          {visibleFindings
            .slice()
            .sort((a, b) => ["Critical", "Warning", "Advisory", "Passed"].indexOf(a.severity) - ["Critical", "Warning", "Advisory", "Passed"].indexOf(b.severity))
            .map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
                canRespond={canRespondToFinding(context, finding)}
                canManage={canManage}
                canRelease={canReleaseFindingToClient(context, finding)}
                onRespondToFinding={onRespondToFinding}
                onUpdateFindingStatus={onUpdateFindingStatus}
                onReleaseFindingToClient={onReleaseFindingToClient}
              />
            ))}
        </div>
      )}

      {orderVersions.length > 0 && (
        <div className="rounded-md border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <GitCompare className="h-4 w-4 text-brand-600" />
            Immutable Report Versions
          </div>
          <div className="mt-3 grid gap-2">
            {orderVersions.map((version) => (
              <div key={version.id} className="flex flex-col gap-2 rounded-md border border-line px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium text-slate-900">Version {version.versionNumber}: {version.sourceFiles.map((file) => file.fileName).join(", ")}</div>
                  <div className="mt-1 text-xs text-slate-500">{version.extractionSummary}</div>
                </div>
                <Chip className="border-slate-200 bg-slate-50 text-slate-700">{version.immutable ? "Immutable" : "Editable"}</Chip>
              </div>
            ))}
          </div>
        </div>
      )}

      {latestVersion?.normalizedReport.versionComparison && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <RotateCcw className="h-4 w-4" />
            Revised Version Comparison
          </div>
          <p className="mt-2">
            Resolved {latestVersion.normalizedReport.versionComparison.resolvedFindingIds.length} prior finding(s). Changed sections: {latestVersion.normalizedReport.versionComparison.changedSections.join(", ")}.
          </p>
        </div>
      )}
    </section>
  );
}
