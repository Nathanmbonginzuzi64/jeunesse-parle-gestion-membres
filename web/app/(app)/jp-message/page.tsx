"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Send } from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils";

interface JpMessageItem {
  id: number;
  reference: string;
  subject: string;
  category: string;
  body: string;
  status: string;
  created_at: string;
  member?: { member_code: string; full_name: string };
}

const CATEGORIES = [
  { value: "plainte", label: "Plainte" },
  { value: "suggestion", label: "Suggestion" },
  { value: "doleance", label: "Doléance" },
  { value: "demande", label: "Demande" },
  { value: "preoccupation", label: "Préoccupation" },
];

export default function JpMessagePage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ data: JpMessageItem[] }>("/jp-messages");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("demande");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/jp-messages", { subject, category, body });
      toast.success("Message envoyé à l'administration.");
      setSubject("");
      setBody("");
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb items={[{ href: "/mon-espace", label: "Mon espace" }, { label: "JP Message" }]} />

      <DashboardAnimate>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">JP Message</h1>
            <p className="text-sm text-slate-600">Plaintes, suggestions et préoccupations</p>
          </div>
        </div>
      </DashboardAnimate>

      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-3">
            <Input label="Sujet" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <Select label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
            <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
            <Button type="submit" loading={sending}>
              <Send className="mr-2 h-4 w-4" />
              Envoyer
            </Button>
          </form>
        </CardBody>
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? <Skeleton className="h-32 w-full" /> : null}

      {!loading && !data?.data.length ? (
        <EmptyState title="Aucun message" description="Vos échanges avec l'administration apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {data?.data.map((msg) => (
            <li key={msg.id}>
              <Link href={`/jp-message/${msg.id}`}>
                <Card className="transition hover:border-brand-300">
                  <CardBody>
                    <p className="font-medium text-slate-900">{msg.subject}</p>
                    <p className="text-xs text-slate-500">
                      {msg.reference} · {msg.category} · {formatRelative(msg.created_at)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{msg.body}</p>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
