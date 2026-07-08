import { Building2, CheckCircle2, Home, Plus, ReceiptText, SlidersHorizontal, Sparkles, UploadCloud, UserCheck } from "lucide-react";
import { appraisers, clients, productTypes, reviewers } from "@/data/demo";
import type { OrderFormTemplate, Organization, PortalUser } from "@/types/domain";
import { canCustomizeOrderForms } from "@/lib/permissions";
import { roleLabel } from "./config";
import { Field, InfoRow, SectionHeader, TemplateFieldPreview } from "./shared";
import { workloadPercent } from "./orders";

export function NewOrderView({
  user,
  organization,
  template,
  onTemplateChange,
  onRestoreTemplate,
  onCreateOrder
}: {
  user: PortalUser;
  organization: Organization;
  template: OrderFormTemplate;
  onTemplateChange: (template: OrderFormTemplate) => void;
  onRestoreTemplate: () => void;
  onCreateOrder: (kind: "internal" | "client" | "amc", templateName?: string) => void;
}) {
  const orderKind = organization.type === "amc" ? "amc" : user.role === "client_user" ? "client" : "internal";
  const visibleSections = template.sections.filter((section) => !section.hidden);
  const canCustomize = canCustomizeOrderForms(user);

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
      <form className="panel p-5">
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
        <div className="mt-5 grid gap-5">
          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Building2 className="h-4 w-4 text-brand-600" /> Client and Product</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Client"><select className="control w-full">{clients.map((client) => <option key={client}>{client}</option>)}</select></Field>
              <Field label="Lender contact"><input className="control w-full" defaultValue="Direct Lender - Mallory Chen" /></Field>
              <Field label="Product type"><select className="control w-full">{productTypes.map((product) => <option key={product}>{product}</option>)}</select></Field>
              <Field label="Loan type">
                <select className="control w-full">
                  {["Conventional", "FHA", "VA", "USDA", "Jumbo", "HELOC", "Portfolio"].map((loanType) => <option key={loanType}>{loanType}</option>)}
                </select>
              </Field>
              <Field label="Due date"><input className="control w-full" type="date" defaultValue="2026-07-07" /></Field>
              <Field label="Priority">
                <select className="control w-full">
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
              <Field label="Borrower"><input className="control w-full" placeholder="Borrower name" /></Field>
              <Field label="Contact name"><input className="control w-full" placeholder="Listing agent, borrower, or tenant" /></Field>
              <Field label="Property address" span><input className="control w-full" placeholder="Street address" /></Field>
              <Field label="City"><input className="control w-full" placeholder="City" /></Field>
              <Field label="State / ZIP"><input className="control w-full" placeholder="GA 30064" /></Field>
              <Field label="County"><input className="control w-full" placeholder="County" /></Field>
              <Field label="Phone"><input className="control w-full" placeholder="(555) 010-0123" /></Field>
              <Field label="Contact / access info" span><textarea className="control min-h-24 w-full py-3" placeholder="Gate codes, lockbox, inspection windows, occupant instructions" /></Field>
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><ReceiptText className="h-4 w-4 text-brand-600" /> Fees and Assignment</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Fee"><input className="control w-full" defaultValue="650" inputMode="numeric" /></Field>
              <Field label="Tech fee"><input className="control w-full" defaultValue="35" inputMode="numeric" /></Field>
              <Field label="Assignment preference">
                <select className="control w-full">
                  <option>Best workload fit</option>
                  <option>Preferred appraiser</option>
                  <option>County specialist</option>
                  <option>Manual assignment</option>
                </select>
              </Field>
              <Field label="Preferred appraiser">
                <select className="control w-full">
                  <option>CAS recommendation</option>
                  {appraisers.map((appraiser) => <option key={appraiser.id}>{appraiser.name}</option>)}
                </select>
              </Field>
              <Field label="Internal notes" span><textarea className="control min-h-24 w-full py-3" placeholder="Client rules, fee exception, underwriting sensitivity, risk flags" /></Field>
            </div>
          </section>

          <section className="rounded-md border border-dashed border-brand-200 bg-brand-50/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><UploadCloud className="h-4 w-4 text-brand-600" /> Document Upload Placeholder</div>
                <p className="mt-1 text-sm text-slate-500">Engagement letter, purchase contract, exhibits, lender instructions, prior appraisal, and supporting files.</p>
              </div>
              <button type="button" className="secondary-button"><UploadCloud className="h-4 w-4" /> Add documents</button>
            </div>
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
          <button type="button" className="primary-button" onClick={() => onCreateOrder(orderKind, template.name)}><CheckCircle2 className="h-4 w-4" /> Create order</button>
          <button type="button" className="secondary-button"><Sparkles className="h-4 w-4" /> Parse order PDF</button>
          <button type="button" className="secondary-button" onClick={() => onCreateOrder("internal", template.name)}><UserCheck className="h-4 w-4" /> Save and assign</button>
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
              ["Auto-fill", "Borrower, address, client, product, and fee fields"],
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

