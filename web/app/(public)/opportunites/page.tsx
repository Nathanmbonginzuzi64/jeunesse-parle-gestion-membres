import { Card, CardBody, CardHeader } from "@/components/ui/card";

const ITEMS = [
  { type: "Formation", title: "Numérique et citoyenneté", when: "Septembre 2026", where: "Kinshasa" },
  { type: "Événement", title: "Conférence entrepreneuriat des jeunes", when: "8 septembre 2026", where: "Gombe" },
  { type: "Programme", title: "Cellules provinciales", when: "En cours", where: "26 provinces" },
  { type: "Appel à projets", title: "Initiatives communautaires", when: "Ouvert", where: "National" },
];

export default function OpportunitiesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Opportunités</h1>
      <p className="mt-3 text-slate-600">
        Formations, événements, programmes et appels à projets réservés aux membres identifiés.
      </p>
      <div className="mt-8 grid gap-4">
        {ITEMS.map((item) => (
          <Card key={item.title}>
            <CardHeader title={item.title} description={`${item.type} · ${item.when}`} />
            <CardBody className="pt-0 text-sm text-slate-600">{item.where}</CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
