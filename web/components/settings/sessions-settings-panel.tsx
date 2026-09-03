"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, LogOut, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { api, ApiError, setToken } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatRelative } from "@/lib/utils";

export interface AuthSessionRow {
  id: number;
  name: string;
  portal: string;
  is_current: boolean;
  last_used_at: string | null;
  created_at: string | null;
}

function portalIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("ios")) {
    return Smartphone;
  }
  return Laptop;
}

export function SessionsSettingsPanel() {
  const toast = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<AuthSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | "all" | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: AuthSessionRow[] }>("/auth/sessions");
      setSessions(response.data ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function revoke(id: number) {
    setBusy(id);
    try {
      const response = await api.delete<{ message: string }>(`/auth/sessions/${id}`);
      toast.success(response.message);
      await reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Déconnexion impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeAll() {
    if (!window.confirm("Déconnecter tous les appareils ? Vous serez déconnecté immédiatement.")) {
      return;
    }
    setBusy("all");
    try {
      const response = await api.post<{ message: string }>("/auth/logout-all");
      toast.success(response.message);
      setToken(null);
      router.replace("/connexion");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
      setBusy(null);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Appareils connectés"
          description={`${sessions.length} session(s) Sanctum active(s)`}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={busy === "all"}
              onClick={() => void revokeAll()}
            >
              <LogOut className="h-4 w-4" />
              Tout déconnecter
            </Button>
          }
        />
        <CardBody className="p-0">
          {sessions.length === 0 ? (
            <EmptyState title="Aucune session" description="Reconnectez-vous pour créer une session." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const Icon = portalIcon(session.name);
                return (
                  <li key={session.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{session.name || "Appareil"}</p>
                        {session.is_current ? <Badge tone="success">Actif maintenant</Badge> : null}
                        <Badge tone="neutral">{session.portal}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Créé {session.created_at ? formatDateTime(session.created_at) : "—"}
                        {" · "}
                        Dernière activité{" "}
                        {session.last_used_at ? formatRelative(session.last_used_at) : "inconnue"}
                      </p>
                    </div>
                    {!session.is_current ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={busy === session.id}
                        onClick={() => void revoke(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        Déconnecter
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
