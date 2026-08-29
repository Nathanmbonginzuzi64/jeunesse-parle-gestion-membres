"use client";

import { useRouter } from "next/navigation";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActivityForm } from "@/components/activities/activity-form";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/activites", label: "Mobilisation" },
          { href: "/activites", label: "Activités" },
          { label: "Nouvelle activité" },
        ]}
      />
      <DashboardAnimate>
        <Card>
          <CardHeader
            title="Nouvelle activité"
            description="Planifiez une réunion, une formation ou une mission. Ajoutez une image de couverture pour la fiche détail."
          />
          <CardBody>
            <ActivityForm
              onSaved={(activity, message) => {
                toast.success(message);
                router.replace(`/activites/${activity.id}`);
              }}
            />
          </CardBody>
        </Card>
      </DashboardAnimate>
    </div>
  );
}
