import { Card, CardBody } from "@/components/ui/card";

const VALUES = [
  { title: "Mission", text: "Donner à la jeunesse congolaise un cadre d’identification, de formation et d’engagement citoyen à l’échelle nationale." },
  { title: "Vision", text: "Une jeunesse organisée, visible, responsable et capable de porter les priorités du pays dans chaque province." },
  { title: "Objectifs", text: "Recenser les membres, structurer les coordinations, délivrer une carte unique et mesurer la mobilisation." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-wider text-brand-700 uppercase">À propos</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">La Jeunesse Parle</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        Mouvement national de la jeunesse en République Démocratique du Congo. La plateforme de gestion
        des membres permet d’inscrire, d’identifier et de mobiliser les adhérents dans le respect du
        cloisonnement territorial.
      </p>
      <div className="mt-10 grid gap-4">
        {VALUES.map((item) => (
          <Card key={item.title}>
            <CardBody>
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="font-semibold text-slate-900">Valeurs</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <li>Confiance et intégrité</li>
          <li>Organisation territoriale</li>
          <li>Identité nationale</li>
          <li>Modernité technologique</li>
          <li>Inclusion des jeunes</li>
          <li>Rigueur institutionnelle</li>
        </ul>
      </div>
    </div>
  );
}
