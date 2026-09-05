"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { fieldErrors, toFormData, validationErrorMessages } from "@/lib/form";
import type { HomePost } from "@/lib/home-posts";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/field";

export type HomePostFormValues = {
  title: string;
  excerpt: string;
  body: string;
  category: string;
  external_url: string;
  sort_order: string;
  is_published: boolean;
  image: File | null;
  remove_image: boolean;
};

export function emptyHomePostForm(post?: HomePost | null): HomePostFormValues {
  return {
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    category: post?.category ?? "",
    external_url: post?.external_url ?? "",
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
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function patch(partial: Partial<HomePostFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});

    const payload: Record<string, unknown> = {
      title: values.title.trim(),
      excerpt: values.excerpt.trim() || null,
      body: values.body.trim() || null,
      category: values.category.trim() || null,
      external_url: values.external_url.trim() || null,
      sort_order: Number(values.sort_order || 0),
      is_published: values.is_published,
      image: values.image,
      remove_image: values.remove_image || undefined,
    };

    try {
      if (postId) {
        await api.post(`/home-posts/${postId}`, toFormData(payload));
      } else {
        await api.post("/home-posts", toFormData(payload));
      }
      onSuccess();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(fieldErrors(caught));
        setError(validationErrorMessages(caught)[0] ?? caught.message);
      } else {
        setError("Enregistrement impossible. Réessayez.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && (
        <Alert tone="error" title="Formulaire incomplet">
          {error}
        </Alert>
      )}

      <Input
        label="Titre"
        required
        value={values.title}
        onChange={(event) => patch({ title: event.target.value })}
        error={errors.title}
      />

      <Input
        label="Catégorie"
        value={values.category}
        onChange={(event) => patch({ category: event.target.value })}
        placeholder="Ex. Communiqué, Événement, Campagne"
        error={errors.category}
      />

      <Textarea
        label="Extrait (affiché sur la home)"
        value={values.excerpt}
        onChange={(event) => patch({ excerpt: event.target.value })}
        rows={3}
        error={errors.excerpt}
      />

      <Textarea
        label="Contenu détaillé (optionnel)"
        value={values.body}
        onChange={(event) => patch({ body: event.target.value })}
        rows={6}
        error={errors.body}
      />

      <Input
        label="Lien externe (optionnel)"
        type="url"
        value={values.external_url}
        onChange={(event) => patch({ external_url: event.target.value })}
        placeholder="https://…"
        error={errors.external_url}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Ordre d'affichage"
          type="number"
          min={0}
          value={values.sort_order}
          onChange={(event) => patch({ sort_order: event.target.value })}
          hint="Plus élevé = plus en avant"
          error={errors.sort_order}
        />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Image</label>
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
      </div>

      <Checkbox
        checked={values.is_published}
        onChange={(event) => patch({ is_published: event.target.checked })}
        label="Publier immédiatement sur la page Actualités"
        description="Si coché, le post apparaît sur /infos (menu Actualités du site public)."
      />

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting}>
          {postId ? "Enregistrer" : "Créer le post"}
        </Button>
      </div>
    </form>
  );
}
