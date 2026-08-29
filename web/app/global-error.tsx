"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Erreur serveur</h1>
        <p className="mt-2 text-sm text-slate-600">
          Une erreur inattendue s&apos;est produite. Nos équipes peuvent être informées automatiquement.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => reset()}>Réessayer</Button>
          <Link href="/tableau-de-bord">
            <Button variant="outline">Tableau de bord</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
