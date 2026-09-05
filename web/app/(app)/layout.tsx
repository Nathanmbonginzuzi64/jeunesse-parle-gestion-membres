"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;

    if (user.must_change_password && !pathname.startsWith("/compte/mot-de-passe")) {
      router.replace("/compte/mot-de-passe?onboarding=1");
      return;
    }

    if (
      !user.must_change_password &&
      user.must_confirm_biometric &&
      !pathname.startsWith("/compte/biometrie")
    ) {
      router.replace("/compte/biometrie?onboarding=1");
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}

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
        <div className="no-print fixed inset-x-0 top-0 z-30 lg:left-[17.5rem]">
          <Topbar onOpenMenu={() => setMenuOpen(true)} />
        </div>
        <main className="animate-fade-in mx-auto w-full max-w-[110rem] px-4 pt-[4.5rem] pb-6 sm:px-6 lg:px-8 print:max-w-none print:p-0 print:pt-0">
          {user.must_change_password && (
            <Alert tone="warning" className="mb-4 no-print" title="Première connexion — mot de passe">
              <Link href="/compte/mot-de-passe?onboarding=1" className="font-medium underline">
                Définissez votre mot de passe personnel
              </Link>{" "}
              pour sécuriser votre compte portail.
            </Alert>
          )}
          {!user.must_change_password && user.must_confirm_biometric && (
            <Alert tone="warning" className="mb-4 no-print" title="Première connexion — empreinte">
              <Link href="/compte/biometrie?onboarding=1" className="font-medium underline">
                Confirmez votre empreinte enregistrée
              </Link>{" "}
              (celle enregistrée lors de votre adhésion) pour finaliser votre accès au portail.
            </Alert>
          )}
          <OnboardingGuard>{children}</OnboardingGuard>
        </main>
      </div>
    </div>
  );
}
