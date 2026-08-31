"use client";

import { useRef } from "react";
import { Bold, Italic, Link2, List, Quote, Heading2 } from "lucide-react";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  className?: string;
}

export function RichTextEditor({
  label = "Contenu",
  value,
  onChange,
  rows = 8,
  required,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = before) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function prefix(linePrefix: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + linePrefix + value.slice(lineStart);
    onChange(next);
  }

  function insertLink() {
    const url = window.prompt("URL du lien :");
    if (!url) return;
    wrap("[", `](${url})`);
  }

  const tools = [
    { icon: Bold, action: () => wrap("**"), title: "Gras" },
    { icon: Italic, action: () => wrap("_"), title: "Italique" },
    { icon: Heading2, action: () => prefix("## "), title: "Titre" },
    { icon: List, action: () => prefix("- "), title: "Liste" },
    { icon: Quote, action: () => prefix("> "), title: "Citation" },
    { icon: Link2, action: insertLink, title: "Lien" },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-brand-500/30">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
          {tools.map(({ icon: Icon, action, title }) => (
            <button
              key={title}
              type="button"
              title={title}
              onClick={action}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-brand-700"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <span className="ml-auto self-center px-2 text-xs text-slate-400">Markdown · emojis 👏 🇨🇩</span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required={required}
          className="w-full resize-y border-0 px-3 py-2 text-sm focus:outline-none focus:ring-0"
          placeholder="Rédigez votre actualité…"
        />
      </div>
    </div>
  );
}

/** Affichage simple du contenu markdown-lite. */
export function RichTextContent({ content, className }: { content: string; className?: string }) {
  const html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-brand-300 pl-3 italic text-slate-600 my-2">$1</blockquote>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-600 underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, "<br />");

  return (
    <div
      className={cn("prose-sm text-sm leading-relaxed text-slate-700", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
