"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageSquare, Plus, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { JpMessageItem, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

const CATEGORIES = [
  { value: "plainte", label: "Plainte" },
  { value: "suggestion", label: "Suggestion" },
  { value: "doleance", label: "Doléance" },
  { value: "demande", label: "Demande" },
  { value: "preoccupation", label: "Préoccupation" },
];

function sourceLabel(source?: string) {
  if (source === "contact") return "Contact";
  if (source === "staff") return "Portail";
  return "Membre";
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
  const { user } = useAuth();
  const isAdmin = admin || Boolean(user?.permissions?.includes(PERMISSIONS.usersView));

  const [list, setList] = useState<JpMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialId ? Number(initialId) : null);
  const [thread, setThread] = useState<JpMessageItem | null>(null);
  const [composing, setComposing] = useState(false);
  const [q, setQ] = useState("");

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get<Paginated<JpMessageItem>>("/jp-messages", {
        per_page: 50,
        mine: admin ? 0 : 1,
      });
      setList(response.data);
      setError(null);
    } catch (caught) {
      if (!silent) setError(caught instanceof ApiError ? caught.message : "Chargement impossible.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [admin]);

  const loadThread = useCallback(async (id: number, silent = false) => {
    try {
      const response = await api.get<{ data: JpMessageItem }>(`/jp-messages/${id}`);
      setThread(response.data);
    } catch (caught) {
      if (!silent) toast.error(caught instanceof ApiError ? caught.message : "Conversation introuvable.");
    }
  }, [toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList(true);
      if (selectedId) void loadThread(selectedId, true);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadList, loadThread, selectedId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((item) =>
      [item.subject, item.reference, item.author_label, item.body, item.category]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [list, q]);

  function openConversation(id: number) {
    setComposing(false);
    setSelectedId(id);
    if (admin) router.replace(`/jp-message/${id}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] overflow-hidden rounded-card border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-slate-200 md:w-80 md:border-r lg:w-96",
          selectedId || composing ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{admin ? "Boîte JP Message" : "JP Message"}</p>
                <p className="text-[11px] text-slate-500">{list.length} conversation{list.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => { setSelectedId(null); setThread(null); setComposing(true); }}>
              <Plus className="h-4 w-4" />
              Nouveau
            </Button>
          </div>
          <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? <div className="p-3"><Alert tone="error">{error}</Alert></div> : null}
          {loading ? <div className="p-3"><Skeleton className="h-24 w-full" /></div> : null}
          {!loading && filtered.length === 0 ? (
            <EmptyState title="Aucune conversation" description="Ouvrez un nouveau fil pour échanger." />
          ) : (
            <ul>
              {filtered.map((item) => {
                const active = selectedId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(item.id)}
                      className={cn(
                        "flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition",
                        active ? "bg-brand-50" : "hover:bg-slate-50",
                      )}
                    >
                      <Avatar src={item.member?.photo_url} name={item.author_label} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">{item.subject}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">{formatRelative(item.created_at)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="truncate">{item.author_label}</span>
                          <span>·</span>
                          <span>{sourceLabel(item.source)}</span>
                        </span>
                        <span className="mt-1 line-clamp-1 text-xs text-slate-500">{item.body}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className={cn("min-w-0 flex-1 flex-col bg-slate-50/70", selectedId || composing ? "flex" : "hidden md:flex")}>
        {composing ? (
          <ComposePanel
            onCancel={() => setComposing(false)}
            onCreated={(created) => {
              setComposing(false);
              setList((current) => [created, ...current.filter((item) => item.id !== created.id)]);
              openConversation(created.id);
            }}
          />
        ) : selectedId && thread ? (
          <ThreadPanel
            message={thread}
            isAdmin={isAdmin}
            currentName={user?.name ?? ""}
            onBack={() => {
              setSelectedId(null);
              setThread(null);
              if (admin) router.replace("/jp-message/gestion");
            }}
            onReply={(reply) => {
              setThread((current) =>
                current ? { ...current, replies: [...(current.replies ?? []), reply] } : current,
              );
              void loadList(true);
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
            <MessageSquare className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">Choisissez une conversation</p>
            <p className="max-w-sm text-xs">Tous les comptes du portail peuvent ouvrir un fil : membres, agents et administrateurs.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ComposePanel({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (message: JpMessageItem) => void;
}) {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("demande");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const response = await api.post<{ message: string; data: JpMessageItem }>("/jp-messages", {
        subject,
        category,
        body,
      });
      toast.success(response.message);
      onCreated(response.data);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold">Nouvelle conversation</h2>
      </header>
      <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 p-5">
        <Input label="Sujet" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <Select label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
        <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={8} required />
        <div className="mt-auto flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button type="submit" loading={sending}>
            <Send className="h-4 w-4" />
            Ouvrir le fil
          </Button>
        </div>
      </form>
    </div>
  );
}

function ThreadPanel({
  message,
  isAdmin,
  currentName,
  onBack,
  onReply,
}: {
  message: JpMessageItem;
  isAdmin: boolean;
  currentName: string;
  onBack: () => void;
  onReply: (reply: NonNullable<JpMessageItem["replies"]>[number]) => void;
}) {
  const toast = useToast();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [message.id, message.replies?.length]);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const response = await api.post<{
        message: string;
        data: NonNullable<JpMessageItem["replies"]>[number];
      }>(`/jp-messages/${message.id}/replies`, { body });
      setReply("");
      onReply(response.data ?? {
        id: Date.now(),
        body,
        author: currentName,
        is_admin: isAdmin,
        created_at: new Date().toISOString(),
      });
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  const bubbles = [
    {
      id: `root-${message.id}`,
      body: message.body,
      author: message.author_label ?? "Utilisateur",
      is_admin: false,
      created_at: message.created_at,
    },
    ...(message.replies ?? []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar src={message.member?.photo_url} name={message.author_label} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{message.subject}</p>
          <p className="truncate text-xs text-slate-500">
            {message.reference} · {message.author_label} · {sourceLabel(message.source)} · {message.status}
          </p>
          {message.guest_email ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
              <Mail className="h-3 w-3" />
              {message.guest_email}
            </p>
          ) : null}
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {bubbles.map((item) => (
          <div
            key={item.id}
            className={cn("flex", item.is_admin ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                item.is_admin
                  ? "rounded-br-md bg-brand-700 text-white"
                  : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100",
              )}
            >
              <p className={cn("text-[11px] font-medium", item.is_admin ? "text-brand-100" : "text-slate-500")}>
                {item.author} · {formatDateTime(item.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendReply} className="border-t border-slate-200 bg-white p-3">
        {isAdmin && message.source === "contact" ? (
          <p className="mb-2 text-[11px] text-amber-700">Réponse interne. Pour écrire au visiteur, utilisez son e-mail.</p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            required
            className="flex-1"
            placeholder="Écrire un message…"
          />
          <Button type="submit" loading={sending} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
