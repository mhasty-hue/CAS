import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  BotOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
  FileText,
  GitCompare,
  ListFilter,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { Order, Organization, PortalUser } from "@/types/domain";
import type { AppraisalReportVersion, ReportReviewResult, ReviewFinding, ReviewFindingStatus, ReviewSeverity } from "@/types/report-review";
import { defaultAiReviewSettings, demoAiReviewSettings, userCanManageAiReviewSettings } from "@/lib/report-review/ai-settings";
import { canReleaseFindingToClient, canRespondToFinding, canReviewerManageFinding } from "@/lib/report-review/permissions";
import {
  buildReviewWorkspaceModel,
  defaultReviewWorkspaceFilters,
  type ReviewWorkspaceFilters,
  type ReviewWorkspaceTab
} from "@/lib/report-review/workspace";
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
  onMarkReadyForDelivery: (orderId: string) => void;
};

const severityTone: Record<ReviewSeverity, string> = {
  Critical: "border-rose-200 bg-rose-50 text-rose-700",
  Warning: "border-amber-200 bg-amber-50 text-amber-800",
  Advisory: "border-sky-200 bg-sky-50 text-sky-800",
  Passed: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

const statusTone: Record<ReviewFindingStatus, string> = {
  Open: "border-slate-200 bg-slate-50 text-slate-700",
  Confirmed: "border-orange-200 bg-orange-50 text-orange-800",
  "Appraiser Responded": "border-blue-200 bg-blue-50 text-blue-700",
  Corrected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Accepted Explanation": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Clarification Requested": "border-violet-200 bg-violet-50 text-violet-700",
  "Not Applicable": "border-zinc-200 bg-zinc-50 text-zinc-700",
  Dismissed: "border-slate-200 bg-slate-50 text-slate-500",
  Escalated: "border-red-200 bg-red-50 text-red-700",
  "Revision Requested": "border-rose-200 bg-rose-50 text-rose-700",
  Resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Reopened: "border-amber-200 bg-amber-50 text-amber-800"
};

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("chip", className)}>{children}</span>;
}

function SelectControl({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <select className="control h-9 min-w-0 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function WorkspaceTabs({ active, onChange }: { active: ReviewWorkspaceTab; onChange: (tab: ReviewWorkspaceTab) => void }) {
  const tabs: Array<{ id: ReviewWorkspaceTab; label: string; icon: typeof Eye }> = [
    { id: "viewer", label: "Viewer", icon: Eye },
    { id: "findings", label: "Findings", icon: ListFilter },
    { id: "detail", label: "Detail", icon: MessageSquare },
    { id: "versions", label: "Versions", icon: GitCompare }
  ];
  return (
    <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-slate-50 p-1 xl:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={cn("flex h-10 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-slate-600", active === tab.id && "bg-white text-brand-700 shadow-sm")}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Not recorded";
  if (value === "Just now") return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function findingSourceLabel(finding: ReviewFinding) {
  if (finding.aiAssisted) return "AI-assisted";
  if (finding.deterministic) return "Deterministic";
  return "Manual";
}

function FindingCard({
  finding,
  active,
  onSelect
}: {
  finding: ReviewFinding;
  active: boolean;
  onSelect: (findingId: string) => void;
}) {
  const evidence = finding.evidence[0] ?? finding.orderEvidence[0];
  return (
    <button
      className={cn("w-full rounded-md border px-3 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40", active ? "border-brand-300 bg-brand-50" : "border-line bg-white")}
      onClick={() => onSelect(finding.id)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-slate-950">{finding.title}</div>
          <div className="mt-1 text-xs text-slate-500">{finding.category} - {findingSourceLabel(finding)}</div>
        </div>
        <Chip className={severityTone[finding.severity]}>{finding.severity}</Chip>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip className={statusTone[finding.status]}>{finding.status}</Chip>
        {finding.requiresHumanJudgment && <Chip className="border-violet-200 bg-violet-50 text-violet-700">Human judgment</Chip>}
        {finding.aiAssisted && <Chip className="border-indigo-200 bg-indigo-50 text-indigo-700">AI pilot</Chip>}
        {finding.visibility.includes("client") && <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">Client visible</Chip>}
      </div>
      {evidence && (
        <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
          {evidence.sourcePage ? `p. ${evidence.sourcePage} - ` : ""}{evidence.label}: {evidence.value}
        </div>
      )}
    </button>
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
  onReleaseFindingToClient,
  onMarkReadyForDelivery
}: ReportReviewPanelProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [selectedFindingId, setSelectedFindingId] = useState<string | undefined>();
  const [filters, setFilters] = useState<ReviewWorkspaceFilters>(defaultReviewWorkspaceFilters);
  const [workspaceTab, setWorkspaceTab] = useState<ReviewWorkspaceTab>("viewer");
  const [viewerPageIndex, setViewerPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [query, setQuery] = useState("");
  const [showExtraction, setShowExtraction] = useState(true);
  const [showRevisionDraft, setShowRevisionDraft] = useState(false);

  const workspace = useMemo(
    () =>
      buildReviewWorkspaceModel({
        order,
        user,
        organization,
        versions,
        results,
        selectedVersionId,
        selectedFindingId,
        filters
      }),
    [filters, order, organization, results, selectedFindingId, selectedVersionId, user, versions]
  );

  const context = { user, order, organization };
  const selectedFinding = workspace.selectedFinding;
  const canManageFinding = canReviewerManageFinding(context);
  const canRespond = selectedFinding ? canRespondToFinding(context, selectedFinding) : false;
  const canRelease = selectedFinding ? canReleaseFindingToClient(context, selectedFinding) : false;
  const canManageAiSettings = userCanManageAiReviewSettings(user);
  const productionAiSettings = defaultAiReviewSettings(organization.id);
  const demoSettings = demoAiReviewSettings(organization.id);
  const currentPage = workspace.viewerPages[Math.min(viewerPageIndex, Math.max(workspace.viewerPages.length - 1, 0))] ?? workspace.viewerPages[0];
  const relatedSnippets = query.trim()
    ? (currentPage?.snippets ?? []).filter((snippet) => snippet.toLowerCase().includes(query.trim().toLowerCase()))
    : currentPage?.snippets ?? [];
  const pageFindingIds = new Set(currentPage?.evidenceFindingIds ?? []);

  function patchFilters(next: Partial<ReviewWorkspaceFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function selectFinding(findingId: string) {
    setSelectedFindingId(findingId);
    setWorkspaceTab("detail");
    const pageIndex = workspace.viewerPages.findIndex((page) => page.evidenceFindingIds.includes(findingId));
    if (pageIndex >= 0) setViewerPageIndex(pageIndex);
  }

  return (
    <section className="grid gap-5">
      <div className="panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip className="border-brand-200 bg-brand-50 text-brand-700">Review Workspace</Chip>
              <Chip className={workspace.activeResult?.aiProviderStatus === "completed" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                {workspace.activeResult?.aiProviderStatus === "completed" ? "AI-assisted pilot complete" : "Production AI disabled by default"}
              </Chip>
              <Chip className={workspace.readiness.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{workspace.readiness.state}</Chip>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">Appraisal Review Workspace</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Inspect report evidence, work findings, compare immutable versions, and confirm whether {order.fileNumber} is ready for delivery without leaving the order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" onClick={() => onRunReview(order.id)} type="button">
              <FileSearch className="h-4 w-4" />
              Upload report and run checks
            </button>
            <button className="secondary-button" onClick={() => onUploadCorrectedReport(order.id)} type="button">
              <UploadCloud className="h-4 w-4" />
              Upload corrected version
            </button>
            <button className="primary-button disabled:opacity-50" disabled={!workspace.readiness.ready} onClick={() => onMarkReadyForDelivery(order.id)} type="button">
              <Send className="h-4 w-4" />
              Mark ready for delivery
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricTile label="Selected version" value={workspace.activeVersion ? `v${workspace.activeVersion.versionNumber}` : "None"} />
          <MetricTile label="Open findings" value={String(workspace.activeResult?.summary.openFindings ?? 0)} />
          <MetricTile label="Critical" value={String(workspace.activeResult?.summary.Critical ?? 0)} />
          <MetricTile label="AI status" value={workspace.activeResult?.aiRun?.status ?? workspace.activeResult?.aiProviderStatus ?? "disabled"} />
          <MetricTile label="Delivery" value={workspace.readiness.ready ? "Ready" : "Blocked"} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Production default: <span className="font-semibold text-slate-900">{productionAiSettings.enabled ? "enabled" : "disabled"}</span>. No external provider is assumed.
          </div>
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Demo pilot: <span className="font-semibold text-slate-900">{demoSettings.providerId}</span> with zero-retention fictional outputs.
          </div>
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">
            AI settings: <span className="font-semibold text-slate-900">{canManageAiSettings ? "admin-manageable foundation" : "not editable for this role"}</span>.
          </div>
        </div>
      </div>

      <WorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.95fr)_minmax(320px,0.9fr)_minmax(340px,1fr)]">
        <section className={cn("panel overflow-hidden", workspaceTab !== "viewer" && "hidden xl:block")}>
          <div className="border-b border-line p-4">
            <SectionHeader icon={Eye} title="Report Viewer" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="control h-9 min-w-40 text-xs"
                value={workspace.activeVersion?.id ?? ""}
                onChange={(event) => {
                  setSelectedVersionId(event.target.value || undefined);
                  setViewerPageIndex(0);
                }}
              >
                {workspace.versionSummaries.length ? workspace.versionSummaries.map((version) => (
                  <option key={version.id} value={version.id}>Version {version.versionNumber} - {version.status}</option>
                )) : <option value="">No report version</option>}
              </select>
              <button className="icon-button" aria-label="Previous page" onClick={() => setViewerPageIndex((index) => Math.max(0, index - 1))} type="button"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-xs font-medium text-slate-600">Page {currentPage?.pageNumber ?? 1}</span>
              <button className="icon-button" aria-label="Next page" onClick={() => setViewerPageIndex((index) => Math.min(workspace.viewerPages.length - 1, index + 1))} type="button"><ChevronRight className="h-4 w-4" /></button>
              <button className="icon-button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(75, value - 10))} type="button"><ZoomOut className="h-4 w-4" /></button>
              <span className="text-xs text-slate-500">{zoom}%</span>
              <button className="icon-button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(140, value + 10))} type="button"><ZoomIn className="h-4 w-4" /></button>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="control w-full pl-9 text-sm" placeholder="Search extracted report text" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </div>

          <div className="max-h-[680px] overflow-y-auto p-4">
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm" style={{ fontSize: `${zoom}%` }}>
              <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">{workspace.activeVersion?.sourceFiles[0]?.fileName ?? "No report selected"}</div>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">{currentPage?.title ?? "Page 1"}</h3>
                </div>
                <FileText className="h-5 w-5 text-brand-600" />
              </div>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
                {(relatedSnippets.length ? relatedSnippets : ["No matching extracted text for this page."]).map((snippet, index) => (
                  <div key={`${snippet}-${index}`} className="rounded-md border border-line bg-slate-50 px-3 py-2">
                    {snippet}
                  </div>
                ))}
              </div>
              {selectedFinding && (
                <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                  Jump to evidence: {selectedFinding.evidence[0]?.label ?? "Selected finding"} {selectedFinding.evidence[0]?.sourcePage ? `on page ${selectedFinding.evidence[0].sourcePage}` : "with no exact page coordinate"}.
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Exact PDF highlighting is simulated with page-level focus until production coordinate extraction is configured.
              </p>
            </div>

            <button className="mt-4 flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left text-sm font-medium text-slate-800" onClick={() => setShowExtraction((value) => !value)} type="button">
              <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-brand-600" /> Extraction transparency</span>
              <span className="text-xs text-slate-500">{showExtraction ? "Hide" : "Show"}</span>
            </button>
            {showExtraction && (
              <div className="mt-3 grid gap-2 text-sm">
                <MetricTile label="File received" value={workspace.extractionStatus.fileReceived} />
                <MetricTile label="Text extraction" value={workspace.extractionStatus.textExtractionStatus} />
                <MetricTile label="Structured extraction" value={workspace.extractionStatus.structuredDataStatus} />
                <MetricTile label="Profile / overlays" value={`${workspace.extractionStatus.reportProfile} / ${workspace.extractionStatus.overlays}`} />
                <MetricTile label="Fields verified" value={String(workspace.extractionStatus.fieldsVerified)} />
                <MetricTile label="Needs confirmation" value={String(workspace.extractionStatus.fieldsNeedConfirmation)} />
                <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  {workspace.extractionStatus.limitations.join(" ")}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={cn("panel overflow-hidden", workspaceTab !== "findings" && "hidden xl:block")}>
          <div className="border-b border-line p-4">
            <SectionHeader icon={ListFilter} title="Findings Panel" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SelectControl label="Severity" value={filters.severity} options={workspace.filterOptions.severities} onChange={(value) => patchFilters({ severity: value as ReviewWorkspaceFilters["severity"] })} />
              <SelectControl label="Status" value={filters.status} options={workspace.filterOptions.statuses} onChange={(value) => patchFilters({ status: value as ReviewWorkspaceFilters["status"] })} />
              <SelectControl label="Category" value={filters.category} options={workspace.filterOptions.categories} onChange={(value) => patchFilters({ category: value as ReviewWorkspaceFilters["category"] })} />
              <SelectControl label="Rule pack" value={filters.rulePackId} options={workspace.filterOptions.rulePacks.map((pack) => pack.id)} onChange={(value) => patchFilters({ rulePackId: value as ReviewWorkspaceFilters["rulePackId"] })} />
              <SelectControl label="Human judgment" value={filters.humanJudgment} options={["All", "Required", "Not required"]} onChange={(value) => patchFilters({ humanJudgment: value as ReviewWorkspaceFilters["humanJudgment"] })} />
              <SelectControl label="Visibility" value={filters.visibility} options={["All", "internal", "appraiser", "client"]} onChange={(value) => patchFilters({ visibility: value as ReviewWorkspaceFilters["visibility"] })} />
              <SelectControl label="Source page" value={String(filters.sourcePage)} options={workspace.filterOptions.sourcePages.map(String)} onChange={(value) => patchFilters({ sourcePage: value === "All" ? "All" : Number(value) })} />
              <SelectControl label="Responsible" value={filters.responsibleParty} options={["All", "Appraiser", "Reviewer", "Client"]} onChange={(value) => patchFilters({ responsibleParty: value as ReviewWorkspaceFilters["responsibleParty"] })} />
            </div>
            <button className="secondary-button mt-3 h-9 px-3 text-xs" onClick={() => setFilters(defaultReviewWorkspaceFilters)} type="button">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </button>
          </div>
          <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
            {workspace.filteredFindings.length ? workspace.filteredFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} active={finding.id === selectedFinding?.id || pageFindingIds.has(finding.id)} onSelect={selectFinding} />
            )) : (
              <div className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-slate-500">
                No findings match the current filters.
              </div>
            )}
          </div>
        </section>

        <section className={cn("grid gap-5", workspaceTab !== "detail" && workspaceTab !== "versions" && "hidden xl:grid")}>
          <div className={cn("panel overflow-hidden", workspaceTab === "versions" && "hidden xl:block")}>
            <div className="border-b border-line p-4">
              <SectionHeader icon={MessageSquare} title="Finding Detail and Response" />
            </div>
            <div className="max-h-[680px] overflow-y-auto p-4">
              {selectedFinding ? (
                <div className="grid gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Chip className={severityTone[selectedFinding.severity]}>{selectedFinding.severity}</Chip>
                      <Chip className={statusTone[selectedFinding.status]}>{selectedFinding.status}</Chip>
                      <Chip className="border-slate-200 bg-slate-50 text-slate-700">{selectedFinding.category}</Chip>
                      <Chip className="border-indigo-200 bg-indigo-50 text-indigo-700">{findingSourceLabel(selectedFinding)}</Chip>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{selectedFinding.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedFinding.description}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <MetricTile label="Rule" value={`${selectedFinding.ruleId} ${selectedFinding.ruleVersion}`} />
                    <MetricTile label="Profile / overlay" value={`${selectedFinding.profileId} / ${selectedFinding.overlayId}`} />
                    <MetricTile label="Source" value={selectedFinding.ruleSource} />
                    <MetricTile label="Updated" value={formatDateTime(selectedFinding.updatedAt)} />
                  </div>

                  <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
                    <div className="font-semibold text-slate-950">Why it matters</div>
                    <p className="mt-1 leading-6 text-slate-600">{selectedFinding.whyItMatters}</p>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Report evidence</div>
                      <div className="mt-2 grid gap-2">
                        {(selectedFinding.evidence.length ? selectedFinding.evidence : [{ label: "Evidence", value: "No report evidence supplied" }]).map((item, index) => (
                          <div key={`${item.label}-${index}`} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">
                            <div className="font-medium text-slate-900">{item.label}</div>
                            <div className="mt-1">{item.value}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.xmlPath ?? (item.sourcePage ? `${item.sourceFileName ?? "Report"}, p. ${item.sourcePage}` : item.sourceFileName ?? "No exact source")}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Order evidence</div>
                      <div className="mt-2 grid gap-2">
                        {(selectedFinding.orderEvidence.length ? selectedFinding.orderEvidence : [{ label: "Order context", value: "No extra order evidence required" }]).map((item, index) => (
                          <div key={`${item.label}-${index}`} className="rounded-md border border-line px-3 py-2 text-sm text-slate-700">
                            <div className="font-medium text-slate-900">{item.label}</div>
                            <div className="mt-1">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedFinding.aiAssisted && selectedFinding.aiMetadata && (
                    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                      <div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4" /> AI-assisted evidence summary</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <MetricTile label="Provider" value={selectedFinding.aiMetadata.providerId} />
                        <MetricTile label="Model" value={selectedFinding.aiMetadata.modelId} />
                        <MetricTile label="Evidence quality" value={selectedFinding.aiMetadata.evidenceQuality} />
                        <MetricTile label="Human disposition" value={selectedFinding.aiMetadata.humanDisposition} />
                      </div>
                      <p className="mt-2 text-xs leading-5">
                        AI wording remains internal until a reviewer edits and approves client-visible language. CAS did not request hidden reasoning and does not auto-approve, reject, or change value.
                      </p>
                    </div>
                  )}

                  <div className="rounded-md border border-line bg-white p-3 text-sm">
                    <div className="font-semibold text-slate-950">Suggested resolution</div>
                    <p className="mt-1 leading-6 text-slate-600">{selectedFinding.suggestedResolution}</p>
                    {selectedFinding.appraiserResponse && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-blue-800">Appraiser: {selectedFinding.appraiserResponse}</p>}
                    {selectedFinding.reviewerResponse && <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-slate-700">Reviewer: {selectedFinding.reviewerResponse}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canRespond && (
                      <button className="secondary-button" onClick={() => onRespondToFinding(selectedFinding.id, "Reviewer question acknowledged. A corrected report version has been or will be uploaded with a written response.")} type="button">
                        <MessageSquare className="h-4 w-4" />
                        Respond
                      </button>
                    )}
                    {canManageFinding && (
                      <>
                        <button className="secondary-button" onClick={() => onUpdateFindingStatus(selectedFinding.id, "Confirmed")} type="button">Confirm</button>
                        <button className="secondary-button" onClick={() => onUpdateFindingStatus(selectedFinding.id, "Clarification Requested")} type="button">Clarification</button>
                        <button className="secondary-button" onClick={() => onUpdateFindingStatus(selectedFinding.id, "Revision Requested")} type="button">Revision</button>
                        <button className="secondary-button" onClick={() => onUpdateFindingStatus(selectedFinding.id, "Not Applicable")} type="button">Not applicable</button>
                        <button className="secondary-button" onClick={() => onUpdateFindingStatus(selectedFinding.id, "Dismissed")} type="button">Dismiss</button>
                        <button className="primary-button" onClick={() => onUpdateFindingStatus(selectedFinding.id, "Resolved")} type="button">
                          <CheckCircle2 className="h-4 w-4" />
                          Resolve
                        </button>
                      </>
                    )}
                    {canRelease && (
                      <button className="secondary-button" onClick={() => onReleaseFindingToClient(selectedFinding.id)} type="button">
                        <Eye className="h-4 w-4" />
                        Client visible
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-slate-500">
                  Select a finding to review evidence, responses, and disposition controls.
                </div>
              )}
            </div>
          </div>

          <div className={cn("panel overflow-hidden", workspaceTab === "detail" && "hidden xl:block")}>
            <div className="border-b border-line p-4">
              <SectionHeader icon={GitCompare} title="Version Control and Comparison" />
            </div>
            <div className="max-h-[680px] overflow-y-auto p-4">
              <div className="grid gap-2">
                {workspace.versionSummaries.length ? workspace.versionSummaries.map((version) => (
                  <button
                    key={version.id}
                    className={cn("rounded-md border px-3 py-3 text-left text-sm hover:bg-slate-50", version.active ? "border-brand-300 bg-brand-50" : "border-line bg-white")}
                    onClick={() => {
                      setSelectedVersionId(version.id);
                      setViewerPageIndex(0);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">Version {version.versionNumber}</div>
                        <div className="mt-1 text-xs text-slate-500">{version.fileNames}</div>
                      </div>
                      <Chip className={version.delivered ? "border-emerald-200 bg-emerald-50 text-emerald-700" : version.superseded ? "border-slate-200 bg-slate-50 text-slate-500" : "border-sky-200 bg-sky-50 text-sky-800"}>
                        {version.delivered ? "Delivered" : version.superseded ? "Superseded" : version.status}
                      </Chip>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <MetricTile label="Uploaded by" value={version.uploadedBy} />
                      <MetricTile label="Uploaded" value={formatDateTime(version.uploadedAt)} />
                      <MetricTile label="Immutable ID" value={version.immutableIdentity} />
                      <MetricTile label="Open findings" value={String(version.findingCounts.openFindings)} />
                    </div>
                  </button>
                )) : (
                  <div className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-slate-500">
                    Upload a report to create the first immutable version.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-md border border-line bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <GitCompare className="h-4 w-4 text-brand-600" />
                  Version comparison
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{workspace.comparison.limitation}</p>
                <div className="mt-3 grid gap-2">
                  {workspace.comparison.changedFields.length ? workspace.comparison.changedFields.map((field) => (
                    <div key={field.id} className="rounded-md border border-line bg-white px-3 py-2 text-sm">
                      <div className="font-semibold text-slate-950">{field.label}</div>
                      <div className="mt-1 grid gap-2 sm:grid-cols-2">
                        <MetricTile label="Previous" value={field.previousValue} />
                        <MetricTile label="New" value={field.newValue} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{field.confidence} - {field.source}</div>
                    </div>
                  )) : (
                    <div className="rounded-md border border-dashed border-line bg-white px-3 py-3 text-sm text-slate-500">
                      No structured changes detected for the selected version pair.
                    </div>
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MetricTile label="Resolved findings" value={String(workspace.comparison.resolvedFindingIds.length)} />
                  <MetricTile label="Still open" value={String(workspace.comparison.unresolvedFindingIds.length)} />
                  <MetricTile label="Added exhibits" value={String(workspace.comparison.addedExhibits.length)} />
                </div>
              </div>

              <div className="mt-4 rounded-md border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <ShieldCheck className="h-4 w-4 text-brand-600" />
                    Delivery readiness
                  </div>
                  <Chip className={workspace.readiness.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{workspace.readiness.state}</Chip>
                </div>
                <div className="mt-3 grid gap-2">
                  {workspace.readiness.reasons.map((reason) => (
                    <div key={reason} className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm text-slate-700">{reason}</div>
                  ))}
                </div>
              </div>

              <button className="mt-4 flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left text-sm font-medium text-slate-800" onClick={() => setShowRevisionDraft((value) => !value)} type="button">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-brand-600" /> Revision request draft</span>
                <span className="text-xs text-slate-500">{showRevisionDraft ? "Hide" : "Show"}</span>
              </button>
              {showRevisionDraft && (
                <div className="mt-3 rounded-md border border-line bg-white p-3 text-sm">
                  <div className="font-semibold text-slate-950">{workspace.revisionDraft.orderIdentifier} - {workspace.revisionDraft.propertyAddress}</div>
                  <div className="mt-1 text-xs text-slate-500">{workspace.revisionDraft.reportVersionLabel} - Due {workspace.revisionDraft.dueDate}</div>
                  <div className="mt-3 grid gap-2">
                    {workspace.revisionDraft.items.length ? workspace.revisionDraft.items.map((item) => (
                      <div key={item.findingId} className="rounded-md border border-line bg-slate-50 px-3 py-2">
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{item.explanation}</p>
                        <div className="mt-1 text-xs text-slate-500">{item.sourceReference}</div>
                      </div>
                    )) : (
                      <div className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-slate-500">No appraiser-visible open findings are ready for a revision request.</div>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{workspace.revisionDraft.submissionInstructions}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {workspace.activeResult?.aiProviderStatus === "unavailable" && (
        <div className="panel flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <BotOff className="mt-0.5 h-4 w-4" />
          <p>Automated deterministic checks completed. AI-assisted review was unavailable, so human review can continue without blocking the report.</p>
        </div>
      )}
    </section>
  );
}
