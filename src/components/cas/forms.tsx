import { useRef, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, ClipboardCheck, FileText, Home, Plus, ReceiptText, RotateCcw, Save, SlidersHorizontal, Sparkles, TableProperties, UploadCloud, UserCheck } from "lucide-react";
import { appraisers, clients, productTypes, reviewers } from "@/data/demo";
import type { Order, OrderFormTemplate, OrderImportDecision, OrderImportField, OrderImportFieldKey, OrderImportTemplate, OrderIntakePrefill, Organization, PortalUser } from "@/types/domain";
import { canCustomizeOrderForms } from "@/lib/permissions";
import { demoOrderImportProvider, orderImportFieldDefinitions } from "@/lib/order-import/service";
import { roleLabel } from "./config";
import { Field, InfoRow, SectionHeader, TemplateFieldPreview } from "./shared";
import { workloadPercent } from "./orders";

export function NewOrderView({
  user,
  organization,
  template,
  existingOrders,
  onTemplateChange,
  onRestoreTemplate,
  onCreateOrder
}: {
  user: PortalUser;
  organization: Organization;
  template: OrderFormTemplate;
  existingOrders: Order[];
  onTemplateChange: (template: OrderFormTemplate) => void;
  onRestoreTemplate: () => void;
  onCreateOrder: (kind: "internal" | "client" | "amc", templateName?: string, appliedImport?: OrderIntakePrefill | null, formValues?: Record<string, string>) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const orderKind = organization.type === "amc" ? "amc" : user.role === "client_user" ? "client" : "internal";
  const visibleSections = template.sections.filter((section) => !section.hidden);
  const canCustomize = canCustomizeOrderForms(user);
  const [importAnalysis, setImportAnalysis] = useState<OrderIntakePrefill | null>(null);
  const [appliedImport, setAppliedImport] = useState<OrderIntakePrefill | null>(null);
  const [mappingDraft, setMappingDraft] = useState<Record<string, { decision: OrderImportDecision; mappedTo: string; value: string }>>({});
  const [importTemplates, setImportTemplates] = useState<OrderImportTemplate[]>([
    {
      id: "template-harborpoint-csv",
      organizationId: organization.id,
      name: "HarborPoint CSV export",
      client: "HarborPoint Lending",
      sourceType: "CSV",
      columns: [
        { sourceLabel: "Borrower Full Name", targetKey: "borrower" },
        { sourceLabel: "Subject Address", targetKey: "property_address" },
        { sourceLabel: "Appraisal Form", targetKey: "product_type" }
      ],
      updatedAt: "Saved demo template"
    }
  ]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const prefillValue = (key: string, fallback = "") => appliedImport?.fields.find((field) => field.key === key || field.mappedTo === key)?.value ?? fallback;
  const clientOptions = Array.from(new Set([prefillValue("client", clients[0]), ...clients].filter(Boolean)));
  const productOptions = Array.from(new Set([prefillValue("product_type", productTypes[0]), ...productTypes].filter(Boolean)));
  const loanTypeOptions = Array.from(new Set([prefillValue("loan_type", "Conventional"), "Conventional", "FHA", "VA", "USDA", "Jumbo", "HELOC", "Portfolio"].filter(Boolean)));
  const stateZipValue = [prefillValue("state"), prefillValue("zip")].filter(Boolean).join(" ") || "GA 30064";

  async function handlePrefillUpload(file: File | null) {
    if (!file) return;
    setImportError("");
    setIsImporting(true);
    try {
      const analysis = await demoOrderImportProvider.analyze(file, existingOrders, importTemplates);
      setImportAnalysis(analysis);
      setMappingDraft(Object.fromEntries(analysis.fields.map((field) => [field.id, {
        decision: field.decision ?? (field.confidence >= 0.58 ? "accept" : "correct"),
        mappedTo: String(field.mappedTo ?? field.key),
        value: field.value
      }])));
    } catch {
      setImportError("CAS could not read that file. Try a PDF, CSV, or spreadsheet export with one order per row.");
    } finally {
      setIsImporting(false);
    }
  }

  function updateMappingDraft(fieldId: string, patch: Partial<{ decision: OrderImportDecision; mappedTo: string; value: string }>) {
    setMappingDraft((current) => ({
      ...current,
      [fieldId]: { ...current[fieldId], ...patch }
    }));
  }

  function applyImportToForm() {
    if (!importAnalysis) return;
    const correctedCount = Object.values(mappingDraft).filter((draft) => draft.decision === "correct" || draft.decision === "remap").length;
    const ignoredCount = Object.values(mappingDraft).filter((draft) => draft.decision === "ignore").length;
    const fields = importAnalysis.fields.flatMap<OrderImportField>((field) => {
      const draft = mappingDraft[field.id];
      if (!draft || draft.decision === "ignore") return [];
      return [{
        ...field,
        key: draft.mappedTo,
        mappedTo: draft.mappedTo,
        value: draft.value,
        decision: draft.decision,
        status: field.confidence < 0.58 ? "low_confidence" : "mapped"
      }];
    });

    setAppliedImport({
      ...importAnalysis,
      fields,
      mappingHistory: [
        {
          id: `mapping-${Date.now()}`,
          at: "Just now",
          actor: user.name,
          sourceName: importAnalysis.sourceName,
          acceptedCount: fields.length,
          correctedCount,
          ignoredCount,
          templateName: importAnalysis.templateName
        },
        ...importAnalysis.mappingHistory
      ],
      appliedAt: new Date().toISOString()
    });
  }

  function saveCurrentMappingTemplate() {
    if (!importAnalysis) return;
    const columns = importAnalysis.fields
      .map((field) => ({ sourceLabel: field.sourceLabel ?? field.label, targetKey: (mappingDraft[field.id]?.mappedTo ?? field.key) as OrderImportFieldKey | string }))
      .filter((column) => column.sourceLabel);
    setImportTemplates((current) => [
      {
        id: `import-template-${Date.now()}`,
        organizationId: organization.id,
        name: `${importAnalysis.sourceName} mapping`,
        client: mappingDraft[importAnalysis.fields.find((field) => field.key === "client")?.id ?? ""]?.value,
        sourceType: importAnalysis.sourceType,
        columns,
        updatedAt: "Just now"
      },
      ...current
    ]);
  }

  function resetImport() {
    setImportAnalysis(null);
    setAppliedImport(null);
    setMappingDraft({});
    setImportError("");
  }

  const primaryImportFields = importAnalysis?.fields.filter((field) => field.required || field.confidence < 0.72).slice(0, 10) ?? [];
  const additionalImportFields = importAnalysis?.fields.filter((field) => !primaryImportFields.some((primary) => primary.id === field.id)) ?? [];
  const acceptedImportCount = Object.values(mappingDraft).filter((draft) => draft.decision !== "ignore").length;

  function createOrder(kind: "internal" | "client" | "amc") {
    const formData = formRef.current ? new FormData(formRef.current) : new FormData();
    const formValues = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
    onCreateOrder(kind, template.name, appliedImport, formValues);
  }

  function updateTemplate(sections: OrderFormTemplate["sections"]) {
    onTemplateChange({
      ...template,
      ownerType: organization.type === "solo_appraiser" ? "solo_appraiser" : "company",
      organizationId: organization.id,
      updatedAt: "Just now",
      sections
    });
  }

  function renameSection(sectionId: string, title: string) {
    updateTemplate(template.sections.map((section) => (section.id === sectionId ? { ...section, title } : section)));
  }

  function toggleSection(sectionId: string) {
    updateTemplate(template.sections.map((section) => (section.id === sectionId ? { ...section, hidden: !section.hidden } : section)));
  }

  function removeSection(sectionId: string) {
    updateTemplate(template.sections.filter((section) => section.id !== sectionId));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const index = template.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= template.sections.length) return;
    const sections = [...template.sections];
    const [section] = sections.splice(index, 1);
    sections.splice(nextIndex, 0, section);
    updateTemplate(sections);
  }

  function addSection() {
    updateTemplate([
      ...template.sections,
      {
        id: `section-${Date.now()}`,
        title: `Custom section ${template.sections.length + 1}`,
        hidden: false,
        fields: [
          { id: `field-${Date.now()}`, label: "Custom field", type: "text", required: false }
        ]
      }
    ]);
  }

  function addCustomField(sectionId: string) {
    updateTemplate(
      template.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [
                ...section.fields,
                { id: `field-${Date.now()}`, label: `Custom field ${section.fields.length + 1}`, type: "text", required: false }
              ]
            }
          : section
      )
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form ref={formRef} key={appliedImport?.appliedAt ?? "manual"} className="panel p-5">
        <SectionHeader icon={Plus} title="New Order Intake" />
        <div className="mt-3 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Creating as {organization.name} ({roleLabel(user.role)}) with {template.name}.
        </div>
        <div className="mt-4 rounded-md border border-line bg-white p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-950">Active intake template</div>
              <div className="mt-1 text-xs text-slate-500">{visibleSections.length} visible sections - {template.ownerType.replace("_", " ")} setup - updated {template.updatedAt}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleSections.map((section) => (
                <span key={section.id} className="chip border-slate-200 bg-slate-50 text-slate-700">{section.title}</span>
              ))}
            </div>
          </div>
        </div>
        <section className="mt-4 rounded-md border border-line bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Sparkles className="h-4 w-4 text-brand-600" /> Import Order</div>
              <p className="mt-1 text-sm text-slate-500">Upload a PDF, CSV, or spreadsheet export, then review mapped values before they touch the form.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="primary-button cursor-pointer">
                <UploadCloud className="h-4 w-4" />
                Select file
                <input className="hidden" type="file" accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv" onChange={(event) => void handlePrefillUpload(event.target.files?.[0] ?? null)} />
              </label>
              {(importAnalysis || appliedImport) && <button type="button" className="secondary-button" onClick={resetImport}><RotateCcw className="h-4 w-4" /> Reset</button>}
            </div>
          </div>

          {isImporting && <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">Analyzing order file...</div>}
          {importError && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{importError}</div>}
          {appliedImport && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {appliedImport.fields.length} mapped values applied from {appliedImport.sourceName}. The original file will be attached when the order is created.
            </div>
          )}

          {importAnalysis && (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <InfoRow label="Source" value={`${importAnalysis.sourceType} - ${importAnalysis.sourceName}`} />
                <InfoRow label="Confidence" value={`${Math.round(importAnalysis.confidence * 100)}%`} />
                <InfoRow label="Mapped" value={`${acceptedImportCount}/${importAnalysis.fields.length}`} />
                <InfoRow label="Duplicates" value={importAnalysis.duplicates.length ? `${importAnalysis.duplicates.length} possible` : "None found"} />
              </div>

              {(importAnalysis.errors.length > 0 || importAnalysis.warnings.length > 0 || importAnalysis.duplicates.length > 0) && (
                <div className="grid gap-2">
                  {importAnalysis.errors.map((error) => <div key={error} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>)}
                  {importAnalysis.warnings.map((warning) => <div key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</div>)}
                  {importAnalysis.duplicates.map((duplicate) => (
                    <div key={duplicate.orderId} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800">
                      Possible duplicate: {duplicate.fileNumber} - {duplicate.borrower} - {duplicate.matchReason} match
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-md border border-line">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <div className="text-sm font-semibold text-slate-950">Review mapped values</div>
                  <span className="text-xs text-slate-500">Accept, correct, ignore, or remap</span>
                </div>
                <ImportMappingRows fields={primaryImportFields} draft={mappingDraft} onChange={updateMappingDraft} />
                {additionalImportFields.length > 0 && (
                  <details className="border-t border-line">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">Advanced mappings ({additionalImportFields.length})</summary>
                    <ImportMappingRows fields={additionalImportFields} draft={mappingDraft} onChange={updateMappingDraft} />
                  </details>
                )}
              </div>

              <details className="rounded-md border border-line bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">Saved mapping templates</summary>
                <div className="mt-3 grid gap-2 text-sm">
                  {importTemplates.map((savedTemplate) => (
                    <div key={savedTemplate.id} className="rounded-md border border-line bg-white px-3 py-2">
                      <div className="font-medium text-slate-900">{savedTemplate.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{savedTemplate.sourceType} - {savedTemplate.columns.length} column mappings - {savedTemplate.updatedAt}</div>
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="primary-button" disabled={importAnalysis.errors.length > 0} onClick={applyImportToForm}><ClipboardCheck className="h-4 w-4" /> Apply to form</button>
                <button type="button" className="secondary-button" onClick={saveCurrentMappingTemplate}><Save className="h-4 w-4" /> Save mapping template</button>
              </div>
            </div>
          )}
        </section>
        <div className="mt-5 grid gap-5">
          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Building2 className="h-4 w-4 text-brand-600" /> Client and Product</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Client"><select name="client" className="control w-full" defaultValue={prefillValue("client", clients[0])}>{clientOptions.map((client) => <option key={client}>{client}</option>)}</select></Field>
              <Field label="Lender contact"><input name="lender_contact" className="control w-full" defaultValue={prefillValue("lender_contact", "Direct Lender - Mallory Chen")} /></Field>
              <Field label="Product type"><select name="product_type" className="control w-full" defaultValue={prefillValue("product_type", productTypes[0])}>{productOptions.map((product) => <option key={product}>{product}</option>)}</select></Field>
              <Field label="Loan type">
                <select name="loan_type" className="control w-full" defaultValue={prefillValue("loan_type", "Conventional")}>
                  {loanTypeOptions.map((loanType) => <option key={loanType}>{loanType}</option>)}
                </select>
              </Field>
              <Field label="Due date"><input name="due_date" className="control w-full" type="date" defaultValue={prefillValue("due_date", "2026-07-07")} /></Field>
              <Field label="Priority">
                <select name="priority" className="control w-full" defaultValue={prefillValue("priority", "Standard")}>
                  <option>Standard</option>
                  <option>Watch</option>
                  <option>High</option>
                  <option>Rush</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Home className="h-4 w-4 text-brand-600" /> Borrower and Property</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Borrower"><input name="borrower" className="control w-full" defaultValue={prefillValue("borrower")} placeholder="Borrower name" /></Field>
              <Field label="Contact name"><input name="contact_name" className="control w-full" defaultValue={prefillValue("contact_name")} placeholder="Listing agent, borrower, or tenant" /></Field>
              <Field label="Property address" span><input name="property_address" className="control w-full" defaultValue={prefillValue("property_address")} placeholder="Street address" /></Field>
              <Field label="City"><input name="city" className="control w-full" defaultValue={prefillValue("city")} placeholder="City" /></Field>
              <Field label="State / ZIP"><input name="state_zip" className="control w-full" defaultValue={stateZipValue} placeholder="GA 30064" /></Field>
              <Field label="County"><input name="county" className="control w-full" defaultValue={prefillValue("county")} placeholder="County" /></Field>
              <Field label="Phone"><input name="phone" className="control w-full" defaultValue={prefillValue("phone")} placeholder="(555) 010-0123" /></Field>
              <Field label="Contact / access info" span><textarea name="access_info" className="control min-h-24 w-full py-3" defaultValue={prefillValue("access_info")} placeholder="Gate codes, lockbox, inspection windows, occupant instructions" /></Field>
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><ReceiptText className="h-4 w-4 text-brand-600" /> Fees and Assignment</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Fee"><input name="fee" className="control w-full" defaultValue={prefillValue("fee", "650")} inputMode="numeric" /></Field>
              <Field label="Tech fee"><input name="tech_fee" className="control w-full" defaultValue={prefillValue("tech_fee", "35")} inputMode="numeric" /></Field>
              <Field label="Assignment preference">
                <select name="assignment_preference" className="control w-full">
                  <option>Best workload fit</option>
                  <option>Preferred appraiser</option>
                  <option>County specialist</option>
                  <option>Manual assignment</option>
                </select>
              </Field>
              <Field label="Preferred appraiser">
                <select name="preferred_appraiser" className="control w-full">
                  <option>CAS recommendation</option>
                  {appraisers.map((appraiser) => <option key={appraiser.id}>{appraiser.name}</option>)}
                </select>
              </Field>
              <Field label="Internal notes" span><textarea name="notes" className="control min-h-24 w-full py-3" defaultValue={prefillValue("notes", prefillValue("special_instructions"))} placeholder="Client rules, fee exception, underwriting sensitivity, risk flags" /></Field>
            </div>
          </section>

          <section className="rounded-md border border-dashed border-brand-200 bg-brand-50/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UploadCloud className="h-4 w-4 text-brand-600" /> Import source and order documents</div>
                <p className="mt-1 text-sm text-slate-500">The confirmed import file is preserved with the order. Supporting documents can still be uploaded after creation.</p>
              </div>
            </div>
            {appliedImport ? (
              <div className="mt-4 grid gap-3 rounded-md border border-line bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-950">
                    {appliedImport.sourceType === "CSV" ? <TableProperties className="h-4 w-4 text-brand-600" /> : <FileText className="h-4 w-4 text-brand-600" />}
                    {appliedImport.sourceName}
                  </div>
                  <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">{Math.round(appliedImport.confidence * 100)}% confidence</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {appliedImport.fields.slice(0, 8).map((field) => (
                    <div key={`${field.key}-${field.value}`} className="rounded-md border border-line px-3 py-2">
                      <div className="text-xs text-slate-500">{field.label}</div>
                      <div className="mt-1 truncate font-medium text-slate-900">{field.value}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500">
                  Mapping history will be written to the audit trail. Duplicate candidates: {appliedImport.duplicates.length || "none"}.
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-line bg-white p-3 text-sm text-slate-500">
                No import has been applied. Use Import Order above when a lender or client sends a PDF, engagement letter, CSV, or spreadsheet export.
              </div>
            )}
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><SlidersHorizontal className="h-4 w-4 text-brand-600" /> Template Fields Used for Future Orders</div>
            <div className="mt-4 grid gap-4">
              {visibleSections.map((section) => (
                <div key={section.id} className="rounded-md border border-line bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <Field key={field.id} label={`${field.label}${field.required ? " *" : ""}`} span={field.type === "textarea" || field.type === "upload"}>
                        <TemplateFieldPreview field={field} />
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button type="button" className="primary-button" onClick={() => createOrder(orderKind)}><CheckCircle2 className="h-4 w-4" /> Create order</button>
          <button type="button" className="secondary-button" onClick={() => createOrder("internal")}><UserCheck className="h-4 w-4" /> Save and assign</button>
          {appliedImport && <span className="text-sm text-slate-500">Using reviewed values from {appliedImport.sourceName}.</span>}
        </div>
      </form>
      <aside className="grid content-start gap-5">
        <div className="panel p-5">
          <SectionHeader icon={SlidersHorizontal} title="Customize Intake" />
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
            <div className="font-semibold text-slate-900">{canCustomize ? "Template editing enabled" : "View-only template"}</div>
            <div className="mt-1 text-slate-500">{canCustomize ? "Changes are saved in this session and used for the next new order." : "Company admins and solo appraisers can customize intake sections."}</div>
          </div>
          <div className="mt-4 space-y-3">
            {template.sections.map((section, index) => (
              <div key={section.id} className="rounded-md border border-line p-3">
                <input
                  className="control h-9 w-full"
                  value={section.title}
                  disabled={!canCustomize}
                  onChange={(event) => renameSection(section.id, event.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" disabled={!canCustomize || index === 0} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => moveSection(section.id, -1)}>Up</button>
                  <button type="button" disabled={!canCustomize || index === template.sections.length - 1} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => moveSection(section.id, 1)}>Down</button>
                  <button type="button" disabled={!canCustomize} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => toggleSection(section.id)}>{section.hidden ? "Show" : "Hide"}</button>
                  <button type="button" disabled={!canCustomize} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => addCustomField(section.id)}>Add field</button>
                  <button type="button" disabled={!canCustomize || template.sections.length <= 1} className="secondary-button h-8 px-2 text-xs disabled:opacity-50" onClick={() => removeSection(section.id)}>Delete</button>
                </div>
                <div className="mt-2 text-xs text-slate-500">{section.fields.length} fields - {section.hidden ? "hidden" : "visible"}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!canCustomize} className="secondary-button disabled:opacity-50" onClick={addSection}><Plus className="h-4 w-4" /> Add section</button>
            <button type="button" disabled={!canCustomize} className="secondary-button disabled:opacity-50" onClick={onRestoreTemplate}><Sparkles className="h-4 w-4" /> Restore default</button>
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={Sparkles} title="Intake Intelligence" />
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Auto-fill", appliedImport ? `${appliedImport.fields.length} fields filled from ${appliedImport.sourceType}` : "Borrower, address, client, product, and fee fields"],
              ["Complexity", "Flag rural, luxury, acreage, FHA, VA, and repair risk"],
              ["Assignment", "Recommend appraiser by coverage, workload, and revision rate"],
              ["Documents", "Detect missing engagement letter, contract, W-9, or E&O"]
            ].map(([label, body]) => (
              <div key={label} className="rounded-md border border-line p-3">
                <div className="font-semibold text-slate-900">{label}</div>
                <div className="mt-1 text-slate-500">{body}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <SectionHeader icon={UserCheck} title="Assignment Preview" />
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-900">Recommended</span>
              <span className="text-slate-500">{appraisers[0].activeOrders}/{appraisers[0].capacity} active</span>
            </div>
            <div className="mt-1 text-slate-600">{appraisers[0].name}</div>
            <div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${workloadPercent(appraisers[0])}%` }} /></div>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <InfoRow label="Starting status" value="New" />
            <InfoRow label="After assignment" value="Assigned" />
            <InfoRow label="Default reviewer" value={reviewers[0].name} />
          </div>
        </div>
      </aside>
    </section>
  );
}

type OrderImportDraft = Record<string, { decision: OrderImportDecision; mappedTo: string; value: string }>;

function ImportMappingRows({
  fields,
  draft,
  onChange
}: {
  fields: OrderImportField[];
  draft: OrderImportDraft;
  onChange: (fieldId: string, patch: Partial<OrderImportDraft[string]>) => void;
}) {
  if (!fields.length) {
    return <div className="px-3 py-4 text-sm text-slate-500">No extracted values in this group.</div>;
  }

  return (
    <div className="divide-y divide-line">
      {fields.map((field) => {
        const current = draft[field.id] ?? {
          decision: field.decision ?? "accept",
          mappedTo: String(field.mappedTo ?? field.key),
          value: field.value
        };
        const lowConfidence = field.confidence < 0.72 || field.status === "low_confidence";
        const isIgnored = current.decision === "ignore";

        return (
          <div key={field.id} className="grid gap-3 p-3 lg:grid-cols-[minmax(150px,1fr)_minmax(200px,1.4fr)_170px_140px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-950">{field.sourceLabel ?? field.label}</div>
                <span className={`chip ${lowConfidence ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {lowConfidence && <AlertTriangle className="h-3 w-3" />}
                  {Math.round(field.confidence * 100)}%
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">Proposed CAS field: {field.label}</div>
            </div>

            <input
              className="control w-full"
              disabled={isIgnored}
              value={current.value}
              onChange={(event) => onChange(field.id, { value: event.target.value, decision: current.decision === "accept" ? "correct" : current.decision })}
            />

            <select
              className="control w-full"
              disabled={isIgnored}
              value={current.mappedTo}
              onChange={(event) => onChange(field.id, { mappedTo: event.target.value, decision: "remap" })}
            >
              {orderImportFieldDefinitions.map((definition) => (
                <option key={definition.key} value={definition.key}>{definition.label}</option>
              ))}
            </select>

            <select
              className="control w-full"
              value={current.decision}
              onChange={(event) => onChange(field.id, { decision: event.target.value as OrderImportDecision })}
            >
              <option value="accept">Accept</option>
              <option value="correct">Correct</option>
              <option value="remap">Remap</option>
              <option value="ignore">Ignore</option>
            </select>
          </div>
        );
      })}
    </div>
  );
}
