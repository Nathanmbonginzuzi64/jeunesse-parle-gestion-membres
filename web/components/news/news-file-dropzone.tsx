"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  FileText,
  ImagePlus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface NewsImageDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  error?: string | null;
}

const IMAGE_ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MEDIA_MAX_BYTES = 100 * 1024 * 1024; // 100 Mo
const MEDIA_MAX_LABEL = "100 Mo";

export function NewsImageDropzone({ value, onChange, existingUrl, error }: NewsImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const validateAndSet = useCallback(
    (file: File | null) => {
      setLocalError(null);
      if (!file) {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        onChange(null);
        return;
      }
      if (!IMAGE_ACCEPT.includes(file.type)) {
        setLocalError("Formats acceptés : JPEG, PNG ou WebP.");
        return;
      }
      if (file.size > MEDIA_MAX_BYTES) {
        setLocalError(`L'image ne doit pas dépasser ${MEDIA_MAX_LABEL}.`);
        return;
      }
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      onChange(file);
    },
    [onChange, preview],
  );

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    validateAndSet(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    validateAndSet(e.dataTransfer.files?.[0] ?? null);
  }

  function clear() {
    validateAndSet(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const src = preview ?? existingUrl ?? null;

  return (
    <Field
      label="Image principale"
      hint={`Glissez-déposez ou cliquez pour sélectionner · JPEG, PNG, WebP · ${MEDIA_MAX_LABEL} max`}
      error={error ?? localError}
    >
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !src && inputRef.current?.click()}
        className={cn(
          "group relative overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          dragging && "border-brand-500 bg-brand-50 scale-[1.01]",
          src ? "border-brand-300 bg-slate-900" : "cursor-pointer border-slate-300 bg-gradient-to-br from-slate-50 to-brand-50/30 hover:border-brand-400",
        )}
      >
        <input ref={inputRef} type="file" accept={IMAGE_ACCEPT.join(",")} className="sr-only" onChange={onFileInput} />

        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Aperçu" className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-brand-100">
              <ImagePlus className="h-8 w-8 text-brand-500" />
            </span>
            <div>
              <p className="text-base font-semibold text-slate-800">Déposez votre image ici</p>
              <p className="mt-1 text-sm text-slate-500">ou cliquez pour parcourir vos fichiers</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-xs font-medium text-brand-700">
              <Upload className="h-3.5 w-3.5" />
              Choisir une image
            </span>
          </div>
        )}

        {src ? (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
            {value ? (
              <span className="rounded-lg bg-black/50 px-2 py-1 text-xs text-white backdrop-blur">
                {value.name} · {formatFileSize(value.size)}
              </span>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-md hover:bg-brand-50">
              <ImagePlus className="h-4 w-4 text-brand-600" />
              Remplacer
              <input type="file" accept={IMAGE_ACCEPT.join(",")} className="sr-only" onChange={onFileInput} />
            </label>
            {(value || preview) && (
              <Button type="button" variant="outline" size="sm" className="border-white/30 bg-white/95" onClick={(e) => { e.stopPropagation(); clear(); }}>
                <Trash2 className="h-3.5 w-3.5" />
                Retirer
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Field>
  );
}

interface NewsPdfDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string | null;
}

const PDF_MAX = 10 * 1024 * 1024;

export function NewsPdfDropzone({ value, onChange, error }: NewsPdfDropzoneProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSet(file: File | null) {
    setLocalError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setLocalError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (file.size > PDF_MAX) {
      setLocalError("Le PDF ne doit pas dépasser 10 Mo.");
      return;
    }
    onChange(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    validateAndSet(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <Field label="Document PDF" hint="Glissez-déposez un PDF · 10 Mo max" error={error ?? localError}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed transition-all",
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-300",
        )}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)} />

        {value ? (
          <div className="flex items-center gap-4 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <FileText className="h-7 w-7 text-red-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{value.name}</p>
              <p className="text-sm text-slate-500">{formatFileSize(value.size)} · PDF prêt à publier</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Retirer">
              <X className="h-5 w-5 text-slate-400" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 px-6 py-10 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <FileText className="h-7 w-7 text-red-500" />
            </span>
            <p className="font-semibold text-slate-800">Déposez votre PDF ici</p>
            <p className="text-sm text-slate-500">Communiqué, rapport, programme…</p>
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-200">
              <Upload className="h-4 w-4" />
              Parcourir
            </span>
          </button>
        )}
      </div>
    </Field>
  );
}

interface NewsGalleryDropzoneProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function NewsGalleryDropzone({ value, onChange, maxFiles = 10 }: NewsGalleryDropzoneProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews],
  );

  function addFiles(incoming: FileList | File[]) {
    setLocalError(null);
    const files = Array.from(incoming);
    const valid: File[] = [];
    for (const f of files) {
      if (!IMAGE_ACCEPT.includes(f.type)) continue;
      if (f.size > MEDIA_MAX_BYTES) {
        setLocalError(`Chaque image doit faire moins de ${MEDIA_MAX_LABEL}.`);
        continue;
      }
      valid.push(f);
    }
    const merged = [...value, ...valid].slice(0, maxFiles);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
    onChange(merged);
  }

  function removeAt(index: number) {
    const next = value.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setPreviews((p) => p.filter((_, i) => i !== index));
    onChange(next);
  }

  return (
    <Field
      label="Galerie photos (optionnel)"
      hint={`Jusqu'à ${maxFiles} images · ${MEDIA_MAX_LABEL} max chacune · Glisser-déposer`}
      error={localError}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-4 transition-all",
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50/80",
        )}
      >
        <input ref={inputRef} type="file" accept={IMAGE_ACCEPT.join(",")} multiple className="sr-only" onChange={(e) => addFiles(e.target.files ?? [])} />

        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previews.map((src, i) => (
              <div key={src} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Retirer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {value.length < maxFiles ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-brand-400 hover:text-brand-600"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-[10px] font-medium">Ajouter</span>
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 py-8 text-center"
          >
            <ImagePlus className="h-8 w-8 text-brand-500" />
            <p className="text-sm font-medium text-slate-700">Ajoutez plusieurs photos</p>
            <p className="text-xs text-slate-500">Glissez-déposez ou cliquez</p>
          </button>
        )}
      </div>
    </Field>
  );
}

interface NewsVideoDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  error?: string | null;
}

const VIDEO_ACCEPT = ["video/mp4", "video/webm", "video/quicktime"];

export function NewsVideoDropzone({ value, onChange, existingUrl, error }: NewsVideoDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function validateAndSet(file: File | null) {
    setLocalError(null);
    if (!file) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      onChange(null);
      return;
    }
    const okType = VIDEO_ACCEPT.includes(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
    if (!okType) {
      setLocalError("Formats acceptés : MP4, WebM ou MOV.");
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setLocalError(`La vidéo ne doit pas dépasser ${MEDIA_MAX_LABEL}.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  const src = preview ?? existingUrl ?? null;

  return (
    <Field
      label="Fichier vidéo"
      hint={`MP4, WebM ou MOV · ${MEDIA_MAX_LABEL} max · ou utilisez un lien YouTube ci-dessous`}
      error={error ?? localError}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          validateAndSet(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={[...VIDEO_ACCEPT, ".mp4", ".webm", ".mov"].join(",")}
          className="sr-only"
          onChange={(e) => {
            validateAndSet(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        {src ? (
          <div className="space-y-3 p-4">
            <video src={src} controls className="aspect-video w-full rounded-xl bg-slate-900" />
            <div className="flex flex-wrap items-center gap-2">
              {value ? (
                <span className="rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-700">
                  {value.name} · {formatFileSize(value.size)}
                </span>
              ) : (
                <span className="rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-700">Vidéo actuelle</span>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Remplacer
              </Button>
              {(value || preview) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => validateAndSet(null)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Retirer
                </Button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 px-6 py-10 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <Upload className="h-7 w-7 text-brand-600" />
            </span>
            <p className="font-semibold text-slate-800">Déposez votre vidéo ici</p>
            <p className="text-sm text-slate-500">MP4 / WebM / MOV · jusqu&apos;à {MEDIA_MAX_LABEL}</p>
          </button>
        )}
      </div>
    </Field>
  );
}
