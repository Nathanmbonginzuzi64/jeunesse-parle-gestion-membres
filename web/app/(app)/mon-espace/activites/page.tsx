"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, QrCode } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

type TabKey = "upcoming" | "mine" | "past";

type MemberActivity = {
  id: number;
  title: string;
  code?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  status_label?: string;
  type_label?: string;
  is_registered?: boolean;
  description?: string | null;
  structure?: { name?: string } | null;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "À venir" },
  { key: "mine", label: "Mes inscriptions" },
  { key: "past", label: "Passées" },
];

export default function MemberActivitiesPage() {
  const { member } = useAuth();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [items, setItems] = useState<MemberActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: MemberActivity[] }>("/activities/for-member", {
        tab,
        per_page: 40,
      });
      setItems(response.data ?? []);
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiError ? err.message : "Impossible de charger les activités.");
    } finally {
      setLoading(false);
    }
  }, [member, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!member) {
    return (
      <Alert tone="info">
        Ce compte n&apos;est pas rattaché à un dossier membre. Contactez un administrateur.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes activités"
        description="Inscrivez-vous et pointez votre présence avec le QR de votre carte."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={
              tab === item.key
                ? "rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune activité"
          description={
            tab === "mine"
              ? "Vos inscriptions apparaîtront ici."
              : "Les prochaines activités de votre structure apparaîtront ici."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((activity) => (
            <Card key={activity.id} className="overflow-hidden">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {activity.type_label ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                        {activity.type_label}
                      </p>
                    ) : null}
                    <h2 className="text-base font-semibold text-slate-900">{activity.title}</h2>
                    <p className="mt-1 font-mono text-xs text-slate-500">{activity.code}</p>
                  </div>
                  {activity.is_registered ? (
                    <Badge tone="success">Inscrit</Badge>
                  ) : (
                    <Badge tone="neutral">{activity.status_label ?? "Ouverte"}</Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {formatDateTime(activity.starts_at) || "Date à confirmer"}
                  </p>
                  {activity.location ? (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {activity.location}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/mon-espace/activites/${activity.id}`}>
                    <Button size="sm">
                      <QrCode className="h-4 w-4" />
                      Ouvrir
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
