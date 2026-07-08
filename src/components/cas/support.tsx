import { Archive, Bell, Download, FileCheck2, MessageSquare, Send, UploadCloud } from "lucide-react";
import { notifications } from "@/data/demo";
import type { Order, PortalUser } from "@/types/domain";
import { SectionHeader } from "./shared";

export function DocumentsView({ orderList }: { orderList: Order[] }) {
  const docs = orderList.flatMap((order) => order.documentsList.map((document) => `${order.fileNumber} - ${document.name} - ${document.status}`));
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <SectionHeader icon={Archive} title="Documents" />
        <div className="mt-4 grid gap-3">
          {(docs.length ? docs : ["No scoped documents yet."]).map((item) => <div key={item} className="rounded-md border border-line px-4 py-3 text-sm text-slate-700">{item}</div>)}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={UploadCloud} title="Upload Placeholder" />
        <div className="mt-4 rounded-md border border-dashed border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          Upload report, engagement package, license, E&O, W-9, or client document placeholder.
        </div>
      </aside>
    </section>
  );
}



export function MessagesView({ orderList, user, onAddNote }: { orderList: Order[]; user: PortalUser; onAddNote: (orderId: string) => void }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="panel p-5">
        <SectionHeader icon={MessageSquare} title="Messages and Revision Requests" />
        <div className="mt-4 grid gap-3">
          {orderList.slice(0, 6).map((order) => (
            <div key={order.id} className="rounded-md border border-line px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{order.fileNumber} - {order.borrower}</span>
                <button className="secondary-button h-8 px-2 text-xs" onClick={() => onAddNote(order.id)}>Send message</button>
              </div>
              <div className="mt-2 text-slate-600">{order.clientComments[0]?.body ?? "No client-facing messages yet."}</div>
            </div>
          ))}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={Send} title="New Message" />
        <textarea className="control mt-4 min-h-32 w-full py-3" defaultValue={`Message from ${user.name}: Please confirm the latest order status.`} />
      </aside>
    </section>
  );
}



export function ReportsView({ orderList }: { orderList: Order[] }) {
  const reportOrders = orderList.filter((order) => ["Ready for Delivery", "Delivered", "Completed"].includes(order.status));
  return (
    <section className="panel p-5">
      <SectionHeader icon={FileCheck2} title="Completed Reports" />
      <div className="mt-4 grid gap-3">
        {(reportOrders.length ? reportOrders : orderList.slice(0, 3)).map((order) => (
          <div key={order.id} className="flex flex-col gap-3 rounded-md border border-line px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium text-slate-900">{order.fileNumber} - {order.borrower}</div>
              <div className="mt-1 text-slate-500">{order.address}, {order.city} - {order.status}</div>
            </div>
            <button className="secondary-button"><Download className="h-4 w-4" /> Download report</button>
          </div>
        ))}
      </div>
    </section>
  );
}



export function NotificationsView() {
  return (
    <section className="panel p-5">
      <SectionHeader icon={Bell} title="Notifications" />
      <div className="mt-4 grid gap-3">
        {notifications.map((item) => (
          <div key={item.id} className="rounded-md border border-line p-3">
            <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{item.title}</span><span className="text-xs text-slate-400">{item.time}</span></div>
            <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


