"use client";

import { Suspense } from "react";
import { JpInbox } from "@/components/jp-message/jp-inbox";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageLoader } from "@/components/ui/feedback";

export default function JpMessagePage() {
  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Portail" }, { label: "JP Message" }]} />
      <Suspense fallback={<PageLoader label="Ouverture de JP Message…" />}>
        <JpInbox />
      </Suspense>
    </div>
  );
}
