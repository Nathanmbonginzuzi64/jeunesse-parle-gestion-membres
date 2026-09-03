"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/feedback";

/** Alias conservé : redirige vers le hub Paramètres. */
export default function ProfilRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/parametres/profil");
  }, [router]);
  return <PageLoader label="Redirection…" />;
}
