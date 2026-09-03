"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Tous les liens publics, dans un ordre logique. */
const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/infos", label: "Actualités" },
  { href: "/open-data", label: "Open Data" },
  { href: "/fonctionnement", label: "Fonctionnement" },
  { href: "/opportunites", label: "Opportunités" },
  { href: "/verifier", label: "Vérifier un membre" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function goToInternalSpace() {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    try {
      // Invalide le jeton pour forcer une nouvelle connexion.
      await logout();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 shadow-[0_8px_24px_rgba(16,24,40,0.05)] backdrop-blur-xl">
      <div className="h-0.5 bg-gradient-to-r from-flag-blue via-gold-500 to-flag-red" />
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 lg:h-16">
        <Link href="/" onClick={() => setOpen(false)} className="min-w-0 shrink">
          <BrandMark subtitle="République Démocratique du Congo" />
        </Link>

        <nav className="hidden items-center gap-0.5 2xl:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] font-medium transition-all lg:px-3 lg:text-[13px]",
                isActive(pathname, link.href)
                  ? "bg-brand-50 text-brand-800 shadow-sm ring-1 ring-brand-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/connexion">
            <Button variant="ghost" size="sm">
              Connexion
            </Button>
          </Link>
          {!loading && user ? (
            <Button size="sm" loading={busy} onClick={() => void goToInternalSpace()}>
              Espace interne
            </Button>
          ) : (
            <Link href="/inscription">
              <Button size="sm">Rejoindre</Button>
            </Link>
          )}
          <button
            type="button"
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 2xl:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="max-h-[70vh] overflow-y-auto border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur 2xl:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm transition",
                isActive(pathname, link.href)
                  ? "bg-brand-50 font-medium text-brand-800 ring-1 ring-brand-100"
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-2 border-t border-slate-100" />
          <Link
            href="/connexion"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Connexion
          </Link>
          {!loading && user ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void goToInternalSpace()}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-800 hover:bg-brand-50 disabled:opacity-60"
            >
              Espace interne
            </button>
          ) : (
            <Link
              href="/inscription"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
            >
              Rejoindre
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandMark subtitle="Gestion des membres" />
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Plateforme nationale d’inscription, d’identification et de mobilisation de la jeunesse congolaise.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-flag-blue" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-flag-red" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Découvrir</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/a-propos" className="text-slate-600 hover:text-brand-700">À propos</Link></li>
            <li><Link href="/infos" className="text-slate-600 hover:text-brand-700">Actualités</Link></li>
            <li><Link href="/open-data" className="text-slate-600 hover:text-brand-700">Open Data</Link></li>
            <li><Link href="/fonctionnement" className="text-slate-600 hover:text-brand-700">Fonctionnement</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Services</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/verifier" className="text-slate-600 hover:text-brand-700">Vérifier une carte</Link></li>
            <li><Link href="/opportunites" className="text-slate-600 hover:text-brand-700">Opportunités</Link></li>
            <li><Link href="/inscription" className="text-slate-600 hover:text-brand-700">Devenir membre</Link></li>
            <li><Link href="/contact" className="text-slate-600 hover:text-brand-700">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Espace interne</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/connexion" className="text-slate-600 hover:text-brand-700">Connexion</Link></li>
            <li><Link href="/mot-de-passe-oublie" className="text-slate-600 hover:text-brand-700">Mot de passe oublié</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} La Jeunesse Parle — République Démocratique du Congo
      </p>
    </footer>
  );
}
