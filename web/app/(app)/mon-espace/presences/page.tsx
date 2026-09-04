"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { cn, formatDateTime } from "@/lib/utils";

type MemberAttendance = {
  id: number;
  status?: string | null;
  status_label?: string | null;
  method?: string | null;
  recorded_at?: string | null;
  recorded_by?: string | null;
  activity?: {
    id: number;
    code?: string;
    title: string;
    starts_at?: string | null;
    location?: string | null;
    structure?: string | null;
  } | null;
};

type MemberAttendancesResponse = {
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  by_date: Array<{ date: string; items: MemberAttendance[] }>;
  data: MemberAttendance[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

function formatDay(date: string) {
  if (date === "inconnu") return "Date inconnue";
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function statusTone(status?: string | null): "success" | "warning" | "danger" | "neutral" {
  if (status === "present") return "success";
  if (status === "late") return "warning";
  if (status === "absent") return "danger";
  return "neutral";
}

export default function MemberAttendancesPage() {
  const { member } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const query = useMemo(
    () => ({
      page,
      per_page: 20,
      status: status || undefined,
    }),
    [page, status],
  );
  const feed = useApi<MemberAttendancesResponse>(
    member ? "/attendances/for-member" : null,
    query,
    { refreshInterval: 20_000 },
  );

  if (!member) {
    return (
      <Alert tone="info">
        Ce compte n&apos;est pas rattaché à un dossier membre.
      </Alert>
    );
  }

  const summary = feed.data?.summary;
  const byDate = feed.data?.by_date ?? [];
  const meta = feed.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes présences"
        description="Historique de vos pointages aux activités Jeunesse Parle."
        actions={
          <Link href="/mon-espace/activites">
            <Button variant="outline">
              <CalendarDays className="h-4 w-4" />
              Mes activités
            </Button>
          </Link>
        }
      />

      <div className={cn(dashboardCardGrid, "sm:grid-cols-2 xl:grid-cols-4")}>
        <KpiCard
          label="Total"
          value={summary?.total ?? "—"}
          icon={CalendarCheck2}
          tone="neutral"
        />
        <KpiCard
          label="Présents"
          value={summary?.present ?? "—"}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Retards"
          value={summary?.late ?? "—"}
          icon={Clock3}
          tone="warning"
        />
        <KpiCard
          label="Absents"
          value={summary?.absent ?? "—"}
          icon={CalendarDays}
          tone="danger"
        />
      </div>

      <Card>
        <CardHeader
          title="Historique"
          description="Regroupé par date de pointage"
          action={
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "", label: "Tous" },
                  { key: "present", label: "Présents" },
                  { key: "late", label: "Retards" },
                  { key: "absent", label: "Absents" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key || "all"}
                  type="button"
                  onClick={() => {
                    setStatus(opt.key);
                    setPage(1);
                  }}
                  className={
                    status === opt.key
                      ? "rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />
        <CardBody className="space-y-4">
          {feed.error ? <Alert tone="danger">{feed.error}</Alert> : null}
          {feed.loading && !feed.data ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : null}
          {!feed.loading && byDate.length === 0 ? (
            <EmptyState
              title="Aucune présence enregistrée"
              description="Vos pointages apparaîtront ici après inscription et scan à une activité."
              action={
                <Link href="/mon-espace/activites">
                  <Button>Voir mes activités</Button>
                </Link>
              }
            />
          ) : null}

          {byDate.map((group) => (
            <section key={group.date} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {formatDay(group.date)}
              </p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {group.items.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {row.activity?.title ?? "Activité"}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {row.activity?.code ? <span>{row.activity.code}</span> : null}
                        {row.activity?.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {row.activity.location}
                          </span>
                        ) : null}
                        <span>{formatDateTime(row.recorded_at) || "—"}</span>
                        {row.method ? <span className="uppercase">{row.method}</span> : null}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={statusTone(row.status)}>
                        {row.status_label ?? row.status ?? "—"}
                      </Badge>
                      {row.activity?.id ? (
                        <Link
                          href={`/mon-espace/activites/${row.activity.id}`}
                          className="text-[11px] font-medium text-brand-700 hover:underline"
                        >
                          Détail
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {meta ? (
            <Pagination
              page={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              perPage={meta.per_page}
              onChange={setPage}
              label="présences"
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
