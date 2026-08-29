"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold tracking-wider text-flag-red uppercase">Erreur 500</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Le serveur a rencontré un problème</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        L’opération n’a pas pu aboutir. Réessayez, ou revenez au tableau de bord.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={reset}>
          Réessayer
        </Button>
        <Link href="/tableau-de-bord">
          <Button>Tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
