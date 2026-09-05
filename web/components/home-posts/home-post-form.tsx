"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { ApiError, uploadFormData } from "@/lib/api";
import { fieldErrors, toFormData, validationErrorMessages } from "@/lib/form";
import type { HomePost } from "@/lib/home-posts";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";

export type HomePostFormValues = {
  title: string;
  excerpt: string;
  body: string;
  category: string;
  external_url: string;
  published_at: string;
  sort_order: string;
  is_published: boolean;
  image: File | null;
  remove_image: boolean;
};

const CATEGORIES = [
  { value: "Actualité", label: "Actualité" },
  { value: "Campagne", label: "Campagne" },
  { value: "Événement", label: "Événement" },
  { value: "Communiqué", label: "Communiqué" },
];

function toDateInputValue(value?: string | null): string {
  const fallback = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (!value) return fallback();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function emptyHomePostForm(post?: HomePost | null): HomePostFormValues {
  return {
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    category: post?.category ?? "Actualité",
    external_url: post?.external_url ?? "",
    published_at: toDateInputValue(post?.published_at),
    sort_order: String(post?.sort_order ?? 0),
    is_published: post?.is_published ?? true,
    image: null,
    remove_image: false,
  };
}

export function HomePostForm({
  initial,
  postId,
  onSuccess,
}: {
  initial?: HomePost | null;
  postId?: number;
  onSuccess: () => void;
}) {
  const [values, setValues] = useState(() => emptyHomePostForm(initial));
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const previewUrl = useMemo(() => {
    if (values.image) return URL.createObjectURL(values.image);
    if (!values.remove_image && initial?.image_url) return initial.image_url;
    return null;
  }, [values.image, values.remove_image, initial?.image_url]);

  function patch(partial: Partial<HomePostFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setProgress(values.image ? 5 : 15);
    setError(null);
    setErrors({});

    const payload: Record<string, unknown> = {
      title: values.title.trim(),
      excerpt: values.excerpt.trim() || null,
      body: values.body.trim() || null,
      category: values.category.trim() || null,
      external_url: values.external_url.trim() || null,
      published_at: values.published_at || null,
      sort_order: Number(values.sort_order || 0),
      is_published: values.is_published,
      image: values.image,
      remove_image: values.remove_image || undefined,
    };

    try {
      const path = postId ? `/home-posts/${postId}` : "/home-posts";
      const form = toFormData(payload);
      if (postId) form.append("_method", "PUT");
      await uploadFormData(path, form, (percent) => {
        setProgress(Math.max(8, Math.min(98, percent)));
      });
      setProgress(100);
      window.setTimeout(() => onSuccess(), 350);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(fieldErrors(caught));
        setError(validationErrorMessages(caught)[0] ?? caught.message);
      } else {
        setError("Enregistrement impossible. Réessayez.");
      }
      setSubmitting(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {error && (
        <Alert tone="error" title="Formulaire incomplet">
          {error}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Contenu</p>
          <Input
            label="Titre"
            required
            value={values.title}
            onChange={(event) => patch({ title: event.target.value })}
            error={errors.title}
            placeholder="Titre de la publication"
          />
          <Select
            label="Catégorie"
            value={values.category}
            onChange={(event) => patch({ category: event.target.value })}
            options={CATEGORIES}
            error={errors.category}
          />
          <Textarea
            label="Extrait (affiché sur les cartes)"
            value={values.excerpt}
            onChange={(event) => patch({ excerpt: event.target.value })}
            rows={3}
            error={errors.excerpt}
            hint="Court résumé visible sur /infos"
          />
          <Textarea
            label="Contenu détaillé"
            value={values.body}
            onChange={(event) => patch({ body: event.target.value })}
            rows={8}
            error={errors.body}
            placeholder="Texte complet de l'actualité…"
          />
          <Input
            label="Lien / vidéo (optionnel)"
            type="url"
            value={values.external_url}
            onChange={(event) => patch({ external_url: event.target.value })}
            placeholder="https://… ou URL .mp4"
            error={errors.external_url}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Médias & diffusion</p>

          <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 text-slate-400">
                <ImagePlus className="h-8 w-8" />
                <p className="text-xs">Aperçu de l&apos;image</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Image de couverture</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                patch({ image: event.target.files?.[0] ?? null, remove_image: false })
              }
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
            />
            {errors.image && <p className="text-xs text-red-600">{errors.image}</p>}
            {initial?.image_url && !values.image && (
              <Checkbox
                checked={values.remove_image}
                onChange={(event) => patch({ remove_image: event.target.checked })}
                label="Supprimer l'image actuelle"
              />
            )}
          </div>

          <Input
            label="Date de l'actualité"
            type="date"
            required
            value={values.published_at}
            onChange={(event) => patch({ published_at: event.target.value })}
            error={errors.published_at}
            hint="Affichée sur le badge date des cartes /infos"
          />

          <Input
            label="Ordre d'affichage"
            type="number"
            min={0}
            value={values.sort_order}
            onChange={(event) => patch({ sort_order: event.target.value })}
            hint="Plus élevé = plus en avant"
            error={errors.sort_order}
          />

          <Checkbox
            checked={values.is_published}
            onChange={(event) => patch({ is_published: event.target.checked })}
            label="Publier immédiatement sur /infos"
            description="Sinon le post reste en brouillon."
          />
        </div>
      </div>

      {submitting && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-brand-800">
            <span className="inline-flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Publication en cours…
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting} disabled={submitting}>
          {postId ? "Enregistrer les modifications" : "Publier le post"}
        </Button>
      </div>
    </form>
  );
}
