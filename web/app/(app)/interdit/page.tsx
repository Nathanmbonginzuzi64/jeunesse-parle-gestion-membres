import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase">Erreur 403</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Accès refusé</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Vous n’avez pas l’autorisation d’accéder à cette ressource.
      </p>
      <Link href="/tableau-de-bord" className="mt-6">
        <Button>Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}
