"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import {
  Send, Paperclip, X, ImageIcon, Loader2, Search, Users, Plus,
  MessageSquare, ChevronDown, UserCircle2,
} from "lucide-react";
import {
  getChatSidebarAction,
  getMessagesAction,
  sendMessageAction,
  openDmAction,
  createGroupAction,
  type ChatContact,
  type ChatConversation,
  type ChatTarget,
} from "@/lib/actions/chat";
import type { ChatAttachment, ChatMessage } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/ui";

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fmtDay(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-brand-300/25 text-brand-300",
  "bg-violet-400/25 text-violet-300",
  "bg-emerald-400/25 text-emerald-300",
  "bg-amber-400/25 text-amber-300",
  "bg-pink-400/25 text-pink-300",
  "bg-cyan-400/25 text-cyan-300",
];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function fmtTimeLabel(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() > startOfToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  if (d.getTime() > startOfWeek.getTime()) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

type ActiveTarget = ChatTarget;

export default function ChatPanel({
  currentUserId,
  roleKey,
  permissions,
}: {
  currentUserId: string;
  roleKey: string;
  permissions: string[];
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const isSuperAdmin =
    roleKey === "SUPER_ADMIN" || (permissions || []).includes("admin:*");

  const [users, setUsers] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [active, setActive] = useState<ActiveTarget | null>(null);
  const [activeName, setActiveName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSelected, setGroupSelected] = useState<Set<string>>(new Set());

  const resolveName = useCallback(
    (target: ActiveTarget) => {
      if (target.kind === "dm") {
        const u = users.find((x) => x.id === target.peerId);
        return u?.name || "Chat";
      }
      const c = conversations.find((x) => x.id === target.conversationId);
      return c?.name || "Group";
    },
    [users, conversations]
  );

  const fetchMessages = useCallback(
    async (target: ActiveTarget) => {
      setLoadingMsgs(true);
      try {
        const res = await getMessagesAction(target);
        if (res.error) {
          toast(res.error, "error");
          return;
        }
        setMessages(res.messages ?? []);
      } catch {
        // ignore
      } finally {
        setLoadingMsgs(false);
      }
    },
    [toast]
  );

  const selectTarget = useCallback(
    (target: ActiveTarget) => {
      setActive(target);
      setActiveName(resolveName(target));
      fetchMessages(target);
    },
    [resolveName, fetchMessages]
  );

  const hadAutoSelected = useRef(false);

  const fetchSidebar = useCallback(async () => {
    try {
      const res = await getChatSidebarAction();
      if (res.users) setUsers(res.users);
      if (res.conversations) setConversations(res.conversations);
      if (res.conversations && res.conversations.length > 0 && !hadAutoSelected.current) {
        hadAutoSelected.current = true;
        const first = res.conversations[0];
        if (first.type === "dm") {
          const t: ActiveTarget = { kind: "dm", peerId: first.participants[0]?.id || "" };
          setActiveName(first.participants[0]?.name || "Chat");
          setActive(t);
          fetchMessagesRes(t);
        } else {
          const t: ActiveTarget = { kind: "group", conversationId: first.id };
          setActiveName(first.name);
          setActive(t);
          fetchMessagesRes(t);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMessagesRes(target: ActiveTarget) {
    setLoadingMsgs(true);
    try {
      const res = await getMessagesAction(target);
      if (!res.error) setMessages(res.messages ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    fetchSidebar();
  }, [fetchSidebar]);

  // Poll for new messages on the active conversation.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      fetchMessages(active);
      fetchSidebar();
    }, 3500);
    return () => clearInterval(id);
  }, [active, fetchMessages, fetchSidebar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openDm(user: ChatContact) {
    start(async () => {
      const res = await openDmAction(user.id);
      if (res.error) { toast(res.error, "error"); return; }
      await fetchSidebar();
      setActiveName(user.name);
      selectTarget({ kind: "dm", peerId: user.id });
    });
  }

  function selectConversation(c: ChatConversation) {
    if (c.type === "dm") {
      const peer = c.participants[0];
      setActiveName(peer?.name || "Chat");
      selectTarget({ kind: "dm", peerId: peer?.id || "" });
    } else {
      setActiveName(c.name);
      selectTarget({ kind: "group", conversationId: c.id });
    }
  }

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
    if (!active) return;
    if (!input.trim() && pendingAttachments.length === 0) return;
    setSending(true);
    try {
      const payload = pendingAttachments.map((a) => ({
        fileName: a.file_name,
        dataUrl: a.data_url,
        fileSize: a.file_size,
        mimeType: a.mime_type,
      }));
      const res = await sendMessageAction(active, input.trim(), payload);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      setInput("");
      setPendingAttachments([]);
      await fetchMessages(active);
      fetchSidebar();
    } catch {
      toast("Failed to send message.", "error");
    } finally {
      setSending(false);
    }
  }

  const isImage = (mime: string) => mime.startsWith("image/");

  const activeConv = conversations.find(
    (c) => active && (active.kind === "dm" ? c.participants[0]?.id === active.peerId : c.id === active.conversationId)
  );

  const filteredUsers = users.filter((u) => {
    if (u.id === currentUserId) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function openUserSearch() {
    setSearchFocused(true);
    setSearch("");
    // Focus the search input shortly after render
    setTimeout(() => {
      document.getElementById("chat-search-input")?.focus();
    }, 0);
  }

  function openGroupModal() {
    setGroupName("");
    setGroupSelected(new Set());
    setGroupModal(true);
  }

  function toggleGroupMember(id: string) {
    setGroupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function createGroup() {
    start(async () => {
      const res = await createGroupAction(groupName, Array.from(groupSelected));
      if (res.error) { toast(res.error, "error"); return; }
      setGroupModal(false);
      toast("Group created.", "success");
      await fetchSidebar();
      if (res.conversationId) selectTarget({ kind: "group", conversationId: res.conversationId });
    });
  }

  const subtitle = !active
    ? ""
    : active.kind === "dm"
      ? activeConv?.participants[0]
        ? (users.find((u) => u.id === activeConv.participants[0].id)?.roleLabel || "")
        : ""
      : activeConv
        ? `${activeConv.participants.length} members`
        : "";

  const headerName = activeName || "";

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-xl border border-white/10 overflow-hidden bg-night-900">
      {/* ── Sidebar ── */}
      <div className="w-full sm:w-72 lg:w-80 shrink-0 border-r border-white/[0.06] bg-night-950 flex flex-col">
        <div className="p-3 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white tracking-tight">Messages</p>
            <button
              onClick={openGroupModal}
              className={`shrink-0 btn-ghost !p-1.5 text-brand-300 ${isSuperAdmin ? "" : "opacity-0 pointer-events-none"}`}
              title={isSuperAdmin ? "Create group" : ""}
              aria-label="Create group"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
          {isSuperAdmin && <p className="text-[9px] uppercase tracking-wider text-slate-600 -mt-1">Only you can create groups</p>}

          {/* New Chat / Search */}
          <button
            type="button"
            onClick={openUserSearch}
            className="w-full flex items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2 text-left text-xs text-slate-400 hover:border-brand-300/40 hover:text-brand-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              id="chat-search-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchFocused(true); }}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search by name or email…"
              className="input !pl-8 !py-1.5 !text-[11px]"
            />
          </div>
        </div>

        {/* Chats list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] animate-pulse space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-white/[0.06]" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {!search.trim() && (
                <>
                  {conversations.filter((c) => c.type === "group").map((c) => (
                    <ChatRow
                      key={c.id}
                      active={!!active && active.kind === "group" && active.conversationId === c.id}
                      onClick={() => selectConversation(c)}
                      avatar={<Users className="h-4 w-4" />}
                      avatarClass="bg-violet-400/25 text-violet-300"
                      name={c.name}
                      subtitle={`${c.participants.length} members${c.last_message ? ` · ${c.last_message.slice(0, 20)}` : ""}`}
                    />
                  ))}
                  {conversations.filter((c) => c.type === "dm").map((c) => {
                    const peer = c.participants[0];
                    return (
                      <ChatRow
                        key={c.id}
                        active={!!active && active.kind === "dm" && active.peerId === peer?.id}
                        onClick={() => selectConversation(c)}
                        avatar={peer ? initials(peer.name) : "?"}
                        avatarClass={peer ? colorFor(peer.name) : "bg-white/10"}
                        name={c.name}
                        subtitle={c.last_message ? c.last_message.slice(0, 24) : "Say hi!"}
                      />
                    );
                  })}
                  {conversations.length === 0 && (
                    <div className="px-3 py-6 text-center">
                      <p className="text-[11px] text-slate-600 mb-2">
                        {isSuperAdmin ? "No active threads yet." : "No conversations yet."}
                      </p>
                      <p className="text-[10px] text-slate-700">
                        {isSuperAdmin
                          ? "Use New Chat to start a thread with anyone."
                          : "Use New Chat to start a private conversation."}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* People (search results / new DM) */}
              {(search.trim() || searchFocused) && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-wider text-slate-600">
                    {search.trim() ? "People" : "Start a new chat"}
                  </p>
                  {filteredUsers.slice(0, 12).map((u) => (
                    <ChatRow
                      key={u.id}
                      active={!!active && active.kind === "dm" && active.peerId === u.id}
                      onClick={() => openDm(u)}
                      avatar={initials(u.name)}
                      avatarClass={colorFor(u.name)}
                      name={u.name}
                      subtitle={u.email}
                      right={<Plus className="h-3.5 w-3.5 text-slate-600" />}
                    />
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-slate-600">No matching people.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main window ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-night-900">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-night-950">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            active?.kind === "dm" ? colorFor(headerName) : "bg-violet-400/25 text-violet-300"
          }`}>
            {active?.kind === "group" ? <Users className="h-4 w-4" /> : initials(headerName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{headerName || "Messages"}</p>
            <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>
          </div>
          {active?.kind === "group" && activeConv && (
            <div className="flex items-center gap-1">
              {activeConv.participants.slice(0, 3).map((p) => (
                <div key={p.id} className={`h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-bold ${colorFor(p.name)}`} title={p.name}>
                  {initials(p.name)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          {!active ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs gap-2">
              <MessageSquare className="h-10 w-10 opacity-40" />
              <p>Select a conversation or start a new chat.</p>
            </div>
          ) : loadingMsgs && messages.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs gap-2">
              <ImageIcon className="h-10 w-10 opacity-40" />
              <p>No messages yet — say hello!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => {
                const mine = m.sender_id === currentUserId;
                const prev = messages[idx - 1];
                const showDay = !prev || fmtDay(prev.created_at) !== fmtDay(m.created_at);
                const showInfo = !prev || prev.sender_id !== m.sender_id || fmtTimeLabel(prev.created_at) !== fmtTimeLabel(m.created_at);
                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="flex justify-center my-3">
                        <span className="text-[9px] uppercase tracking-wider text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full">
                          {fmtDay(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex gap-2.5 ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine && (
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${colorFor(m.sender_name || "?")}`}>
                          {initials(m.sender_name || "?")}
                        </div>
                      )}
                      <div className={`flex flex-col ${mine ? "items-end" : "items-start"} max-w-[78%]`}>
                        <div
                          className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                            mine
                              ? "bg-brand-300 text-night-950 rounded-br-md"
                              : "bg-night-800 text-slate-100 border border-white/[0.06] rounded-bl-md"
                          }`}
                        >
                          {m.content}
                          {m.attachments.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {m.attachments.map((a) =>
                                isImage(a.mime_type) ? (
                                  <img key={a.id} src={a.data_url} alt={a.file_name} className="max-h-52 rounded-lg border border-black/10" />
                                ) : (
                                  <a href={a.data_url} download={a.file_name} className={`inline-flex items-center gap-1 text-[11px] ${mine ? "text-night-900 underline" : "text-brand-300 hover:underline"}`}>
                                    <Paperclip className="h-3 w-3" /> {a.file_name}
                                  </a>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        {showInfo && <span className="text-[9px] text-slate-600 mt-0.5">{mine ? "You" : m.sender_name} · {fmtTime(m.created_at)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pending attachments strip */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-1.5 border-t border-white/[0.04]">
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
                placeholder={`Message ${headerName || ""}…`}
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
          <p className="text-[9px] text-slate-600 mt-1">Enter to send · Shift+Enter for new line · attachments &lt;10 MB</p>
        </div>
      </div>

      {/* Create group modal */}
      <Modal open={groupModal} onClose={() => setGroupModal(false)} title="Create Group">
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Group name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Design Team"
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Members</label>
            <div className="max-h-56 overflow-y-auto custom-scrollbar rounded-lg border border-white/10 divide-y divide-white/[0.04]">
              {users
                .filter((u) => u.id !== currentUserId)
                .map((u) => {
                  const isSelected = groupSelected.has(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleGroupMember(u.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isSelected ? "bg-brand-300/10" : "hover:bg-white/[0.03]"}`}
                    >
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[8px] font-bold ${colorFor(u.name)}`}>
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white truncate">{u.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">{u.email}</p>
                      </div>
                      <span className={`h-4 w-4 rounded border flex items-center justify-center text-[9px] ${isSelected ? "bg-brand-300 border-brand-300 text-night-950" : "border-white/20"}`}>
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              {users.filter((u) => u.id !== currentUserId).length === 0 && (
                <p className="px-3 py-4 text-[11px] text-slate-600 text-center">No other users available.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setGroupModal(false)} className="btn-ghost">Cancel</button>
            <button onClick={createGroup} disabled={pending || !groupName.trim()} className="btn-primary disabled:opacity-40">
              {pending ? "Creating…" : "Create group"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChatRow({
  active,
  onClick,
  avatar,
  avatarClass,
  name,
  subtitle,
  right,
}: {
  active: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  avatarClass: string;
  name: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
        active ? "bg-brand-300/[0.12] border-l-2 border-l-brand-300" : "border-l-2 border-l-transparent hover:bg-white/[0.04]"
      }`}
    >
      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${avatarClass}`}>
        {avatar}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white truncate">{name}</p>
        {subtitle && <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>}
      </div>
      {right}
    </button>
  );
}
