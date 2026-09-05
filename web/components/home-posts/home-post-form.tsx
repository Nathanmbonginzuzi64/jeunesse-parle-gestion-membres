"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Film, ImagePlus, Upload } from "lucide-react";
import { ApiError, getToken, uploadFormData } from "@/lib/api";
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
  published_at: string;
  sort_order: string;
  is_published: boolean;
  image: File | null;
  video: File | null;
  remove_image: boolean;
  remove_video: boolean;
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
    published_at: toDateInputValue(post?.published_at),
    sort_order: String(post?.sort_order ?? 0),
    is_published: post?.is_published ?? true,
    image: null,
    video: null,
    remove_image: false,
    remove_video: false,
  };
}

async function fetchAuthenticatedMedia(url: string): Promise<string | null> {
  const token = getToken();
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
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
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadCover() {
      if (values.image) {
        objectUrl = URL.createObjectURL(values.image);
        setCoverSrc(objectUrl);
        return;
      }
      if (values.remove_image || !initial?.image_url) {
        setCoverSrc(null);
        return;
      }
      const url = await fetchAuthenticatedMedia(initial.image_url);
      if (!cancelled) setCoverSrc(url);
      objectUrl = url;
    }

    void loadCover();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [values.image, values.remove_image, initial?.image_url]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadVideo() {
      if (values.video) {
        objectUrl = URL.createObjectURL(values.video);
        setVideoSrc(objectUrl);
        return;
      }
      if (values.remove_video || !initial?.video_url) {
        setVideoSrc(null);
        return;
      }
      const url = await fetchAuthenticatedMedia(initial.video_url);
      if (!cancelled) setVideoSrc(url);
      objectUrl = url;
    }

    void loadVideo();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [values.video, values.remove_video, initial?.video_url]);

  function patch(partial: Partial<HomePostFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setProgress(values.image || values.video ? 5 : 15);
    setError(null);
    setErrors({});

    const payload: Record<string, unknown> = {
      title: values.title.trim(),
      excerpt: values.excerpt.trim() || null,
      body: values.body.trim() || null,
      category: values.category.trim() || null,
      published_at: values.published_at || null,
      sort_order: Number(values.sort_order || 0),
      is_published: values.is_published,
      image: values.image,
      video: values.video,
      remove_image: values.remove_image || undefined,
      remove_video: values.remove_video || undefined,
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Vidéo (optionnel)</label>
            <p className="text-xs text-slate-500">Fichier local MP4, WEBM ou MOV (max. 200 Mo).</p>
            {videoSrc && !values.remove_video && (
              <video
                key={videoSrc}
                controls
                preload="metadata"
                className="aspect-video w-full overflow-hidden rounded-xl bg-black object-contain"
                src={videoSrc}
              />
            )}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={(event) =>
                patch({ video: event.target.files?.[0] ?? null, remove_video: false })
              }
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
            />
            {errors.video && <p className="text-xs text-red-600">{errors.video}</p>}
            {values.video && (
              <p className="text-xs text-slate-500">{values.video.name}</p>
            )}
            {initial?.video_url && !values.video && (
              <Checkbox
                checked={values.remove_video}
                onChange={(event) => patch({ remove_video: event.target.checked })}
                label="Supprimer la vidéo actuelle"
              />
            )}
            {!videoSrc && !values.video && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                <Film className="h-4 w-4" />
                Aucune vidéo sélectionnée
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Médias & diffusion</p>

          <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            {coverSrc && !values.remove_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc} alt="Couverture" className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 text-slate-400">
                <ImagePlus className="h-8 w-8" />
                <p className="text-xs">Aperçu de l&apos;image de couverture</p>
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
