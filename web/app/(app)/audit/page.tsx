"use client";

import { useState } from "react";
import { Shield, User } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { AuditLog, Paginated } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

const ACTION_TONES: Record<string, string> = {
  auth: "bg-slate-100 text-slate-700",
  member: "bg-brand-100 text-brand-800",
  card: "bg-emerald-100 text-emerald-800",
  export: "bg-amber-100 text-amber-800",
};

function actionTone(action: string) {
  const key = action.split(".")[0] ?? action;
  return ACTION_TONES[key] ?? "bg-slate-100 text-slate-700";
}

export default function AuditPage() {
  return (
    <RequirePermission permission={PERMISSIONS.auditView}>
      <AuditList />
    </RequirePermission>
  );
}

function AuditList() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const debounced = useDebounced(action);
  const { data, loading, error } = useApi<Paginated<AuditLog>>("/audit", {
    page,
    action: debounced || undefined,
    per_page: 30,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/parametres", label: "Administration" }, { label: "Journal d'audit" }]} />
      <PageHeader
        title="Journal d'audit"
        description="Connexions, validations, cartes, exports et changements de statut."
      />
      <Card>
        <div className="border-b border-slate-200 p-4">
          <Input
            placeholder="Filtrer par action (ex. member, auth, card)"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {loading && <TableSkeleton />}
        {!loading && data?.data.length === 0 && <EmptyState title="Aucun événement" />}
        {!loading && data && data.data.length > 0 && (
          <>
            <ol className="relative divide-y divide-slate-100 before:absolute before:inset-y-0 before:left-[1.65rem] before:w-px before:bg-slate-200">
              {data.data.map((log) => (
                <li key={log.id} className="relative flex gap-4 px-5 py-4">
                  <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-medium", actionTone(log.action))}>
                        {log.action}
                      </span>
                      <time className="text-[11px] text-slate-400">{formatDateTime(log.created_at)}</time>
                    </div>
                    <p className="mt-1 text-sm text-slate-800">{log.description ?? "—"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user?.name ?? "Système"}
                      </span>
                      {log.subject_type && (
                        <span>
                          Cible : {log.subject_type}
                          {log.subject_id ? ` #${log.subject_id}` : ""}
                        </span>
                      )}
                      {log.ip_address && <span className="font-mono">{log.ip_address}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <Pagination
              page={data.meta.current_page}
              lastPage={data.meta.last_page}
              total={data.meta.total}
              perPage={data.meta.per_page}
              onChange={setPage}
              label="événements"
            />
          </>
        )}
      </Card>
    </div>
  );
}
