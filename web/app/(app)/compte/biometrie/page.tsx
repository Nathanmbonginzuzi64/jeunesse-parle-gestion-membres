"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/feedback";

function RedirectInner() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const qs = params.toString();
    router.replace(`/parametres/biometrie${qs ? `?${qs}` : ""}`);
  }, [router, params]);
  return <PageLoader label="Redirection…" />;
}

export default function CompteBiometrieRedirectPage() {
  return (
    <Suspense fallback={<PageLoader label="Redirection…" />}>
      <RedirectInner />
    </Suspense>
  );
}
