import { useEffect, useState } from "react";
import { Building2, ListChecks, Plus, Users2 } from "lucide-react";
import type { ClientProfile, Order, PortalUser } from "@/types/domain";
import { canManageClients } from "@/lib/permissions";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Field, SectionHeader, SimpleFoundationView, StatusChip, TableHeader } from "./shared";

export function ClientsView({
  user,
  clientList,
  orderList,
  onAddClient,
  onUpdateClient
}: {
  user: PortalUser;
  clientList: ClientProfile[];
  orderList: Order[];
  onAddClient: () => void;
  onUpdateClient: (clientId: string, patch: Partial<ClientProfile>) => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState(clientList[0]?.id ?? "");
  const selectedClient = clientList.find((client) => client.id === selectedClientId) ?? clientList[0];
  const canManage = canManageClients(user);
  const history = selectedClient ? orderList.filter((order) => order.client === selectedClient.name) : [];

  useEffect(() => {
    if (!clientList.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(clientList[0]?.id ?? "");
    }
  }, [clientList, selectedClientId]);

  if (!selectedClient) {
    return <SimpleFoundationView icon={Building2} title="Clients" items={["No clients yet."]} />;
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="panel overflow-hidden">
        <TableHeader title="Clients" icon={Building2} />
        <div className="p-4">
          <button className="primary-button w-full justify-center disabled:opacity-50" disabled={!canManage} onClick={onAddClient}><Plus className="h-4 w-4" /> Add client</button>
        </div>
        <div className="divide-y divide-line">
          {clientList.map((client) => (
            <button key={client.id} className={cn("block w-full px-4 py-3 text-left text-sm hover:bg-slate-50", selectedClient.id === client.id && "bg-brand-50")} onClick={() => setSelectedClientId(client.id)}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{client.name}</span>
                <span className={cn("chip", client.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{client.status}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{client.defaultTurnDays}d turn - {client.contacts.length} contacts</div>
            </button>
          ))}
        </div>
      </aside>
      <div className="grid gap-5">
        <div className="panel p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-950">{selectedClient.name}</h2>
                <span className={cn("chip", selectedClient.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{selectedClient.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{history.length} orders - {formatCurrency(history.reduce((total, order) => total + order.fee, 0))} lifetime demo volume</p>
            </div>
            <button
              className="secondary-button disabled:opacity-50"
              disabled={!canManage}
              onClick={() => onUpdateClient(selectedClient.id, { status: selectedClient.status === "Active" ? "Inactive" : "Active" })}
            >
              {selectedClient.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Default turn time">
              <input className="control w-full" type="number" value={selectedClient.defaultTurnDays} disabled={!canManage} onChange={(event) => onUpdateClient(selectedClient.id, { defaultTurnDays: Number(event.target.value) })} />
            </Field>
            {selectedClient.defaultFees.slice(0, 2).map((fee, index) => (
              <Field key={fee.productType} label={`${fee.productType} fee`}>
                <input
                  className="control w-full"
                  type="number"
                  value={fee.fee}
                  disabled={!canManage}
                  onChange={(event) => {
                    const defaultFees = selectedClient.defaultFees.map((item, itemIndex) => itemIndex === index ? { ...item, fee: Number(event.target.value) } : item);
                    onUpdateClient(selectedClient.id, { defaultFees });
                  }}
                />
              </Field>
            ))}
            <Field label="Client notes" span>
              <textarea className="control min-h-24 w-full py-3" value={selectedClient.notes} disabled={!canManage} onChange={(event) => onUpdateClient(selectedClient.id, { notes: event.target.value })} />
            </Field>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel p-5">
            <SectionHeader icon={Users2} title="Client Contacts" />
            <div className="mt-4 space-y-3">
              {selectedClient.contacts.map((contact) => (
                <div key={contact.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="font-semibold text-slate-900">{contact.name}</div>
                  <div className="text-slate-500">{contact.title}</div>
                  <div className="mt-2 text-xs text-slate-500">{contact.email} - {contact.phone}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <SectionHeader icon={ListChecks} title="Order History" />
            <div className="mt-4 space-y-3">
              {(history.length ? history : orderList.slice(0, 3)).map((order) => (
                <div key={order.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{order.fileNumber}</span><StatusChip status={order.status} /></div>
                  <div className="mt-1 text-slate-500">{order.productType} - {formatCurrency(order.fee)} - due {formatDate(order.dueDate)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


