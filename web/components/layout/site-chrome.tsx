"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/fonctionnement", label: "Fonctionnement" },
  { href: "/opportunites", label: "Opportunités" },
  { href: "/verifier", label: "Vérifier un membre" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" onClick={() => setOpen(false)}>
          <BrandMark subtitle="République Démocratique du Congo" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === link.href ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <Link href="/tableau-de-bord">
              <Button size="sm">Espace interne</Button>
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
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
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
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Plateforme</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/a-propos" className="text-slate-600 hover:text-brand-700">À propos</Link></li>
            <li><Link href="/fonctionnement" className="text-slate-600 hover:text-brand-700">Comment ça marche</Link></li>
            <li><Link href="/inscription" className="text-slate-600 hover:text-brand-700">Devenir membre</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Services</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/verifier" className="text-slate-600 hover:text-brand-700">Vérifier une carte</Link></li>
            <li><Link href="/opportunites" className="text-slate-600 hover:text-brand-700">Opportunités</Link></li>
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
