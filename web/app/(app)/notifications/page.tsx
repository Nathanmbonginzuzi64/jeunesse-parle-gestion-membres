"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Can } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { AppNotification, Paginated } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

const LEVEL_TONES: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50",
  info: "border-brand-200 bg-brand-50",
  warning: "border-amber-200 bg-amber-50",
  danger: "border-red-200 bg-red-50",
};

export default function NotificationsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useApi<Paginated<AppNotification>>("/notifications", {
    page,
    per_page: 20,
  });

  async function markAll() {
    try {
      await api.post("/notifications/read-all");
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    }
  }

  async function markOne(id: number) {
    try {
      await api.post(`/notifications/${id}/read`);
      reload();
    } catch {
      /* silencieux */
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const response = await api.post<{ message: string }>("/notifications", { title, body, level });
      toast.success(response.message);
      setCreateOpen(false);
      setTitle("");
      setBody("");
      setLevel("info");
      reload();
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(fieldErrors(caught));
      else toast.error("Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alertes système, validations et mobilisation."
        actions={
          <>
            <Can permission={PERMISSIONS.notificationsSend}>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Créer
              </Button>
            </Can>
            <Button variant="outline" size="sm" onClick={() => void markAll()}>
              Tout marquer comme lu
            </Button>
          </>
        }
      />
      {error && <Alert tone="error">{error}</Alert>}
      {loading && <PageLoader />}
      {!loading && data?.data.length === 0 && (
        <EmptyState title="Aucune notification" description="Les validations, cartes et activités apparaîtront ici." />
      )}
      <Card>
        <ul className="divide-y divide-slate-100">
          {data?.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => !item.is_read && void markOne(item.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition",
                  !item.is_read && "bg-brand-50/40",
                )}
              >
                <div className={cn("rounded-lg border px-3 py-2", LEVEL_TONES[item.level] ?? LEVEL_TONES.info)}>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  {item.body && <p className="mt-0.5 text-xs text-slate-600">{item.body}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">{formatRelative(item.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
        {data && (
          <Pagination
            page={data.meta.current_page}
            lastPage={data.meta.last_page}
            total={data.meta.total}
            perPage={data.meta.per_page}
            onChange={setPage}
            label="notifications"
          />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle notification" size="md">
        <form onSubmit={onCreate} className="space-y-4">
          <Input label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} error={errors.body} />
          <Select
            label="Niveau"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={[
              { value: "info", label: "Information" },
              { value: "success", label: "Succès" },
              { value: "warning", label: "Avertissement" },
              { value: "danger", label: "Urgent" },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting}>
              Envoyer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
