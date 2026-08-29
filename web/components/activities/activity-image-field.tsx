"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ActivityImageField({
  previewUrl,
  onChange,
  error,
}: {
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  error?: string | null;
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
      setLocalError("L'image ne doit pas dépasser 5 Mo.");
      event.target.value = "";
      onChange(null);
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function clear() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setLocalError(null);
    onChange(null);
  }

  const src = localPreview ?? previewUrl;

  return (
    <Field
      label="Image de couverture"
      hint="JPEG, PNG ou WebP — 5 Mo max. Affichée sur la fiche et les cartes d'activité."
      error={error ?? localError}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50",
          src ? "border-solid border-slate-200" : "",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Aperçu couverture" className="h-44 w-full object-cover sm:h-52" />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 px-4 text-center sm:h-52">
            <ImagePlus className="h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500">Ajoutez une image pour illustrer l&apos;activité</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-black/50 to-transparent p-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-white">
            <ImagePlus className="h-4 w-4" />
            {src ? "Changer" : "Choisir une image"}
            <input type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={handleChange} />
          </label>
          {localPreview && (
            <Button type="button" variant="outline" size="sm" className="bg-white/95" onClick={clear}>
              <Trash2 className="h-3.5 w-3.5" />
              Retirer
            </Button>
          )}
        </div>
      </div>
    </Field>
  );
}
