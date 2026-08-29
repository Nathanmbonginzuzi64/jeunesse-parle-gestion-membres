"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/connexion");
  }, [loading, user, router]);

  if (loading || !user) {
    return <PageLoader label="Vérification de votre session…" />;
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <div className="no-print">
          <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
      </Suspense>

      <div className="lg:pl-[17.5rem] print:pl-0">
        <div className="no-print">
          <Topbar onOpenMenu={() => setMenuOpen(true)} />
        </div>
        <main className="animate-fade-in mx-auto w-full max-w-[110rem] px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
          {user.must_change_password && (
            <Alert tone="warning" className="mb-4 no-print" title="Changement de mot de passe requis">
              <Link href="/compte/mot-de-passe" className="font-medium underline">
                Définir un nouveau mot de passe
              </Link>{" "}
              avant de continuer.
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
