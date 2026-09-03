"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Trash2 } from "lucide-react";
import { BiometricModal } from "@/components/biometrics/biometric-modal";
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

export function BiometricSettingsPanel() {
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
      setError(caught instanceof ApiError ? caught.message : "Impossible de charger les credentials.");
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
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Révocation impossible.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {onboarding && (
        <Alert tone="info">
          Confirmez votre empreinte avec Windows Hello / WebAuthn. Aucune image biométrique brute n&apos;est stockée.
        </Alert>
      )}
      {!available && (
        <Alert tone="warning">
          Biométrie indisponible sur cet appareil. Utilisez un navigateur compatible (Chrome, Edge) en HTTPS ou localhost.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardHeader
          title={onboarding ? "Confirmer l'empreinte" : "Authentification biométrique"}
          description="Passkeys / WebAuthn pour connexion, vérification et présence."
        />
        <CardBody className="space-y-4">
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center">
            <Fingerprint className="mx-auto h-12 w-12 text-brand-600" />
            <p className="mt-2 text-sm text-slate-600">
              Seule une clé publique est conservée — jamais une empreinte brute.
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-4 w-full"
              disabled={!available || (onboarding && credentials.length === 0)}
              onClick={() => setModalOpen(true)}
            >
              <Fingerprint className="h-4 w-4" />
              {onboarding ? "Confirmer mon empreinte" : "Ajouter une authentification"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Appareils autorisés" description="Credentials liés à votre compte." />
        <CardBody>
          {loading ? (
            <PageLoader />
          ) : credentials.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun credential biométrique.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {credentials.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.device_name || "Windows Hello"}</p>
                    <p className="text-xs text-slate-500">
                      Créé {item.created_at ? formatDateTime(item.created_at) : "—"}
                      {item.last_used_at ? ` · Dernier usage ${formatDateTime(item.last_used_at)}` : ""}
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
                      Supprimer
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
            toast.success("Empreinte confirmée.");
            await refresh();
            const me = await api.get<{ user: AuthUser }>("/auth/me");
            router.replace(getPostLoginPath(me.user));
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
