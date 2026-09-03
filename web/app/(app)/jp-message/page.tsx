"use client";

import { JpInbox } from "@/components/jp-message/jp-inbox";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function JpMessagePage() {
  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Portail" }, { label: "JP Message" }]} />
      <JpInbox />
    </div>
  );
}
