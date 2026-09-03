"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function PhotoField({
  name,
  previewUrl,
  onChange,
  error,
  label = "Photo d'identité",
}: {
  name?: string | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  error?: string | null;
  label?: string;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLocalError(null);

    if (!file) {
      onChange(null);
      return;
    }

    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Formats acceptés : JPEG, PNG ou WebP.");
      event.target.value = "";
      onChange(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      setLocalError("La photo ne doit pas dépasser 4 Mo.");
      event.target.value = "";
      onChange(null);
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    onChange(file);
  }

  return (
    <Field
      label={label}
      hint="JPEG, PNG ou WebP — 4 Mo maximum. Le type réel du fichier est contrôlé côté serveur."
      error={error ?? localError}
    >
      <div className="flex items-center gap-4">
        <Avatar src={localPreview ?? previewUrl} name={name} size="lg" rounded="lg" />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <Camera className="h-4 w-4" />
          Choisir une photo
          <input type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={handleChange} />
        </label>
      </div>
    </Field>
  );
}
