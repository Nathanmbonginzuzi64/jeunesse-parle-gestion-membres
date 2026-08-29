import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold tracking-wider text-brand-700 uppercase">Erreur 404</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cette page n’existe pas</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Le lien est incorrect ou la ressource a été déplacée.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button variant="outline">Accueil</Button>
        </Link>
        <Link href="/tableau-de-bord">
          <Button>Retour au tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
