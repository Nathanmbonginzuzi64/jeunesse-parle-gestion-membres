"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative } from "@/lib/utils";

interface MessageDetail {
  id: number;
  reference: string;
  subject: string;
  category: string;
  body: string;
  status: string;
  created_at: string;
  member?: {
    member_code: string;
    full_name: string;
    photo_url?: string | null;
    province?: string;
    commune?: string;
    structure?: string;
  };
  replies?: Array<{
    id: number;
    body: string;
    author: string;
    is_admin: boolean;
    created_at: string;
  }>;
}

export default function JpMessageDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/connexion");
  }, [authLoading, user, router]);

  if (authLoading || !user) return <PageLoader />;

  return <MessageThread isAdmin={user.permissions?.includes(PERMISSIONS.usersView) ?? false} />;
}

function MessageThread({ isAdmin }: { isAdmin: boolean }) {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ data: MessageDetail }>(`/jp-messages/${params.id}`);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/jp-messages/${params.id}/replies`, { body: reply.trim() });
      setReply("");
      reload();
      toast.success("Réponse envoyée.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error || !data?.data) return <Alert tone="danger">{error ?? "Message introuvable."}</Alert>;

  const msg = data.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb
        items={[
          { href: isAdmin ? "/jp-message/gestion" : "/jp-message", label: "JP Message" },
          { label: msg.reference },
        ]}
      />

      <DashboardAnimate>
        <h1 className="text-xl font-semibold">{msg.subject}</h1>
        <p className="text-sm text-slate-500">
          {msg.reference} · {msg.category} · {formatRelative(msg.created_at)}
        </p>
      </DashboardAnimate>

      {msg.member && isAdmin ? (
        <Card>
          <CardBody className="flex items-center gap-4">
            <Avatar src={msg.member.photo_url} name={msg.member.full_name} size="lg" />
            <div>
              <p className="font-semibold">{msg.member.full_name}</p>
              <p className="font-mono text-xs text-slate-500">{msg.member.member_code}</p>
              <p className="text-sm text-slate-600">
                {[msg.member.province, msg.member.commune, msg.member.structure].filter(Boolean).join(" · ")}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{msg.body}</p>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {(msg.replies ?? []).map((r) => (
          <div
            key={r.id}
            className={`rounded-xl px-4 py-3 text-sm ${r.is_admin ? "ml-8 bg-brand-50 text-brand-900" : "mr-8 bg-slate-100 text-slate-800"}`}
          >
            <p className="text-xs font-medium opacity-70">
              {r.author} · {formatDateTime(r.created_at)}
            </p>
            <p className="mt-1">{r.body}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardBody>
          <form onSubmit={sendReply} className="space-y-3">
            <Textarea
              label={isAdmin ? "Réponse administration" : "Votre message"}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              required
            />
            <Button type="submit" loading={sending}>
              <Send className="mr-2 h-4 w-4" />
              Envoyer
            </Button>
          </form>
        </CardBody>
      </Card>

      {!isAdmin ? (
        <Link href="/jp-message" className="text-sm text-brand-700 hover:underline">
          ← Retour à mes messages
        </Link>
      ) : null}
    </div>
  );
}
