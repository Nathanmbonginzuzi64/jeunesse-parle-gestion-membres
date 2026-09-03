"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Navigation principale — courte et ordonnée. */
const PRIMARY_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/infos", label: "Actualités" },
  { href: "/open-data", label: "Open Data" },
  { href: "/verifier", label: "Vérifier" },
  { href: "/contact", label: "Contact" },
] as const;

/** Liens secondaires (menu mobile + pied de page). */
const SECONDARY_LINKS = [
  { href: "/fonctionnement", label: "Fonctionnement" },
  { href: "/opportunites", label: "Opportunités" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:h-16">
        <Link href="/" onClick={() => setOpen(false)} className="min-w-0 shrink">
          <BrandMark subtitle="République Démocratique du Congo" />
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!loading && user ? (
            <Link href="/tableau-de-bord">
              <Button size="sm">Espace</Button>
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
              </Link>
              <Link href="/inscription">
                <Button size="sm">Rejoindre</Button>
              </Link>
            </>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 xl:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 xl:hidden">
          <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu
          </p>
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm",
                isActive(pathname, link.href)
                  ? "bg-brand-50 font-medium text-brand-800"
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-2 border-t border-slate-100" />
          <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Plus
          </p>
          {SECONDARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandMark subtitle="Gestion des membres" />
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Plateforme nationale d’inscription, d’identification et de mobilisation de la jeunesse congolaise.
          </p>
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
