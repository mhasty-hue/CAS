"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, Home, Mail, Phone, Send } from "lucide-react";
import { organizations, publicOrderSettings } from "@/data/platform";
import { createPendingPublicOrderRequest } from "@/lib/public-intake/service";
import type { PublicOrderPurpose, PublicOrderRequest } from "@/types/domain";
import { Field } from "./shared";

const purposeOptions: PublicOrderPurpose[] = [
  "Estate",
  "Divorce",
  "Tax appeal",
  "Pre-listing",
  "Purchase",
  "Refinance",
  "PMI removal",
  "Litigation",
  "Financial planning",
  "Date-of-death appraisal",
  "Other"
];

export function PublicOrderPage({ organizationSlug }: { organizationSlug: string }) {
  const settings = publicOrderSettings.find((item) => item.publicSlug === organizationSlug);
  const organization = organizations.find((item) => item.id === settings?.organizationId);
  const [submittedRequest, setSubmittedRequest] = useState<PublicOrderRequest | null>(null);
  const [form, setForm] = useState({
    requesterName: "",
    email: "",
    phone: "",
    propertyAddress: "",
    propertyType: "Single family",
    purpose: "Estate" as PublicOrderPurpose,
    intendedUse: "",
    ownerBorrowerName: "",
    accessContact: "",
    preferredContactMethod: "Email" as "Email" | "Phone" | "Text",
    requestedTiming: "As soon as practical",
    comments: "",
    consentAccepted: false,
    documentCount: 0
  });

  const copyableButton = useMemo(() => {
    const url = `/order/${settings?.publicSlug ?? organizationSlug}`;
    return `<a href="${url}" style="background:${settings?.brandColor ?? "#2276d2"};color:white;padding:10px 14px;border-radius:8px;text-decoration:none;">${settings?.buttonLabel ?? "Order an appraisal"}</a>`;
  }, [organizationSlug, settings]);

  if (!settings || !organization || !settings.enabled) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-10">
        <section className="mx-auto max-w-2xl rounded-lg border border-line bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-950">Public ordering unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">This appraisal organization has not enabled public order requests.</p>
        </section>
      </main>
    );
  }

  const organizationId = organization.id;
  const confirmationMessage = settings.confirmationMessage;

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedRequest(createPendingPublicOrderRequest({ organizationId, ...form }));
  }

  if (submittedRequest) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-10">
        <section className="mx-auto max-w-2xl rounded-lg border border-line bg-white p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">Request received</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{confirmationMessage}</p>
          <div className="mt-5 rounded-md border border-line bg-slate-50 p-4 text-left text-sm">
            <div className="font-semibold text-slate-900">{submittedRequest.propertyAddress}</div>
            <div className="mt-1 text-slate-600">{submittedRequest.purpose} appraisal request from {submittedRequest.requesterName}</div>
            <div className="mt-2 text-xs text-slate-500">Reference: {submittedRequest.id}</div>
          </div>
          <Link href="/" className="secondary-button mt-5 inline-flex">Return to CAS demo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.86fr_1.14fr]">
        <aside className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-md text-white" style={{ backgroundColor: settings.brandColor }}>
            <Home className="h-5 w-5" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold">{settings.brandName}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Request an appraisal review without lender-specific fields. Staff will confirm scope, timing, fee, and any missing professional details before opening the full order.
          </p>
          <div className="mt-6 rounded-md border border-line bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Copyable order button</div>
            <textarea className="control mt-2 min-h-24 w-full py-3 font-mono text-xs" readOnly value={copyableButton} />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {organization.email}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {organization.phone}</div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-semibold">Order appraisal help</h2>
              <p className="mt-1 text-sm text-slate-500">Simple intake for private clients, attorneys, lenders, and property owners.</p>
            </div>
            <span className="chip border-brand-200 bg-brand-50 text-brand-700">Public request</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Requester name"><input className="control w-full" required value={form.requesterName} onChange={(event) => updateField("requesterName", event.target.value)} /></Field>
            <Field label="Email"><input className="control w-full" required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></Field>
            <Field label="Phone"><input className="control w-full" required value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></Field>
            <Field label="Preferred contact">
              <select className="control w-full" value={form.preferredContactMethod} onChange={(event) => updateField("preferredContactMethod", event.target.value as "Email" | "Phone" | "Text")}>
                <option>Email</option>
                <option>Phone</option>
                <option>Text</option>
              </select>
            </Field>
            <Field label="Property address" span><input className="control w-full" required value={form.propertyAddress} onChange={(event) => updateField("propertyAddress", event.target.value)} /></Field>
            <Field label="Property type">
              <select className="control w-full" value={form.propertyType} onChange={(event) => updateField("propertyType", event.target.value)}>
                <option>Single family</option>
                <option>Condo</option>
                <option>Townhome</option>
                <option>Multi-unit</option>
                <option>Vacant land</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Purpose">
              <select className="control w-full" value={form.purpose} onChange={(event) => updateField("purpose", event.target.value as PublicOrderPurpose)}>
                {purposeOptions.map((purpose) => <option key={purpose}>{purpose}</option>)}
              </select>
            </Field>
            <Field label="Intended use"><input className="control w-full" value={form.intendedUse} onChange={(event) => updateField("intendedUse", event.target.value)} /></Field>
            <Field label="Owner/borrower name"><input className="control w-full" value={form.ownerBorrowerName} onChange={(event) => updateField("ownerBorrowerName", event.target.value)} /></Field>
            <Field label="Access contact"><input className="control w-full" value={form.accessContact} onChange={(event) => updateField("accessContact", event.target.value)} /></Field>
            <Field label="Requested timing"><input className="control w-full" value={form.requestedTiming} onChange={(event) => updateField("requestedTiming", event.target.value)} /></Field>
            {settings.customQuestions.map((question) => (
              <Field key={question.id} label={question.label} span><input className="control w-full" required={question.required} /></Field>
            ))}
            <Field label="Additional comments" span><textarea className="control min-h-24 w-full py-3" value={form.comments} onChange={(event) => updateField("comments", event.target.value)} /></Field>
            <Field label="Documents" span>
              <button type="button" className="secondary-button justify-center" onClick={() => updateField("documentCount", form.documentCount + 1)}>
                <FileUp className="h-4 w-4" />
                Add document placeholder ({form.documentCount})
              </button>
            </Field>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-md border border-line p-3 text-sm text-slate-600">
            <input className="mt-1 h-4 w-4 rounded border-line text-brand-600" type="checkbox" required checked={form.consentAccepted} onChange={(event) => updateField("consentAccepted", event.target.checked)} />
            <span>I understand this is a request for appraisal services, not a confirmed assignment, and the appraisal organization will review scope, fee, and access before accepting work.</span>
          </label>
          <button className="primary-button mt-5 justify-center" type="submit"><Send className="h-4 w-4" /> Submit request</button>
        </form>
      </section>
    </main>
  );
}
