"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActivityForm } from "@/components/activities/activity-form";
import { Card, CardBody } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";

export default function NewActivityPage() {
  return (
    <RequirePermission permission={PERMISSIONS.activitiesManage}>
      <CreateActivity />
    </RequirePermission>
  );
}

function CreateActivity() {
  const router = useRouter();
  const toast = useToast();

  return (
    <div>
      <PageHeader title="Nouvelle activité" description="Planifiez une réunion, une formation ou une mission." />
      <Card>
        <CardBody>
          <ActivityForm
            onSaved={(activity, message) => {
              toast.success(message);
              router.replace(`/activites/${activity.id}`);
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
