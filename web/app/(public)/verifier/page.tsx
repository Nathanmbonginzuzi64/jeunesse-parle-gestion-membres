"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, CircleHelp, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { PublicAvatar } from "@/components/ui/avatar";
import { api, ApiError } from "@/lib/api";
import type { VerificationResult } from "@/lib/types";

export default function PublicVerifyPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.public.post<VerificationResult>("/members/verify", { token });
      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setResult(caught.payload as unknown as VerificationResult);
        setError(caught.message);
      } else {
        setError("Vérification impossible.");
      }
    } finally {
      setLoading(false);
    }
  }

  const tone =
    result?.result === "valid"
      ? "success"
      : result?.result === "expired"
        ? "warning"
        : result
          ? "error"
          : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vérifier un membre</h1>
      <p className="mt-3 text-sm text-slate-600">
        Saisissez l’identifiant JP-RDC ou le code de vérification figurant sur la carte. Le scan QR
        ouvre automatiquement cette même vérification.
      </p>

      <Card className="mt-8">
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Identifiant ou code"
              placeholder="JP-RDC-00000001 ou jeton QR"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              <ScanLine className="h-4 w-4" />
              Vérifier
            </Button>
          </form>
        </CardBody>
      </Card>

      {error && !result?.member && (
        <Alert tone="error" className="mt-4" title="Membre introuvable">
          {error}
        </Alert>
      )}

      {result?.member && (
        <Card className="mt-6">
          <CardBody className="flex gap-4">
            <PublicAvatar src={result.member.photo_url} name={result.member.full_name} size="lg" />
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                {tone === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {tone === "warning" && <CircleAlert className="h-5 w-5 text-amber-600" />}
                {tone === "error" && <CircleHelp className="h-5 w-5 text-red-600" />}
                {result.member.full_name}
              </p>
              <p className="font-mono text-xs text-slate-500">{result.member.member_code}</p>
              <p className="mt-2 text-sm text-slate-600">
                {result.member.province} · {result.member.structure ?? "—"}
              </p>
              <p className="mt-1 text-sm font-medium">{result.message}</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
