"use client";

import { Building2, GitBranch, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StructuresView = "tree" | "table" | "cards";

const VIEWS: Array<{ id: StructuresView; label: string; icon: typeof GitBranch; description: string }> = [
  { id: "tree", label: "Arbre territorial", icon: GitBranch, description: "Hiérarchie provinces → villes → structures" },
  { id: "table", label: "Registre", icon: Table2, description: "Liste complète avec actions" },
  { id: "cards", label: "Cartes", icon: LayoutGrid, description: "Aperçu visuel par structure" },
];

export function StructuresViewNav({
  value,
  onChange,
  resultCount,
}: {
  value: StructuresView;
  onChange: (view: StructuresView) => void;
  resultCount?: number;
}) {
  const activeMeta = VIEWS.find((view) => view.id === value) ?? VIEWS[0];

  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
        {VIEWS.map((view) => {
          const active = value === view.id;
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onChange(view.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {view.label}
            </button>
          );
        })}
      </nav>
      <p className="text-sm text-slate-500">
        <Building2 className="mr-1.5 inline h-4 w-4 align-text-bottom text-brand-600" />
        {activeMeta.description}
        {resultCount !== undefined && value !== "tree" && (
          <span className="ml-1 font-medium text-slate-700">· {resultCount} résultat(s)</span>
        )}
      </p>
    </div>
  );
}
