"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/feedback";
import { MemberForm, toMemberPayload, valuesFromMember, type MemberFormValues } from "@/components/members/member-form";
import { api, ApiError } from "@/lib/api";
import { fieldErrors, toFormData } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import type { DuplicateMatch, Member } from "@/lib/types";

export function MemberFormDialog({
  open,
  onClose,
  member,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  member?: Member | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const mode = member ? "edit" : "create";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | undefined>();

  async function onSubmit(values: MemberFormValues) {
    setSubmitting(true);
    setError(null);
    setErrors({});
    try {
      const path = member ? `/members/${member.id}` : "/members";
      const response = await api.post<{ data: Member; message: string }>(
        path,
        toFormData(toMemberPayload(values, mode)),
      );
      toast.success(response.message || (member ? "Membre mis à jour." : "Membre créé avec succès."));
      onSaved();
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setDuplicates((caught.payload.duplicates as DuplicateMatch[]) ?? []);
        setError(caught.message);
      } else if (caught instanceof ApiError) {
        setErrors(fieldErrors(caught));
        setError(caught.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={member ? `Modifier le membre ${member.member_code}` : "Ajouter un membre"}
      description={
        member
          ? "Mettez à jour le dossier. Les champs sensibles restent audités."
          : "Créez le profil du membre. Le dossier restera en attente jusqu'à validation."
      }
    >
      {error && (
        <Alert tone={duplicates?.length ? "warning" : "error"} className="mb-4">
          {error}
        </Alert>
      )}
      <MemberForm
        key={member?.id ?? "new"}
        mode={mode}
        initial={member ? valuesFromMember(member) : undefined}
        submitting={submitting}
        errors={errors}
        duplicates={duplicates}
        lockedProvince={Boolean(user?.scope.province_id) && (user?.role?.scope_level ?? 0) > 0}
        submitLabel={member ? "Enregistrer les modifications" : "Enregistrer le membre"}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}
