"use client";

import { useEffect, useMemo, useState } from "react";
import { Image, Link2, Newspaper, Palette, Paperclip, Type, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardBody } from "@/components/ui/card";
import { RichTextEditor } from "@/components/news/rich-text-editor";
import { TextBackgroundPicker } from "@/components/news/text-background-picker";
import { NewsFormPreview } from "@/components/news/news-form-preview";
import { NewsImageDropzone, NewsPdfDropzone, NewsGalleryDropzone, NewsVideoDropzone } from "@/components/news/news-file-dropzone";
import { NewsUrlField } from "@/components/news/news-url-field";
import { NewsPublishProgress, type PublishPhase } from "@/components/news/news-publish-progress";
import { uploadFormData, ApiError } from "@/lib/api";
import { NEWS_CATEGORIES, type NewsPostItem } from "@/lib/news/constants";
import { decodeTextBackground, type TextBackgroundId } from "@/lib/news/text-backgrounds";
import { extractYoutubeId } from "@/lib/news/youtube";
import { useApi } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ActivityOption {
  id: number;
  title: string;
  code: string;
}

const MEDIA_TYPES = [
  { value: "text", label: "Texte", icon: Type, desc: "Fond coloré" },
  { value: "image", label: "Image", icon: Image, desc: "100 Mo max" },
  { value: "video", label: "Vidéo", icon: Video, desc: "Fichier / YouTube" },
  { value: "document", label: "PDF", icon: Paperclip, desc: "Document" },
  { value: "link", label: "Lien", icon: Link2, desc: "URL" },
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
  const [video, setVideo] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState(initial?.media_type ?? "text");
  const [busy, setBusy] = useState(false);
  const [publishPhase, setPublishPhase] = useState<PublishPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  const videoPreview = useMemo(() => (video ? URL.createObjectURL(video) : null), [video]);
  const galleryPreviews = useMemo(() => gallery.map((f) => URL.createObjectURL(f)), [gallery]);

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      galleryPreviews.forEach((u) => URL.revokeObjectURL(u));
    },
    [imagePreview, videoPreview, galleryPreviews],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (mediaType === "image" && !image && !initial?.media_url) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }
    if (mediaType === "document" && !document && initial?.media_type !== "document") {
      toast.error("Veuillez sélectionner un fichier PDF.");
      return;
    }
    if ((mediaType === "video" || mediaType === "link") && !externalUrl.trim()) {
      if (mediaType === "link") {
        toast.error("Veuillez saisir une URL.");
        return;
      }
      if (!video && !initial?.media_url) {
        toast.error("Ajoutez un fichier vidéo (100 Mo max) ou un lien YouTube.");
        return;
      }
    }
    if (mediaType === "video" && externalUrl.trim() && !extractYoutubeId(externalUrl)) {
      toast.error("URL YouTube invalide. Utilisez un lien watch, youtu.be ou Shorts.");
      return;
    }

    setBusy(true);
    setPublishPhase("preparing");
    setUploadProgress(5);

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
    if (video) form.append("video", video);
    if (document) form.append("document", document);
    gallery.forEach((file, index) => form.append(`gallery[${index}]`, file));

    const path = initial?.id ? `/news/${initial.id}` : "/news";
    if (initial?.id) form.append("_method", "PUT");

    const hasFiles = !!(image || video || document || gallery.length);
    setPublishPhase(hasFiles ? "uploading" : "processing");
    setUploadProgress(hasFiles ? 10 : 50);

    try {
      await uploadFormData(path, form, (percent) => {
        setUploadProgress(Math.max(10, percent));
        if (percent >= 90) setPublishPhase("processing");
      });

      setPublishPhase("done");
      setUploadProgress(100);
      toast.success(initial?.id ? "Actualité mise à jour." : "Actualité publiée.");

      await new Promise((r) => setTimeout(r, 700));
      setPublishPhase("idle");
      setUploadProgress(0);
      onSuccess();
    } catch (caught) {
      setPublishPhase("error");
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
      setTimeout(() => {
        setPublishPhase("idle");
        setUploadProgress(0);
      }, 1500);
    } finally {
      setBusy(false);
    }
  }

  const categories = NEWS_CATEGORIES.filter((c) => c.value !== "all");
  const previewText = body.trim() || title.trim() || "Votre message…";

  return (
      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="space-y-6">
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
                      ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="hidden text-[10px] text-slate-400 sm:block">{desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-5">
              {mediaType === "text" ? (
                <TextBackgroundPicker value={textBackground} onChange={setTextBackground} previewText={previewText} />
              ) : null}

              {mediaType === "image" ? (
                <NewsImageDropzone value={image} onChange={setImage} existingUrl={!image ? initial?.media_url : null} />
              ) : null}

              {mediaType === "document" ? (
                <NewsPdfDropzone value={document} onChange={setDocument} />
              ) : null}

              {mediaType === "video" ? (
                <div className="space-y-5">
                  <NewsVideoDropzone
                    value={video}
                    onChange={setVideo}
                    existingUrl={!video && initial?.media_type === "video" ? initial?.media_url : null}
                  />
                  <NewsUrlField mode="video" value={externalUrl} onChange={setExternalUrl} />
                </div>
              ) : null}

              {mediaType === "link" ? (
                <NewsUrlField mode="link" value={externalUrl} onChange={setExternalUrl} />
              ) : null}

              {mediaType !== "text" ? (
                <NewsGalleryDropzone value={gallery} onChange={setGallery} />
              ) : null}
            </div>
          </section>

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

          <Button type="submit" loading={busy} size="lg" disabled={busy}>
            {initial ? "Enregistrer les modifications" : "Publier l'actualité"}
          </Button>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
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
                imagePreview={imagePreview ?? initial?.media_url}
                videoPreview={videoPreview ?? (initial?.media_type === "video" ? initial?.media_url : null)}
                externalUrl={externalUrl}
                documentName={document?.name}
                galleryPreviews={galleryPreviews}
              />
            </CardBody>
          </Card>

          <NewsPublishProgress
            open={busy || publishPhase !== "idle"}
            phase={publishPhase}
            progress={uploadProgress}
          />
        </aside>
      </div>
  );
}
