import { useMemo, useState } from "react";
import { AtSign, CheckCircle2, EyeOff, MessageSquare, Pin, Search, Send } from "lucide-react";
import type { MessageChannel, Order, OrderMessage, PortalUser } from "@/types/domain";
import { messageSearchText } from "@/lib/messaging/service";
import { cn } from "@/lib/utils";
import { Field, SectionHeader } from "../shared";

const channels: Array<"All" | MessageChannel> = [
  "All",
  "Internal note",
  "Appraiser message",
  "Reviewer comment",
  "AMC message",
  "Lender/client message",
  "Revision request",
  "Revision response",
  "System activity"
];

function channelTone(channel: MessageChannel) {
  if (channel === "Lender/client message" || channel === "AMC message") return "border-blue-200 bg-blue-50 text-blue-700";
  if (channel === "Revision request" || channel === "Revision response") return "border-amber-200 bg-amber-50 text-amber-800";
  if (channel === "System activity") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function OrderConversationPanel({
  order,
  user,
  messages,
  onSendMessage,
  onTogglePinned,
  onToggleRead
}: {
  order: Order;
  user: PortalUser;
  messages: OrderMessage[];
  onSendMessage: (orderId: string, channel: MessageChannel, body: string) => void;
  onTogglePinned: (messageId: string) => void;
  onToggleRead: (messageId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"All" | MessageChannel>("All");
  const [senderFilter, setSenderFilter] = useState("All senders");
  const [draftChannel, setDraftChannel] = useState<MessageChannel>("Internal note");
  const [draftBody, setDraftBody] = useState(`@${order.appraiser.split(" ")[0]} please confirm the next update for ${order.fileNumber}.`);
  const scopedMessages = messages.filter((message) => message.orderId === order.id);
  const senderOptions = Array.from(new Set(scopedMessages.map((message) => message.sender)));
  const filteredMessages = useMemo(() => {
    const needle = query.toLowerCase();
    return scopedMessages
      .filter((message) => channelFilter === "All" || message.channel === channelFilter)
      .filter((message) => senderFilter === "All senders" || message.sender === senderFilter)
      .filter((message) => messageSearchText(message).includes(needle))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  }, [channelFilter, query, scopedMessages, senderFilter]);

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        External channels are visually labeled. Internal team messages are not client-visible, and external messages should be reviewed before sending.
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_190px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="control w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search message or revision text" />
        </div>
        <select className="control" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as "All" | MessageChannel)}>
          {channels.map((channel) => <option key={channel}>{channel}</option>)}
        </select>
        <select className="control" value={senderFilter} onChange={(event) => setSenderFilter(event.target.value)}>
          <option>All senders</option>
          {senderOptions.map((sender) => <option key={sender}>{sender}</option>)}
        </select>
      </div>

      <div className="grid gap-3">
        {filteredMessages.map((message) => {
          const unread = !message.readBy.includes(user.name);
          return (
            <div key={message.id} className={cn("rounded-md border p-3 text-sm", unread ? "border-brand-200 bg-brand-50/50" : "border-line bg-white")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{message.sender}</span>
                    <span className={cn("chip", channelTone(message.channel))}>{message.channel}</span>
                    <span className="chip border-slate-200 bg-slate-50 text-slate-600">{message.visibility}</span>
                    {message.pinned && <span className="chip border-amber-200 bg-amber-50 text-amber-800"><Pin className="mr-1 h-3 w-3" />Pinned</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">To {message.recipients.join(", ")} - {message.createdAt}</div>
                </div>
                <div className="flex gap-2">
                  <button className="icon-button" aria-label="Pin message" onClick={() => onTogglePinned(message.id)}><Pin className="h-4 w-4" /></button>
                  <button className="icon-button" aria-label="Toggle read" onClick={() => onToggleRead(message.id)}>{unread ? <CheckCircle2 className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                </div>
              </div>
              <p className="mt-3 text-slate-700">{message.body}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {message.body.includes("@") && <span><AtSign className="mr-1 inline h-3 w-3" />Mention notification hook</span>}
                {message.assignedFollowUpOwner && <span>Owner: {message.assignedFollowUpOwner}</span>}
                {message.followUpDueDate && <span>Due: {message.followUpDueDate}</span>}
                <span>{message.attachmentIds.length} attachments</span>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-md border border-line p-3">
        <SectionHeader icon={MessageSquare} title="New Conversation Item" />
        <div className="mt-3 grid gap-3">
          <Field label="Channel">
            <select className="control w-full" value={draftChannel} onChange={(event) => setDraftChannel(event.target.value as MessageChannel)}>
              {channels.filter((channel) => channel !== "All").map((channel) => <option key={channel}>{channel}</option>)}
            </select>
          </Field>
          <Field label="Message">
            <textarea className="control min-h-24 w-full py-3" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} />
          </Field>
          {draftChannel === "Lender/client message" && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Confirm this message has no internal notes, reviewer work notes, or appraiser pay information before sending.</div>}
          <button className="primary-button justify-center" onClick={() => onSendMessage(order.id, draftChannel, draftBody)}>
            <Send className="h-4 w-4" />
            Send message
          </button>
        </div>
      </section>
    </div>
  );
}
