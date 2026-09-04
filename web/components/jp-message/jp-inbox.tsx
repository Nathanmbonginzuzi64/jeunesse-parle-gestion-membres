"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, FileText, Mail, Mic, Paperclip, Plus, Send, Square } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { api, ApiError, downloadProtectedUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDebounced, useProtectedImage } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type {
  ChatContact,
  ChatConversationItem,
  ChatMessageItem,
  JpMessageItem,
  Paginated,
} from "@/lib/types";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

const CATEGORIES = [
  { value: "plainte", label: "Plainte" },
  { value: "suggestion", label: "Suggestion" },
  { value: "doleance", label: "Doléance" },
  { value: "demande", label: "Demande" },
  { value: "preoccupation", label: "Préoccupation" },
];

type Tab = "chats" | "tickets" | "new";
type ChatFilter = "all" | "chef_membre" | "mine";

function sourceLabel(source?: string) {
  if (source === "contact") return "Contact";
  if (source === "staff") return "Portail";
  return "Dossier";
}

function chatLabel(item: ChatConversationItem) {
  return item.title || item.peer?.name || "Conversation";
}

export function JpInbox({
  admin = false,
  initialId,
}: {
  admin?: boolean;
  initialId?: string | number;
}) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = admin || Boolean(user?.permissions?.includes(PERMISSIONS.usersView));
  const isSuperAdmin = user?.role?.slug === "super-admin";

  const chatFromUrl = searchParams.get("chat");
  const userFromUrl = searchParams.get("user");

  const [tab, setTab] = useState<Tab>(chatFromUrl ? "chats" : "chats");
  const [chatFilter, setChatFilter] = useState<ChatFilter>(isSuperAdmin ? "all" : "mine");
  const [q, setQ] = useState("");

  const [chats, setChats] = useState<ChatConversationItem[]>([]);
  const [tickets, setTickets] = useState<JpMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatId, setChatId] = useState<number | null>(chatFromUrl ? Number(chatFromUrl) : null);
  const [ticketId, setTicketId] = useState<number | null>(initialId ? Number(initialId) : null);
  const [ticket, setTicket] = useState<JpMessageItem | null>(null);

  const loadLists = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const chatQuery: Record<string, string | number> = { per_page: 50 };
      if (isSuperAdmin && chatFilter === "chef_membre") chatQuery.kind = "chef_membre";
      if (isSuperAdmin && chatFilter === "mine") chatQuery.kind = "mine";

      const [chatRes, ticketRes] = await Promise.all([
        api.get<Paginated<ChatConversationItem>>("/jp-messages/chats", chatQuery),
        api.get<Paginated<JpMessageItem>>("/jp-messages", { per_page: 50, mine: isAdmin ? 0 : 1 }),
      ]);
      setChats(chatRes.data);
      setTickets(ticketRes.data);
      setError(null);
    } catch (caught) {
      if (!silent) setError(caught instanceof ApiError ? caught.message : "Chargement impossible.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAdmin, isSuperAdmin, chatFilter]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadLists(true), 2500);
    return () => window.clearInterval(timer);
  }, [loadLists]);

  useEffect(() => {
    if (!userFromUrl) return;
    const target = Number(userFromUrl);
    if (!target) return;
    void (async () => {
      try {
        const response = await api.post<{ data: ChatConversationItem }>("/jp-messages/chats", { user_id: target });
        setTab("chats");
        setChatId(response.data.id);
        setTicketId(null);
        router.replace(`/jp-message?chat=${response.data.id}`);
        void loadLists(true);
      } catch (caught) {
        toast.error(caught instanceof ApiError ? caught.message : "Conversation impossible.");
      }
    })();
  }, [userFromUrl, router, toast, loadLists]);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      return;
    }
    void api.get<{ data: JpMessageItem }>(`/jp-messages/${ticketId}`).then((r) => setTicket(r.data)).catch(() => {
      toast.error("Dossier introuvable.");
    });
  }, [ticketId, toast]);

  const filteredChats = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((item) =>
      [chatLabel(item), item.peer?.role, item.last_message_preview, item.kind]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [chats, q]);

  const filteredTickets = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter((item) =>
      [item.subject, item.reference, item.author_label, item.body].join(" ").toLowerCase().includes(query),
    );
  }, [tickets, q]);

  const showThread = Boolean(chatId || ticketId || tab === "new");
  const activeChat = chats.find((c) => c.id === chatId) ?? null;

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] overflow-hidden rounded-card border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <aside className={cn("flex w-full shrink-0 flex-col border-slate-200 md:w-80 md:border-r lg:w-[22rem]", showThread ? "hidden md:flex" : "flex")}>
        <div className="border-b border-slate-100 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">JP Message</p>
              <p className="text-[11px] text-slate-500">
                {isSuperAdmin ? "Supervision centrale et conversations" : "Conversations et dossiers officiels"}
              </p>
            </div>
            <Button size="sm" onClick={() => { setTab("new"); setChatId(null); setTicketId(null); }}>
              <Plus className="h-4 w-4" />
              Nouveau
            </Button>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab("chats")}
              className={cn("rounded-md px-2 py-1.5 font-medium", tab === "chats" || tab === "new" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500")}
            >
              Conversations
            </button>
            <button
              type="button"
              onClick={() => setTab("tickets")}
              className={cn("rounded-md px-2 py-1.5 font-medium", tab === "tickets" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500")}
            >
              Dossiers
            </button>
          </div>
          {isSuperAdmin && tab !== "tickets" ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {([
                ["all", "Tout"],
                ["chef_membre", "Chef ↔ membre"],
                ["mine", "Mes échanges"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setChatFilter(value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium",
                    chatFilter === value ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? <div className="p-3"><Alert tone="error">{error}</Alert></div> : null}
          {loading ? <div className="p-3"><Skeleton className="h-24 w-full" /></div> : null}

          {tab !== "tickets" && !loading && (
            filteredChats.length === 0 ? (
              <EmptyState title="Aucune conversation" description={isSuperAdmin ? "Aucun échange à superviser pour ce filtre." : "Écrivez à un responsable ou un membre autorisé."} />
            ) : (
              <ul>
                {filteredChats.map((item) => (
                  <li key={`c-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => { setChatId(item.id); setTicketId(null); setTab("chats"); router.replace(`/jp-message?chat=${item.id}`); }}
                      className={cn("flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left", chatId === item.id ? "bg-brand-50" : "hover:bg-slate-50")}
                    >
                      <Avatar src={item.peer?.photo_url} name={chatLabel(item)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">{chatLabel(item)}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">{formatRelative(item.last_message_at)}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                          {item.oversight ? <Eye className="h-3 w-3 shrink-0 text-amber-600" /> : null}
                          {item.kind === "chef_membre" ? "Chef ↔ membre · " : null}
                          {item.peer?.role}
                        </span>
                        <span className={cn("mt-0.5 line-clamp-1 text-xs", item.unread ? "font-medium text-slate-800" : "text-slate-500")}>
                          {item.last_message_preview ?? "—"}
                        </span>
                      </span>
                      {item.unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "tickets" && !loading && (
            filteredTickets.length === 0 ? (
              <EmptyState title="Aucun dossier" description="Les tickets JP Message apparaissent ici." />
            ) : (
              <ul>
                {filteredTickets.map((item) => (
                  <li key={`t-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => { setTicketId(item.id); setChatId(null); router.replace(`/jp-message/${item.id}`); }}
                      className={cn("flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left", ticketId === item.id ? "bg-brand-50" : "hover:bg-slate-50")}
                    >
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", item.source === "contact" ? "bg-amber-400" : "bg-slate-400")} />
                      <span className="min-w-0 flex-1">
                        <span className="truncate text-sm font-medium text-slate-900">{item.subject}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {item.reference} · {item.author_label} · {formatRelative(item.created_at)}
                        </span>
                        <span className="mt-1 line-clamp-1 text-xs text-slate-500">{item.body}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </aside>

      <section className={cn("min-w-0 flex-1 flex-col bg-slate-50/70", showThread ? "flex" : "hidden md:flex")}>
        {tab === "new" && !chatId && !ticketId ? (
          <ComposeHub
            onBack={() => setTab("chats")}
            onOpenChat={(id) => { setTab("chats"); setChatId(id); router.replace(`/jp-message?chat=${id}`); void loadLists(true); }}
            onTicketCreated={(ticketCreated) => {
              setTickets((current) => [ticketCreated, ...current]);
              setTicketId(ticketCreated.id);
              setTab("tickets");
            }}
          />
        ) : chatId ? (
          <ChatThread
            conversationId={chatId}
            currentUserId={user?.id ?? 0}
            peer={activeChat?.peer ?? null}
            title={activeChat?.title}
            oversight={Boolean(activeChat?.oversight)}
            canSend={activeChat?.can_send !== false}
            onBack={() => { setChatId(null); router.replace("/jp-message"); }}
            onSent={() => void loadLists(true)}
          />
        ) : ticket ? (
          <TicketThread
            message={ticket}
            isAdmin={isAdmin}
            onBack={() => { setTicketId(null); router.replace("/jp-message"); }}
            onReply={(reply) => setTicket((current) => current ? { ...current, replies: [...(current.replies ?? []), reply] } : current)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
            <Mail className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">JP Message</p>
            <p className="max-w-sm text-xs">
              {isSuperAdmin
                ? "Supervisez les échanges chefs ↔ membres, contactez n’importe qui, et suivez les dossiers officiels."
                : "Écrivez à vos responsables, aux membres de votre structure, ou ouvrez un dossier officiel."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ComposeHub({
  onBack,
  onOpenChat,
  onTicketCreated,
}: {
  onBack: () => void;
  onOpenChat: (id: number) => void;
  onTicketCreated: (ticket: JpMessageItem) => void;
}) {
  const toast = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState<"directory" | "ticket">("directory");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 350);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("demande");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const loadContacts = useCallback(async (nextPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoadingContacts(true);
    try {
      const response = await api.get<Paginated<ChatContact>>("/jp-messages/directory", {
        q: debouncedQ || undefined,
        page: nextPage,
        per_page: 20,
      });
      setContacts((current) => (append ? [...current, ...response.data] : response.data));
      setPage(response.meta.current_page);
      setLastPage(response.meta.last_page);
      setTotal(response.meta.total);
    } catch {
      toast.error("Annuaire indisponible.");
    } finally {
      setLoadingContacts(false);
      setLoadingMore(false);
    }
  }, [debouncedQ, toast]);

  useEffect(() => {
    void loadContacts(1, false);
  }, [loadContacts]);

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; label: string; contacts: ChatContact[] }>();
    for (const contact of contacts) {
      const id = contact.group_id ?? "all";
      const label = contact.group_label ?? "Contacts";
      if (!map.has(id)) map.set(id, { id, label, contacts: [] });
      map.get(id)!.contacts.push(contact);
    }
    return Array.from(map.values());
  }, [contacts]);

  async function openChat(userId: number) {
    try {
      const response = await api.post<{ data: ChatConversationItem }>("/jp-messages/chats", { user_id: userId });
      onOpenChat(response.data.id);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Accès refusé.");
    }
  }

  async function submitTicket(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const response = await api.post<{ data: JpMessageItem }>("/jp-messages", { subject, category, body });
      toast.success("Dossier ouvert.");
      onTicketCreated(response.data);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold">Nouveau</h2>
      </header>
      <div className="grid grid-cols-2 gap-1 border-b border-slate-100 bg-white p-2 text-xs">
        <button type="button" onClick={() => setMode("directory")} className={cn("rounded-md px-2 py-2 font-medium", mode === "directory" ? "bg-brand-50 text-brand-800" : "text-slate-500")}>
          Contacter
        </button>
        <button type="button" onClick={() => setMode("ticket")} className={cn("rounded-md px-2 py-2 font-medium", mode === "ticket" ? "bg-brand-50 text-brand-800" : "text-slate-500")}>
          Dossier officiel
        </button>
      </div>
      {mode === "directory" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Input placeholder="Rechercher un membre (nom, JP-RDC…) ou un responsable…" value={q} onChange={(e) => setQ(e.target.value)} />
          <p className="mt-2 text-[11px] text-slate-400">
            {debouncedQ
              ? `${total} résultat${total > 1 ? "s" : ""} (membres inclus)`
              : `${total} responsable${total > 1 ? "s" : ""} — recherchez pour trouver un membre`}
          </p>
          <div className="mt-4 space-y-4">
            {loadingContacts ? <Skeleton className="h-24 w-full" /> : null}
            {!loadingContacts && grouped.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun interlocuteur autorisé pour votre périmètre.</p>
            ) : grouped.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                <ul className="space-y-1">
                  {group.contacts.map((contact) => (
                    <li key={contact.id}>
                      <button
                        type="button"
                        onClick={() => void openChat(contact.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white"
                      >
                        <Avatar src={contact.photo_url} name={contact.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">{contact.name}</span>
                          <span className="block truncate text-[11px] text-slate-500">{[contact.role, contact.scope, contact.member_code].filter(Boolean).join(" · ")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {page < lastPage ? (
              <Button
                variant="outline"
                className="w-full"
                loading={loadingMore}
                onClick={() => void loadContacts(page + 1, true)}
              >
                Charger plus
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <form onSubmit={submitTicket} className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 p-5">
          <p className="text-xs text-slate-500">Ticket administratif (plainte, demande…) traité par l’administration — distinct d’une conversation.</p>
          <Input label="Sujet" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <Select label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
          <Textarea label="Description" value={body} onChange={(e) => setBody(e.target.value)} rows={6} required />
          <Button type="submit" loading={sending}><Send className="h-4 w-4" />Ouvrir le dossier</Button>
        </form>
      )}
    </div>
  );
}

function ChatThread({
  conversationId,
  currentUserId,
  peer,
  title,
  oversight = false,
  canSend = true,
  onBack,
  onSent,
}: {
  conversationId: number;
  currentUserId: number;
  peer: ChatConversationItem["peer"];
  title?: string | null;
  oversight?: boolean;
  canSend?: boolean;
  onBack: () => void;
  onSent: () => void;
}) {
  const toast = useToast();
  const [headerPeer, setHeaderPeer] = useState(peer);
  const [headerTitle, setHeaderTitle] = useState(title);
  const [allowSend, setAllowSend] = useState(canSend);
  const [isOversight, setIsOversight] = useState(oversight);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeaderPeer(peer);
    setHeaderTitle(title);
    setAllowSend(canSend);
    setIsOversight(oversight);
  }, [peer, title, canSend, oversight]);

  useEffect(() => {
    void api
      .get<{ data: ChatConversationItem }>(`/jp-messages/chats/${conversationId}`)
      .then((response) => {
        setHeaderPeer(response.data.peer);
        setHeaderTitle(response.data.title);
        setAllowSend(response.data.can_send !== false);
        setIsOversight(Boolean(response.data.oversight));
      })
      .catch(() => undefined);
  }, [conversationId]);

  const load = useCallback(async (silent = false) => {
    try {
      const response = await api.get<{ data: ChatMessageItem[]; meta?: { can_send?: boolean; oversight?: boolean } }>(
        `/jp-messages/chats/${conversationId}/messages`,
      );
      setMessages(response.data);
      if (response.meta?.can_send !== undefined) setAllowSend(response.meta.can_send);
      if (response.meta?.oversight !== undefined) setIsOversight(response.meta.oversight);
    } catch (caught) {
      if (!silent) toast.error(caught instanceof ApiError ? caught.message : "Fil introuvable.");
    }
  }, [conversationId, toast]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 2500);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(payload?: File | null) {
    if (!allowSend) return;
    const attachment = payload ?? file;
    if (!body.trim() && !attachment) return;
    setSending(true);
    const form = new FormData();
    if (body.trim()) form.append("body", body.trim());
    if (attachment) form.append("file", attachment);
    try {
      const response = await api.post<{ data: ChatMessageItem }>(`/jp-messages/chats/${conversationId}/messages`, form);
      setMessages((current) => [...current, response.data]);
      setBody("");
      setFile(null);
      onSent();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  async function toggleRecord() {
    if (!allowSend) return;
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
        const voice = new File([blob], "message-vocal.webm", { type: blob.type });
        void send(voice);
      };
      recorder.current = media;
      media.start();
      setRecording(true);
    } catch {
      toast.error("Micro inaccessible.");
    }
  }

  const displayName = headerTitle || headerPeer?.name || "Conversation";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar src={headerPeer?.photo_url} name={displayName} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-xs text-slate-500">{[headerPeer?.role, headerPeer?.scope].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      {isOversight ? (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Mode supervision — vous consultez cet échange pour traçabilité (lecture seule).
        </div>
      ) : null}

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((item) => {
          const mine = item.author_id === currentUserId;
          return (
            <div key={item.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine ? <Avatar src={item.photo_url} name={item.author} size="xs" /> : null}
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm", mine ? "rounded-br-md bg-brand-700 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100")}>
                {!mine ? <p className="text-[11px] font-medium text-slate-500">{item.author}</p> : null}
                {item.body ? <p className="whitespace-pre-wrap leading-relaxed">{item.body}</p> : null}
                {item.attachments.map((fileItem) => (
                  <ChatAttachmentView key={fileItem.id} file={fileItem} inverted={mine} />
                ))}
                <p className={cn("mt-1 text-[10px]", mine ? "text-brand-100" : "text-slate-400")}>{formatDateTime(item.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {allowSend ? (
        <form
          onSubmit={(event) => { event.preventDefault(); void send(); }}
          className="border-t border-slate-200 bg-white p-3"
        >
          {file ? <p className="mb-2 truncate text-xs text-slate-500">Pièce jointe : {file.name}</p> : null}
          {recording ? <p className="mb-2 text-xs font-medium text-flag-red">Enregistrement vocal…</p> : null}
          <div className="flex items-end gap-2">
            <input ref={fileInput} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf,audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => fileInput.current?.click()} aria-label="Joindre">
              <Paperclip className="h-5 w-5" />
            </button>
            <button type="button" className={cn("rounded-lg p-2 hover:bg-slate-100", recording ? "text-flag-red" : "text-slate-500")} onClick={() => void toggleRecord()} aria-label="Vocal">
              {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Écrire un message…"
              className="min-h-[2.75rem] flex-1"
              wrapperClassName="flex-1"
            />
            <Button type="submit" loading={sending} className="shrink-0"><Send className="h-4 w-4" /></Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
          Lecture seule — pour répondre, ouvrez une conversation directe avec la personne.
        </div>
      )}
    </div>
  );
}

function ChatAttachmentView({ file, inverted }: { file: ChatMessageItem["attachments"][number]; inverted: boolean }) {
  const src = useProtectedImage(file.kind === "image" || file.kind === "audio" ? file.url : null);

  if (file.kind === "image" && src) {
    return <img src={src} alt="" className="mt-2 max-h-56 rounded-lg object-cover" />;
  }
  if (file.kind === "audio" && src) {
    return <audio controls src={src} className="mt-2 w-full max-w-xs" />;
  }
  return (
    <button
      type="button"
      onClick={() => void downloadProtectedUrl(file.url, file.name)}
      className={cn("mt-2 inline-flex items-center gap-1 text-xs underline", inverted ? "text-brand-100" : "text-brand-700")}
    >
      <FileText className="h-3.5 w-3.5" />
      {file.name}
    </button>
  );
}

function TicketThread({
  message,
  isAdmin,
  onBack,
  onReply,
}: {
  message: JpMessageItem;
  isAdmin: boolean;
  onBack: () => void;
  onReply: (reply: NonNullable<JpMessageItem["replies"]>[number]) => void;
}) {
  const toast = useToast();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const response = await api.post<{ data: NonNullable<JpMessageItem["replies"]>[number] }>(`/jp-messages/${message.id}/replies`, { body: reply.trim() });
      setReply("");
      onReply(response.data ?? { id: Date.now(), body: reply.trim(), author: "Vous", is_admin: isAdmin, created_at: new Date().toISOString() });
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  const bubbles = [
    { id: `root-${message.id}`, body: message.body, author: message.author_label ?? "Utilisateur", is_admin: false, created_at: message.created_at },
    ...(message.replies ?? []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="mb-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-semibold text-slate-900">{message.subject}</p>
        <p className="text-xs text-slate-500">{message.reference} · {sourceLabel(message.source)} · {message.status}</p>
        {message.guest_email ? <p className="mt-1 text-xs text-slate-500">{message.guest_email}</p> : null}
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {bubbles.map((item) => (
          <div key={item.id} className={cn("flex", item.is_admin ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", item.is_admin ? "bg-brand-700 text-white" : "bg-white ring-1 ring-slate-100")}>
              <p className={cn("text-[11px] font-medium", item.is_admin ? "text-brand-100" : "text-slate-500")}>{item.author} · {formatDateTime(item.created_at)}</p>
              <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={sendReply} className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} required placeholder="Répondre au dossier…" className="flex-1" wrapperClassName="flex-1" />
          <Button type="submit" loading={sending}><Send className="h-4 w-4" /></Button>
        </div>
      </form>
    </div>
  );
}
