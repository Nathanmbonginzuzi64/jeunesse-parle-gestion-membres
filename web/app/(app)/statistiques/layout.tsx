"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/statistiques", label: "Analyses", icon: BarChart3, exact: true },
  { href: "/statistiques/rapports", label: "Rapports", icon: FileText },
];

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
