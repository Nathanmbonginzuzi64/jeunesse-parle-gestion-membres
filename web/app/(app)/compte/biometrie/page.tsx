"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Trash2 } from "lucide-react";
import { BiometricModal } from "@/components/biometrics/biometric-modal";
import { PageHeader } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { isWebAuthnAvailable } from "@/lib/biometrics/webauthn-client";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/auth-redirect";
import { formatDateTime } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

type CredentialRow = {
  id: number;
  device_name: string | null;
  created_at: string | null;
  last_used_at: string | null;
};

export default function BiometriePage() {
  const toast = useToast();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const onboarding = Boolean(user?.must_confirm_biometric);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  const available = isWebAuthnAvailable();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: CredentialRow[] }>("/biometrics/credentials");
      setCredentials(response.data ?? []);
    } catch (caught) {
      const detail =
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Impossible de charger les credentials.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function revoke(id: number) {
    setRevoking(id);
    try {
      await api.delete(`/biometrics/credentials/${id}`);
      toast.success("Credential biométrique révoqué.");
      await reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Révocation impossible.");
    } finally {
      setRevoking(null);
    }
  }

  async function handleOnboardingSuccess() {
    toast.success("Empreinte confirmée.");
    await refresh();
    const me = await api.get<{ user: AuthUser }>("/auth/me");
    router.replace(getPostLoginPath(me.user));
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title={onboarding ? "Confirmer votre empreinte" : "Biométrie"} />

      {onboarding && (
        <Alert tone="info">
          Votre empreinte a déjà été enregistrée lors de votre adhésion. Utilisez{" "}
          <strong>Windows Hello</strong> sur cet appareil pour la confirmer — vous n&apos;avez pas
          besoin d&apos;enregistrer une nouvelle empreinte.
        </Alert>
      )}

      {!available && (
        <Alert tone="warning">
          Biométrie indisponible sur cet appareil. Utilisez un navigateur compatible avec Windows Hello
          / WebAuthn (Chrome, Edge) sur localhost ou HTTPS.
        </Alert>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {onboarding ? (
        <Card>
          <CardHeader
            title="Confirmer l'empreinte enregistrée"
            description="Validez l'identité biométrique associée à votre dossier membre."
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center">
              <Fingerprint className="mx-auto h-12 w-12 text-brand-600" />
              <p className="mt-2 text-sm text-slate-600">
                {loading
                  ? "Chargement de votre empreinte…"
                  : credentials.length > 0
                    ? "Empreinte trouvée sur votre dossier. Confirmez-la avec Windows Hello."
                    : "Aucune empreinte liée à votre dossier. Contactez un responsable si le problème persiste."}
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-4 w-full"
                disabled={!available || loading || credentials.length === 0}
                onClick={() => setModalOpen(true)}
              >
                <Fingerprint className="h-4 w-4" />
                Confirmer mon empreinte
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Configurer mon empreinte"
            description="Enregistrez Windows Hello pour vous connecter, être identifié ou pointer une présence."
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center">
              <Fingerprint className="mx-auto h-12 w-12 text-brand-600" />
              <p className="mt-2 text-sm text-slate-600">
                Aucune image d&apos;empreinte n&apos;est stockée — uniquement une clé publique WebAuthn.
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-4 w-full"
                disabled={!available}
                onClick={() => setModalOpen(true)}
              >
                <Fingerprint className="h-4 w-4" />
                Configurer mon empreinte
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Appareils enregistrés"
          description={onboarding ? "Empreinte enregistrée sur votre dossier." : "Credentials liés à votre compte."}
        />
        <CardBody>
          {loading ? (
            <PageLoader />
          ) : credentials.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun credential biométrique pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {credentials.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.device_name || "Windows Hello"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Créé {item.created_at ? formatDateTime(item.created_at) : "—"}
                      {item.last_used_at
                        ? ` · Dernier usage ${formatDateTime(item.last_used_at)}`
                        : ""}
                    </p>
                  </div>
                  {!onboarding && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={revoking === item.id}
                      onClick={() => void revoke(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Révoquer
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <BiometricModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        context={onboarding ? "SECURITY_CONFIRMATION" : "BIOMETRIC_REGISTRATION"}
        onSuccess={async () => {
          if (onboarding) {
            setModalOpen(false);
            await handleOnboardingSuccess();
            return;
          }
          toast.success("Biométrie configurée.");
          await reload();
          await refresh();
        }}
      />
    </div>
  );
}
