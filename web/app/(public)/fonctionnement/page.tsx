import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Inscription", text: "Vous renseignez votre identité, vos contacts, votre localisation et votre profil." },
  { title: "Vérification", text: "Les informations sont contrôlées pour éviter les doublons et sécuriser le dossier." },
  { title: "Validation", text: "Un responsable de votre périmètre active l’adhésion." },
  { title: "Carte membre", text: "Une carte avec identifiant JP-RDC et QR code est générée." },
  { title: "Participation", text: "Vous rejoignez les activités, formations et missions de votre structure." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Comment ça marche</h1>
      <p className="mt-3 text-slate-600">Un parcours simple, du premier formulaire jusqu’à la carte officielle.</p>
      <ol className="mt-10 space-y-0">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-8 pl-2">
            {index < STEPS.length - 1 && (
              <span className="absolute top-8 left-[1.15rem] h-[calc(100%-1.5rem)] w-px bg-slate-200" />
            )}
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{step.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/inscription">
        <Button>Commencer l’inscription</Button>
      </Link>
    </div>
  );
}
