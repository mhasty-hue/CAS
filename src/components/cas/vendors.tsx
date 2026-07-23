import { useState } from "react";
import { MapPin, Search, Send, ShieldCheck, UserCheck } from "lucide-react";
import type { PortalUser, VendorDocument, VendorProfile } from "@/types/domain";
import { canInviteVendors } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { MetricTile, SectionHeader, TableHeader } from "./shared";

export function VendorInvitesView({ vendors, onInviteVendor }: { vendors: VendorProfile[]; onInviteVendor: () => void }) {
  const invited = vendors.filter((vendor) => ["Invited", "Pending documents", "Under review"].includes(vendor.status));
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <SectionHeader icon={UserCheck} title="Vendor Invites" />
        <div className="mt-4 grid gap-3">
          {invited.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={Send} title="Invite Vendor" />
        <div className="mt-4 grid gap-3">
          <input className="control" defaultValue="New appraisal company" />
          <input className="control" defaultValue="vendor@example.com" />
          <button className="primary-button justify-center" onClick={onInviteVendor}><Send className="h-4 w-4" /> Send invite</button>
        </div>
      </aside>
    </section>
  );
}



export function ComplianceView({ vendors, vendorDocuments, onDocumentStatusChange }: { vendors: VendorProfile[]; vendorDocuments: VendorDocument[]; onDocumentStatusChange: (vendorId: string, documentType: VendorDocument["type"], status: VendorDocument["status"]) => void }) {
  return (
    <section className="panel overflow-hidden">
      <TableHeader title="Vendor Compliance" icon={ShieldCheck} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500"><tr><th className="px-5 py-3">Vendor</th><th className="px-5 py-3">Document</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Uploaded</th><th className="px-5 py-3">Update</th></tr></thead>
          <tbody className="divide-y divide-line">
            {vendorDocuments.map((document) => {
              const vendor = vendors.find((candidate) => candidate.id === document.vendorId);
              return (
                <tr key={document.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">{vendor?.company ?? document.vendorId}</td>
                  <td className="px-5 py-4 text-slate-700">{document.type}</td>
                  <td className="px-5 py-4"><span className="chip border-slate-200 bg-slate-50 text-slate-700">{document.status}</span></td>
                  <td className="px-5 py-4 text-slate-600">{document.uploadedAt}</td>
                  <td className="px-5 py-4">
                    <select className="control h-9" value={document.status} onChange={(event) => onDocumentStatusChange(document.vendorId, document.type, event.target.value as VendorDocument["status"])}>
                      <option>Approved</option>
                      <option>Missing</option>
                      <option>Expired</option>
                      <option>Needs review</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}



export function VendorView({ vendors, vendorDocuments, user, onInviteVendor }: { vendors: VendorProfile[]; vendorDocuments: VendorDocument[]; user: PortalUser; onInviteVendor: () => void }) {
  const [county, setCounty] = useState("Cobb");
  const [product, setProduct] = useState("All products");
  const filteredVendors = vendors.filter((vendor) =>
    vendor.coverage.includes(county) &&
    (product === "All products" || vendor.specialties.some((specialty) => product.includes(specialty) || specialty.includes(product.replace(" 1004", ""))))
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="panel p-5">
        <SectionHeader icon={MapPin} title="Vendor Search" />
        <div className="mt-4 grid gap-3">
          <input className="control" defaultValue="Marietta, GA 30064" />
          <select className="control"><option>Within 25 miles</option><option>Within 50 miles</option><option>County coverage</option></select>
          <select className="control" value={county} onChange={(event) => setCounty(event.target.value)}><option>Cobb</option><option>Fulton</option><option>Cherokee</option><option>DeKalb</option><option>Gwinnett</option></select>
          <select className="control" value={product} onChange={(event) => setProduct(event.target.value)}><option>All products</option><option>FHA</option><option>VA</option><option>Luxury</option><option>Rural</option><option>Review</option></select>
          <button className="primary-button justify-center"><Search className="h-4 w-4" /> Search vendors</button>
          {canInviteVendors(user) && <button className="secondary-button justify-center" onClick={onInviteVendor}><UserCheck className="h-4 w-4" /> Invite vendor</button>}
        </div>
        <div className="mt-5 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">
          Vendors must be invited by an AMC or firm admin before they can submit compliance documents.
        </div>
      </aside>
      <div className="grid gap-4">
        {filteredVendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} vendorDocuments={vendorDocuments.filter((document) => document.vendorId === vendor.id)} />)}
      </div>
    </section>
  );
}



export function VendorCard({ vendor, vendorDocuments = [] }: { vendor: VendorProfile; vendorDocuments?: VendorDocument[] }) {
  const currentDocs = Object.values(vendor.documents).filter((status) => status === "Current").length;
  return (
    <article className="panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{vendor.company}</h3><span className="chip border-slate-200 bg-slate-50 text-slate-700">{vendor.status}</span></div>
          <p className="mt-1 text-sm text-slate-500">{vendor.contact} - {vendor.distance} miles - {vendor.coverage.join(", ")}</p>
          <p className="mt-1 text-xs text-slate-500">{vendor.officeAddress ?? "Office address pending"} - radius {vendor.radiusMiles ?? 25} miles - ZIPs {(vendor.coverageZips ?? ["30064", "30339"]).join(", ")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{vendor.specialties.map((tag) => <span key={tag} className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700 ring-1 ring-brand-100">{tag}</span>)}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <div>Roster: {(vendor.roster ?? [vendor.contact]).join(", ")}</div>
            <div>Rating: {vendor.rating ? `${vendor.rating.toFixed(1)} / 5` : "Pending performance"}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <MetricTile label="Turn" value={`${vendor.turnTime}d`} />
          <MetricTile label="Workload" value={`${vendor.workload ?? Math.max(1, vendor.capacity - 5)}/${vendor.capacity}`} />
          <MetricTile label="Docs" value={currentDocs + "/3"} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-line p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Compliance documents</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendorDocuments.length ? vendorDocuments.map((document) => <span key={document.id} className="chip border-slate-200 bg-slate-50 text-slate-700">{document.type}: {document.status}</span>) : <span className="text-sm text-slate-500">No document records yet.</span>}
          </div>
        </div>
        <div className="rounded-md border border-line p-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Fee sheet</div>
          <div className="mt-2 grid gap-1 text-sm text-slate-600">
            {(vendor.feeSheet ?? [{ product: "1004 URAR", fee: 575, turnDays: vendor.turnTime }]).map((fee) => (
              <div key={fee.product} className="flex items-center justify-between gap-3"><span>{fee.product}</span><span>{formatCurrency(fee.fee)} / {fee.turnDays}d</span></div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
