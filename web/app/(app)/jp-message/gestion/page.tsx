"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/feedback";

/** Ancienne URL admin → inbox unique JP Message. */
export default function JpMessageAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/jp-message");
  }, [router]);

  return <PageLoader label="Redirection vers JP Message…" />;
}
