"use client";

import { useState, type FormEvent } from "react";
import { Mail, MapPin, MessageCircle, Send } from "lucide-react";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function ContactPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.public.post<{ message: string }>("/contact", {
        name,
        email,
        subject: subject.trim() || undefined,
        message,
      });
      toast.success(response.message);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[var(--background)] pb-16">
      <PublicPageHero
        eyebrow="Contact"
        title="Écrivez à Jeunesse Parle"
        description="Une question sur l’adhésion, une carte, une structure ou la campagne ? Votre message arrive directement dans la boîte JP Message de l’administration."
        tone="deep"
      />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <RevealOnScroll animation="slide-up">
          <div className="space-y-4">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Réponse rapide</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Les messages publics sont traités par le SuperAdmin dans JP Message, au même endroit que les
                préoccupations des membres.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Sujets fréquents</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>· Inscription et validation de dossier</li>
                <li>· Carte membre JP-RDC / QR</li>
                <li>· Structures et territoires</li>
                <li>· Campagne constitutionnelle</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-50 to-white p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Couverture nationale</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Plateforme déployée pour accompagner la jeunesse dans les 26 provinces de la RDC.
              </p>
            </article>
          </div>
        </RevealOnScroll>

        <RevealOnScroll animation="slide-up" delay={80}>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-elevated)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 via-white to-amber-50/40 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Formulaire de contact</h2>
              <p className="mt-1 text-sm text-slate-500">Tous les champs obligatoires sont indiqués.</p>
            </div>
            <div className="p-6 sm:p-8">
              {error && <Alert tone="error" className="mb-4">{error}</Alert>}
              <form onSubmit={onSubmit} className="space-y-4">
                <Input label="Nom complet" required value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  label="E-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Sujet (optionnel)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex. Question sur l’inscription"
                />
                <Textarea
                  label="Message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
                <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                  <Send className="h-4 w-4" />
                  Envoyer le message
                </Button>
              </form>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
}
