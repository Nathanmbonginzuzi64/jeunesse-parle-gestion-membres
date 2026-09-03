"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  Search,
  UserRound,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { BiometricEnrollmentField } from "@/components/members/biometric-enrollment-field";
import { FingerprintCaptureField } from "@/components/members/fingerprint-capture-field";
import { FingerprintAttendancePanel } from "@/components/attendance/fingerprint-attendance-panel";
import { BiometricModal } from "@/components/biometrics/biometric-modal";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { api, ApiError } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import {
  allFingerprintsCaptured,
  emptyFingerprintMap,
  fingerprintListFromMap,
  type FingerprintCaptureMap,
} from "@/lib/fingerprints";
import type { WebAuthnEnrollmentPayload } from "@/lib/biometrics/types";
import type { Activity, Member, Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Step = "search" | "enroll" | "attendance";

export default function MembresEmpreintesPage() {
  return (
    <RequirePermission permission={[PERMISSIONS.membersUpdate, PERMISSIONS.membersCreate]}>
      <EmpreintesWorkspace />
    </RequirePermission>
  );
}

function EmpreintesWorkspace() {
  const toast = useToast();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounced(query, 300);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [webauthn, setWebauthn] = useState<WebAuthnEnrollmentPayload | null>(null);
  const [fingerprints, setFingerprints] = useState<FingerprintCaptureMap>(emptyFingerprintMap());
  const [saving, setSaving] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState<number | null>(null);
  const [helloOpen, setHelloOpen] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  const loadSearch = useCallback(async () => {
    if (!debouncedQ.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await api.get<Paginated<Member>>("/members", {
        q: debouncedQ.trim(),
        per_page: 12,
      });
      setResults(response.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    void loadSearch();
  }, [loadSearch]);

  useEffect(() => {
    void api
      .get<Paginated<Activity>>("/activities/for-attendance", { per_page: 40 })
      .then((res) => setActivities(res.data ?? []))
      .catch(() => setActivities([]));
  }, []);

  function pickMember(member: Member) {
    setSelected(member);
    setWebauthn(null);
    setFingerprints(emptyFingerprintMap());
    setEnrollError(null);
    setAttendanceMsg(null);
    setStep("enroll");
  }

  async function saveEnrollment() {
    if (!selected) return;
    const list = fingerprintListFromMap(fingerprints);
    const hasFp = allFingerprintsCaptured(fingerprints);
    const hasHello = Boolean(webauthn);

    if (!hasFp && !hasHello) {
      setEnrollError("Enregistrez Windows Hello et/ou les 6 empreintes DigitalPersona.");
      return;
    }

    setSaving(true);
    setEnrollError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (hasHello) payload.webauthn_enrollment = webauthn;
      if (hasFp) {
        payload.fingerprints = list.map((item) => ({
          slot: item.slot,
          template_hash: item.template_hash,
          hand: item.hand,
          finger: item.finger,
          captured_at: item.captured_at,
        }));
      }

      const response = await api.put<{ data?: Member; message?: string }>(
        `/members/${selected.id}`,
        payload,
      );
      const updated = response.data ?? selected;
      setSelected({
        ...updated,
        fingerprint_enrolled: true,
        fingerprints_count: hasFp ? list.length : updated.fingerprints_count ?? 1,
      });
      toast.success(response.message ?? "Empreintes enregistrées.");
      setStep("attendance");
    } catch (caught) {
      setEnrollError(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const activityOptions = useMemo(
    () =>
      activities.map((item) => ({
        value: String(item.id),
        label: `${item.title}${item.starts_at ? ` · ${new Date(item.starts_at).toLocaleDateString("fr-FR")}` : ""}`,
      })),
    [activities],
  );

  return (
    <DashboardAnimate className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Membres", href: "/membres" },
          { label: "Empreintes" },
        ]}
      />

      <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-5 text-white shadow-[var(--shadow-elevated)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
              <Fingerprint className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
                SuperAdmin · Membres
              </p>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Empreintes &amp; présence
              </h1>
              <p className="mt-1 max-w-xl text-sm text-brand-100/90">
                Recherchez un membre, enregistrez Windows Hello ou DigitalPersona, puis confirmez
                sa présence sur une activité.
              </p>
            </div>
          </div>
          <Link
            href="/membres"
            className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15 hover:bg-white/20"
          >
            Retour au registre
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "search", label: "1. Recherche" },
            { id: "enroll", label: "2. Enregistrement" },
            { id: "attendance", label: "3. Présence" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id !== "search" && !selected) return;
              setStep(item.id);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              step === item.id
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              item.id !== "search" && !selected && "opacity-40",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {step === "search" && (
        <Card>
          <CardHeader
            title="Rechercher un membre"
            description="Code, nom ou téléphone — sélectionnez un dossier existant."
          />
          <CardBody className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex. JP-…, Mbongi, +243…"
                className="pl-9"
              />
            </div>

            {searching && <p className="text-xs text-slate-500">Recherche…</p>}

            {!searching && debouncedQ.trim() && results.length === 0 && (
              <EmptyState
                title="Aucun membre trouvé"
                description="Vérifiez l’orthographe ou créez d’abord le dossier membre."
              />
            )}

            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {results.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => pickMember(member)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-brand-50/50"
                  >
                    <Avatar src={member.photo_url} name={member.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {member.full_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {member.member_code}
                        {member.structure?.name ? ` · ${member.structure.name}` : ""}
                        {member.phone ? ` · ${member.phone}` : ""}
                      </p>
                    </div>
                    {member.fingerprint_enrolled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Empreinte
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        À enrôler
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {step === "enroll" && selected && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar src={selected.photo_url} name={selected.full_name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{selected.full_name}</p>
                  <p className="text-xs text-slate-500">{selected.member_code}</p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <UserRound className="h-3.5 w-3.5" />
                  Statut biométrie
                </p>
                <p className="mt-1">
                  {selected.fingerprint_enrolled
                    ? `Déjà enregistré (${selected.fingerprints_count ?? "—"} credential)`
                    : "Aucune empreinte pour l’instant"}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setStep("search")}>
                Changer de membre
              </Button>
              {selected.fingerprint_enrolled && (
                <Button type="button" onClick={() => setStep("attendance")}>
                  Passer à la présence
                </Button>
              )}
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Windows Hello"
                description="Credential WebAuthn lié au membre (identification sans image d’empreinte)."
              />
              <CardBody>
                <BiometricEnrollmentField
                  value={webauthn}
                  onChange={setWebauthn}
                  displayName={selected.full_name}
                  userName={selected.phone || selected.member_code}
                  alreadyEnrolled={Boolean(selected.fingerprint_enrolled) && !webauthn}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="DigitalPersona (6 doigts)"
                description="Lecteur HID ou simulation labo — auriculaires, index et majeurs."
              />
              <CardBody>
                <FingerprintCaptureField
                  value={fingerprints}
                  onChange={setFingerprints}
                  memberSeed={selected.member_code}
                  error={enrollError}
                />
              </CardBody>
            </Card>

            {enrollError && <Alert tone="danger">{enrollError}</Alert>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("search")}>
                Annuler
              </Button>
              <Button type="button" loading={saving} onClick={() => void saveEnrollment()}>
                Enregistrer les empreintes
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "attendance" && selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Choisir l’activité"
              description={`Pointage pour ${selected.full_name} (${selected.member_code})`}
            />
            <CardBody className="space-y-4">
              <Select
                label="Activité"
                value={activityId ? String(activityId) : ""}
                onChange={(event) => setActivityId(Number(event.target.value) || null)}
                placeholder="Sélectionner…"
                options={activityOptions}
              />
              {!activityId && (
                <p className="text-xs text-slate-500">
                  Sélectionnez une activité ouverte au pointage.
                </p>
              )}
              {attendanceMsg && <Alert tone="success">{attendanceMsg}</Alert>}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!activityId}
                  onClick={() => setHelloOpen(true)}
                >
                  <Fingerprint className="h-4 w-4" />
                  Présence via Hello
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep("enroll")}>
                  Revoir l’enrôlement
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Présence DigitalPersona"
              description="Identifie le membre par empreinte et enregistre la présence."
            />
            <CardBody>
              {activityId ? (
                <FingerprintAttendancePanel
                  activityId={activityId}
                  initialMemberCode={selected.member_code}
                  onRecorded={(result) => {
                    setAttendanceMsg(
                      result.message ||
                        `Présence enregistrée pour ${result.full_name ?? selected.full_name}.`,
                    );
                    toast.success("Présence confirmée.");
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  Choisissez d’abord une activité.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {activityId && (
        <BiometricModal
          open={helloOpen}
          onClose={() => setHelloOpen(false)}
          context="ATTENDANCE"
          activityId={activityId}
          onSuccess={(result) => {
            setHelloOpen(false);
            setAttendanceMsg(result.message || "Présence enregistrée via Windows Hello.");
            toast.success("Présence confirmée.");
          }}
        />
      )}
    </DashboardAnimate>
  );
}
