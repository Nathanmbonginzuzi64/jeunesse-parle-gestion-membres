"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import type { Member } from "@/lib/types";

function RedirectEdit() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading } = useApi<{ data: Member }>(`/members/${params.id}`);

  useEffect(() => {
    if (data?.data) router.replace(`/membres/${data.data.id}?edit=1`);
  }, [data, router]);

  if (loading) return <PageLoader label="Chargement du dossier…" />;
  return <PageLoader label="Ouverture de l'éditeur…" />;
}

export default function EditMemberPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RedirectEdit />
    </Suspense>
  );
}
