"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const LINKS = [
  { href: "/jp-message", label: "Contacter l'administration (JP Message)" },
  { href: "/a-propos", label: "À propos de Jeunesse Parle" },
  { href: "/parametres/a-propos", label: "Conditions & mentions" },
];

const FAQ = [
  {
    q: "Comment changer mon mot de passe ?",
    a: "Paramètres → Sécurité → Mot de passe.",
  },
  {
    q: "Comment activer la biométrie ?",
    a: "Paramètres → Biométrie, puis suivez Windows Hello / WebAuthn.",
  },
  {
    q: "Ma carte n'apparaît pas",
    a: "La carte est générée après validation du dossier membre par un responsable.",
  },
];

export default function ParametresAidePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Centre d'aide" description="FAQ et assistance Jeunesse Parle." />
        <CardBody className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{item.q}</p>
              <p className="mt-1 text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Assistance" />
        <CardBody className="space-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
