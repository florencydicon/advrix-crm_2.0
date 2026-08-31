"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, ImageIcon, Loader2 } from "lucide-react";
import { getMessagesAction, sendMessageAction } from "@/lib/actions/chat";
import type { ChatAttachment, ChatMessage } from "@/lib/types";
import { useToast } from "@/components/Toast";

interface ChatPanelProps {
  projectId?: string | null;
  taskId?: string | null;
  currentUserId: string;
  title?: string;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function ChatPanel({ projectId, taskId, currentUserId, title }: ChatPanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await getMessagesAction(projectId ?? null, taskId ?? null);
      if ("error" in res && res.error) {
        toast(res.error, "error");
        return;
      }
      setMessages(res.messages ?? []);
    } catch {
      // ignore transient failures
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchMessages();
    const id = setInterval(() => {
      if (alive) fetchMessages();
    }, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [projectId, taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("File too large — max 10 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingAttachments((prev) => [
        ...prev,
        {
          id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          message_id: "",
          file_name: file.name,
          data_url: dataUrl,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          created_at: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function send() {
    if (!input.trim() && pendingAttachments.length === 0) return;
    setSending(true);
    try {
      const payload = pendingAttachments.map((a) => ({
        fileName: a.file_name,
        dataUrl: a.data_url,
        fileSize: a.file_size,
        mimeType: a.mime_type,
      }));
      const res = await sendMessageAction(projectId ?? null, input.trim(), payload, taskId ?? null);
      if ("error" in res && res.error) {
        toast(res.error, "error");
        return;
      }
      setInput("");
      setPendingAttachments([]);
      await fetchMessages();
    } catch {
      toast("Failed to send message.", "error");
    } finally {
      setSending(false);
    }
  }

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div className="flex flex-col h-full bg-night-900 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-night-950">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          {title || (projectId ? "Project Chat" : "Team Chat")}
        </p>
        <span className="text-[10px] text-slate-600">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading chat…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs gap-2">
            <ImageIcon className="h-8 w-8 opacity-40" />
            <p>No messages yet — start the conversation below.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                <div className={`rounded-lg border border-white/10 p-2.5 max-w-[85%] ${mine ? "bg-brand-300/[0.08] border-brand-300/20" : "bg-night-850"}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="h-4 w-4 rounded-full bg-brand-300/25 flex items-center justify-center text-[7px] font-bold text-brand-300">
                      {(m.sender_name || "?")[0]?.toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{m.sender_name}</span>
                    <span className="text-[9px] text-slate-600">{fmt(m.created_at)}</span>
                  </div>
                  {m.content && (
                    <p className="text-[12px] text-slate-200 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  )}
                  {m.attachments.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {m.attachments.map((a) =>
                        isImage(a.mime_type) ? (
                          <img key={a.id} src={a.data_url} alt={a.file_name} className="max-h-48 rounded-lg border border-white/10" />
                        ) : (
                          <a href={a.data_url} download={a.file_name} className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:underline">
                            <Paperclip className="h-3 w-3" /> {a.file_name}
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending attachments strip */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-1.5 border-b border-white/[0.04]">
          {pendingAttachments.map((a) => (
            <div key={a.id} className="relative group">
              {isImage(a.mime_type) ? (
                <img src={a.data_url} alt={a.file_name} className="h-14 w-14 rounded-lg border border-white/10 object-cover" />
              ) : (
                <a href={a.data_url} download={a.file_name} className="inline-flex items-center gap-1 text-[10px] text-slate-300 bg-night-800 px-2 py-1 rounded border border-white/10 hover:bg-white/5">
                  <Paperclip className="h-3 w-3" /> {a.file_name.length > 18 ? a.file_name.slice(0, 18) + "…" : a.file_name}
                </a>
              )}
              <button type="button" onClick={() => removePendingAttachment(a.id)} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-night-950 text-slate-400 flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] bg-night-950">
        <div className="flex items-end gap-2">
          <label className="btn-ghost !p-2 !px-2.5 shrink-0" title="Attach file">
            <Paperclip className="h-4 w-4 text-slate-400" />
            <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xlsx,.zip,.txt" onChange={onFileSelect} />
          </label>
          <div className="flex-1 rounded-lg border border-white/10 bg-night-800 px-3 py-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-brand-300/30">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              placeholder="Type a message…"
              className="resize-none bg-transparent w-full outline-none placeholder:text-slate-600"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={send}
            disabled={sending || (!input.trim() && pendingAttachments.length === 0)}
            className="btn-primary !px-3 !py-2 shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[9px] text-slate-600 mt-1">Enter to send · Shift+Enter for new line · images &lt;10 MB</p>
      </div>
    </div>
  );
}