"use client";

import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { formatRelative } from "@/lib/utils";

interface JpMessageItem {
  id: number;
  reference: string;
  subject: string;
  category: string;
  body: string;
  status: string;
  created_at: string;
  source?: "member" | "contact";
  guest_name?: string | null;
  guest_email?: string | null;
  author_label?: string;
  member?: { member_code: string; full_name: string };
}

export default function JpMessageAdminPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <JpMessageInbox />
    </RequirePermission>
  );
}

function JpMessageInbox() {
  const { data, loading, error } = useApi<{ data: JpMessageItem[] }>("/jp-messages", { per_page: 50 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb items={[{ href: "/activites", label: "Mobilisation" }, { label: "JP Message — Administration" }]} />

      <DashboardAnimate>
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-brand-600" />
          <div>
            <h1 className="text-xl font-semibold">Boîte JP Message</h1>
            <p className="text-sm text-slate-600">Messages des membres et questions envoyées depuis la page Contact</p>
          </div>
        </div>
      </DashboardAnimate>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? <Skeleton className="h-32 w-full" /> : null}

      {!loading && !data?.data.length ? (
        <EmptyState title="Aucun message" />
      ) : (
        <ul className="space-y-3">
          {data?.data.map((msg) => (
            <li key={msg.id}>
              <Link href={`/jp-message/${msg.id}`}>
                <Card className="overflow-hidden border-slate-200/80 transition hover:border-brand-300 hover:shadow-md">
                  <div className={`h-1 ${msg.source === "contact" ? "bg-amber-400" : "bg-brand-500"}`} />
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{msg.subject}</p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                              msg.source === "contact"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-brand-50 text-brand-800"
                            }`}
                          >
                            {msg.source === "contact" ? "Contact" : "Membre"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {msg.reference} · {msg.author_label ?? msg.member?.full_name ?? "—"} · {formatRelative(msg.created_at)}
                        </p>
                        {msg.guest_email ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5 text-brand-500" />
                            {msg.guest_email}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{msg.status}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {msg.body}
                    </p>
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
