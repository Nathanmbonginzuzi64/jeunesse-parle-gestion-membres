"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/feedback";
import { RequirePermission } from "@/components/auth/require-permission";
import { PERMISSIONS } from "@/lib/permissions";

export default function NewMemberPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/membres?create=1");
  }, [router]);

  return (
    <RequirePermission permission={PERMISSIONS.membersCreate}>
      <PageLoader label="Ouverture du formulaire…" />
    </RequirePermission>
  );
}
