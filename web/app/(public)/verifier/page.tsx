"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, CircleHelp, ScanLine, ShieldCheck } from "lucide-react";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { Button } from "@/components/ui/button";
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
    <div className="bg-[var(--background)] pb-16">
      <PublicPageHero
        eyebrow="Vérification"
        title="Vérifier un membre"
        description="Saisissez l’identifiant JP-RDC ou le code de vérification figurant sur la carte. Le scan QR ouvre automatiquement cette même vérification."
        tone="deep"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-brand-50">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
          Contrôle public · résultat immédiat
        </div>
      </PublicPageHero>

      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <RevealOnScroll>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-elevated)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-6 py-4">
              <p className="text-sm font-semibold text-slate-900">Identifiant ou jeton</p>
              <p className="text-xs text-slate-500">Format : JP-RDC-00000001 ou code QR</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 p-6">
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
          </div>
        </RevealOnScroll>

        {error && !result?.member && (
          <RevealOnScroll>
            <Alert tone="error" className="mt-4" title="Membre introuvable">
              {error}
            </Alert>
          </RevealOnScroll>
        )}

        {result?.member && (
          <RevealOnScroll>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)]">
              <div
                className={`h-1.5 ${
                  tone === "success"
                    ? "bg-emerald-500"
                    : tone === "warning"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              />
              <div className="flex gap-4 p-5">
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
                  <p className="mt-1 text-sm font-medium text-slate-800">{result.message}</p>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        )}
      </div>
    </div>
  );
}
