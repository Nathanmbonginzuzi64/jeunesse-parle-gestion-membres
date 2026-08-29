"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IdCard, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/cartes", label: "Registre", icon: IdCard, match: (path: string) => path === "/cartes" },
  { href: "/cartes/galerie", label: "Galerie visuelle", icon: LayoutGrid, match: (path: string) => path.startsWith("/cartes/galerie") },
];

export function CardsSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
      {SECTIONS.map((section) => {
        const active = section.match(pathname);
        const Icon = section.icon;
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
