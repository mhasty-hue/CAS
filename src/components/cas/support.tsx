import { useState } from "react";
import { Bell, CheckCircle2, Download, FileCheck2, MessageSquare, ShieldCheck } from "lucide-react";
import { notifications } from "@/data/demo";
import type { DeliveryRecord, DocumentAuditEvent, ManagedDocument, MessageChannel, Order, OrderMessage, PortalUser, ReportSubmission, RequiredDocumentRule, VendorDocument } from "@/types/domain";
import { formatDate } from "@/lib/utils";
import { DocumentsDashboard } from "./documents/dashboard";
import { OrderConversationPanel } from "./messages/conversation";
import { SectionHeader } from "./shared";

export function DocumentsView({
  orderList,
  user,
  documents,
  requiredRules,
  vendorDocuments,
  reportSubmissions,
  deliveryRecords,
  auditEvents
}: {
  orderList: Order[];
  user: PortalUser;
  documents: ManagedDocument[];
  requiredRules: RequiredDocumentRule[];
  vendorDocuments: VendorDocument[];
  reportSubmissions: ReportSubmission[];
  deliveryRecords: DeliveryRecord[];
  auditEvents: DocumentAuditEvent[];
}) {
  return (
    <DocumentsDashboard
      user={user}
      orderList={orderList}
      documents={documents}
      requiredRules={requiredRules}
      vendorDocuments={vendorDocuments}
      reportSubmissions={reportSubmissions}
      deliveryRecords={deliveryRecords}
      auditEvents={auditEvents}
    />
  );
}

export function MessagesView({
  orderList,
  user,
  messages,
  onSendMessage,
  onToggleMessagePinned,
  onToggleMessageRead
}: {
  orderList: Order[];
  user: PortalUser;
  messages: OrderMessage[];
  onSendMessage: (orderId: string, channel: MessageChannel, body: string) => void;
  onToggleMessagePinned: (messageId: string) => void;
  onToggleMessageRead: (messageId: string) => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState(orderList[0]?.id ?? "");
  const selectedOrder = orderList.find((order) => order.id === selectedOrderId) ?? orderList[0];

  if (!selectedOrder) {
    return (
      <section className="panel p-5">
        <SectionHeader icon={MessageSquare} title="Messages" />
        <div className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-slate-500">No visible orders are available for messages.</div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="panel p-5">
        <SectionHeader icon={MessageSquare} title="Order Communications" />
        <div className="mt-4 grid gap-2">
          {orderList.slice(0, 12).map((order) => {
            const orderMessages = messages.filter((message) => message.orderId === order.id);
            const unread = orderMessages.filter((message) => !message.readBy.includes(user.name)).length;
            const pinned = orderMessages.filter((message) => message.pinned).length;
            return (
              <button
                key={order.id}
                className={`rounded-md border px-3 py-3 text-left text-sm transition ${selectedOrder.id === order.id ? "border-brand-300 bg-brand-50" : "border-line bg-white hover:border-slate-300"}`}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="font-semibold text-slate-900">{order.fileNumber} - {order.borrower}</div>
                <div className="mt-1 text-xs text-slate-500">{order.client} - {order.status}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="chip border-slate-200 bg-slate-50 text-slate-600">{orderMessages.length} messages</span>
                  {unread > 0 && <span className="chip border-brand-200 bg-brand-50 text-brand-700">{unread} unread</span>}
                  {pinned > 0 && <span className="chip border-amber-200 bg-amber-50 text-amber-800">{pinned} pinned</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
      <div className="panel p-5">
        <SectionHeader icon={MessageSquare} title={`${selectedOrder.fileNumber} Communication`} />
        <div className="mt-4">
          <OrderConversationPanel
            order={selectedOrder}
            user={user}
            messages={messages}
            onSendMessage={onSendMessage}
            onTogglePinned={onToggleMessagePinned}
            onToggleRead={onToggleMessageRead}
          />
        </div>
      </div>
    </section>
  );
}

export function ReportsView({
  orderList,
  documents,
  reportSubmissions,
  deliveryRecords
}: {
  orderList: Order[];
  documents: ManagedDocument[];
  reportSubmissions: ReportSubmission[];
  deliveryRecords: DeliveryRecord[];
}) {
  const reportOrders = orderList.filter((order) => ["Submitted", "In Review", "Ready for Delivery", "Delivered", "Completed"].includes(order.status));

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel p-5">
        <SectionHeader icon={FileCheck2} title="Report Submission and Delivery" />
        <div className="mt-4 grid gap-3">
          {(reportOrders.length ? reportOrders : orderList.slice(0, 3)).map((order) => {
            const orderDocuments = documents.filter((document) => document.orderId === order.id);
            const report = orderDocuments.find((document) => document.category === "Appraisal report PDF");
            const submission = reportSubmissions.find((item) => item.orderId === order.id);
            const delivery = deliveryRecords.find((item) => item.orderId === order.id);
            return (
              <div key={order.id} className="rounded-md border border-line px-4 py-3 text-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{order.fileNumber} - {order.borrower}</div>
                    <div className="mt-1 text-slate-500">{order.address}, {order.city} - {order.status}</div>
                  </div>
                  <button className="secondary-button" disabled={!report}>
                    <Download className="h-4 w-4" />
                    Download report
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <span><FileCheck2 className="mr-1 inline h-3 w-3" />{submission ? `Submitted ${submission.submittedAt}` : "No submission yet"}</span>
                  <span><CheckCircle2 className="mr-1 inline h-3 w-3" />{delivery ? `Delivered ${delivery.deliveredAt}` : "Not delivered"}</span>
                  <span><ShieldCheck className="mr-1 inline h-3 w-3" />{report ? `${report.visibility} - ${formatDate(report.uploadedAt)}` : "Report PDF missing"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="panel p-5">
        <SectionHeader icon={ShieldCheck} title="Delivery Controls" />
        <div className="mt-4 grid gap-3 text-sm text-slate-600">
          <div className="rounded-md border border-line bg-slate-50 p-3">Final report delivery uses permission-aware document visibility, signed URL placeholders, and audit logging.</div>
          <div className="rounded-md border border-line bg-slate-50 p-3">XML and ENV downloads are available only to roles with delivery/XML permissions.</div>
        </div>
      </aside>
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
