"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function ParametresAProposPage() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Logo size={48} />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Jeunesse Parle</h2>
            <p className="text-sm text-slate-500">Plateforme numérique de la jeunesse — République Démocratique du Congo</p>
            <p className="mt-2 font-mono text-xs text-slate-400">Version {version}</p>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Documents" />
        <CardBody className="space-y-2 text-sm">
          <Link href="/a-propos" className="block text-brand-700 hover:underline">
            Informations générales
          </Link>
          <p className="text-slate-500">Conditions d&apos;utilisation et politique de confidentialité — disponibles sur le site public.</p>
          <p className="text-slate-500">Mentions légales et crédits Jeunesse Parle.</p>
        </CardBody>
      </Card>
    </div>
  );
}
