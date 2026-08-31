"use client";

import { useState } from "react";
import { Image, Link2, Newspaper, Palette, Paperclip, Type, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardBody } from "@/components/ui/card";
import { RichTextEditor } from "@/components/news/rich-text-editor";
import { TextBackgroundPicker } from "@/components/news/text-background-picker";
import { NewsFormPreview } from "@/components/news/news-form-preview";
import { api, ApiError } from "@/lib/api";
import { NEWS_CATEGORIES, type NewsPostItem } from "@/lib/news/constants";
import { decodeTextBackground, type TextBackgroundId } from "@/lib/news/text-backgrounds";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ActivityOption {
  id: number;
  title: string;
  code: string;
}

const MEDIA_TYPES = [
  { value: "text", label: "Texte", icon: Type, desc: "Message avec fond coloré" },
  { value: "image", label: "Image", icon: Image, desc: "Photo principale" },
  { value: "video", label: "Vidéo", icon: Video, desc: "Lien YouTube" },
  { value: "document", label: "PDF", icon: Paperclip, desc: "Document" },
  { value: "link", label: "Lien", icon: Link2, desc: "URL externe" },
] as const;

interface NewsFormProps {
  initial?: NewsPostItem;
  onSuccess: () => void;
}

export function NewsForm({ initial, onSuccess }: NewsFormProps) {
  const toast = useToast();
  const { data: activitiesData } = useApi<{ data: ActivityOption[] }>("/activities", { per_page: 100 });

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [externalUrl, setExternalUrl] = useState(initial?.external_url ?? "");
  const [textBackground, setTextBackground] = useState<TextBackgroundId>(
    (initial?.text_background as TextBackgroundId) ??
      decodeTextBackground(initial?.external_url, initial?.media_type),
  );
  const [linkActivity, setLinkActivity] = useState(!!initial?.activity);
  const [activityId, setActivityId] = useState<string>(initial?.activity?.id ? String(initial.activity.id) : "");
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [image, setImage] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState(initial?.media_type ?? "text");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const form = new FormData();
    form.append("title", title);
    form.append("body", body);
    form.append("category", category);
    form.append("is_published", isPublished ? "1" : "0");
    form.append("media_type", mediaType);
    if (mediaType === "text") {
      form.append("text_background", textBackground);
    } else if (externalUrl) {
      form.append("external_url", externalUrl);
    }
    if (linkActivity && activityId) form.append("activity_id", activityId);
    if (image) form.append("image", image);
    if (document) form.append("document", document);
    gallery.forEach((file, index) => form.append(`gallery[${index}]`, file));

    try {
      if (initial?.id) {
        form.append("_method", "PUT");
        await api.post(`/news/${initial.id}`, form);
        toast.success("Actualité mise à jour.");
      } else {
        await api.post("/news", form);
        toast.success("Actualité publiée.");
      }
      onSuccess();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  const categories = NEWS_CATEGORIES.filter((c) => c.value !== "all");
  const previewText = body.trim() || title.trim() || "Votre message…";

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="space-y-6">
        {/* Section principale */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Informations principales</h2>
          </div>
          <div className="space-y-4">
            <Input label="Titre de l'actualité" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex. : Grande conférence jeunesse RDC 2026" />
            <Select
              label="Catégorie"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.map((c) => ({ value: c.value, label: c.label }))}
            />
            <RichTextEditor label="Description" value={body} onChange={setBody} required />
          </div>
        </section>

        {/* Type de média */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-2">
            <Palette className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-slate-900">Format de publication</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MEDIA_TYPES.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMediaType(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition",
                  mediaType === value
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="hidden text-[10px] text-slate-400 sm:block">{desc}</span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            {mediaType === "text" ? (
              <TextBackgroundPicker value={textBackground} onChange={setTextBackground} previewText={previewText} />
            ) : null}

            {mediaType === "image" ? (
              <Input
                label="Image principale"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            ) : null}

            {mediaType === "document" ? (
              <Input label="Document PDF" type="file" accept="application/pdf" onChange={(e) => setDocument(e.target.files?.[0] ?? null)} />
            ) : null}

            {mediaType === "video" || mediaType === "link" ? (
              <Input
                label={mediaType === "video" ? "URL vidéo (YouTube)" : "Lien externe"}
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://"
              />
            ) : null}

            {mediaType !== "text" ? (
              <div className="mt-4">
                <Input
                  label="Galerie images (optionnel)"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setGallery(Array.from(e.target.files ?? []))}
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* Activité + publication */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-semibold text-slate-900">Options avancées</h2>
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
              <input type="checkbox" checked={linkActivity} onChange={(e) => setLinkActivity(e.target.checked)} className="h-4 w-4 rounded" />
              <div>
                <p className="text-sm font-medium text-slate-800">Associer une activité</p>
                <p className="text-xs text-slate-500">Lier cette actualité à une activité existante</p>
              </div>
            </label>

            {linkActivity ? (
              <Select
                label="Activité liée"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                options={[
                  { value: "", label: "— Sélectionner —" },
                  ...(activitiesData?.data ?? []).map((a) => ({
                    value: String(a.id),
                    label: `${a.title} (${a.code})`,
                  })),
                ]}
              />
            ) : null}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Publier immédiatement</p>
                <p className="text-xs text-emerald-600">Les membres recevront une notification</p>
              </div>
            </label>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={busy} size="lg">
            {initial ? "Enregistrer les modifications" : "Publier l'actualité"}
          </Button>
        </div>
      </form>

      {/* Aperçu live */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <Card className="overflow-hidden border-brand-100">
          <div className="border-b border-brand-100 bg-gradient-to-r from-brand-50 to-blue-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Aperçu en direct</p>
          </div>
          <CardBody className="p-4">
            <NewsFormPreview
              title={title}
              body={body}
              category={category}
              mediaType={mediaType}
              textBackground={textBackground}
            />
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
