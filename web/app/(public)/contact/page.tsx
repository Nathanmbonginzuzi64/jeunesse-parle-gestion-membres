"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.public.post<{ message: string }>("/contact", { name, email, message });
      toast.success(response.message);
      setName("");
      setEmail("");
      setMessage("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Contact</h1>
      <p className="mt-3 text-sm text-slate-600">Une question sur l’adhésion, une carte ou une structure ? Écrivez-nous.</p>
      <Card className="mt-8">
        <CardHeader title="Formulaire" description="Nous répondons dans les meilleurs délais." />
        <CardBody>
          {error && <Alert tone="error" className="mb-4">{error}</Alert>}
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Nom" required value={name} onChange={(event) => setName(event.target.value)} />
            <Input label="E-mail" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <Textarea label="Message" required value={message} onChange={(event) => setMessage(event.target.value)} />
            <Button type="submit" loading={submitting} className="w-full">
              Envoyer
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
