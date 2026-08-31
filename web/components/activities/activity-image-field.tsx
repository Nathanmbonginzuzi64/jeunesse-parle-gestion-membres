"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
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
      label="Photo de l'activité"
      hint="Illustration affichée sur les cartes, la liste et la fiche détail. JPEG, PNG ou WebP — 5 Mo max."
      error={error ?? localError}
    >
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border-2 border-dashed transition",
          src ? "border-brand-200 bg-slate-900" : "border-slate-300 bg-slate-50 hover:border-brand-300",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Aperçu activité" className="aspect-[21/9] w-full object-cover sm:aspect-[2.4/1]" />
        ) : (
          <div className="flex aspect-[21/9] flex-col items-center justify-center gap-3 px-6 text-center sm:aspect-[2.4/1]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <ImagePlus className="h-7 w-7 text-brand-500" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-700">Ajoutez une photo d&apos;illustration</p>
              <p className="mt-0.5 text-xs text-slate-500">Formation, réunion, campagne sur le terrain…</p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-12">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-md transition hover:bg-brand-50">
            <Camera className="h-4 w-4 text-brand-600" />
            {src ? "Changer la photo" : "Choisir une photo"}
            <input type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={handleChange} />
          </label>
          {localPreview && (
            <Button type="button" variant="outline" size="sm" className="border-white/30 bg-white/95" onClick={clear}>
              <Trash2 className="h-3.5 w-3.5" />
              Retirer
            </Button>
          )}
        </div>
      </div>
    </Field>
  );
}
