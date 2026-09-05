"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  REPORT_PDF_HOST_CLASS,
  buildReportFilename,
  exportReportToPdf,
} from "@/lib/reports/export-pdf";
import { reportApiErrorMessage } from "@/lib/reports/fetch-all-pages";

interface ReportPdfExportButtonProps {
  /** Identifiant court pour le nom de fichier (ex. membres, activites). */
  reportId: string;
  label?: string;
  disabled?: boolean;
  /** Prépare le document PDF (peut inclure un fetch API). */
  onPrepare: () => Promise<React.ReactNode>;
}

/** Attend que le DOM React ait monté au moins une page de rapport. */
async function waitForReportPages(container: HTMLElement, timeoutMs = 4000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const pages = container.querySelectorAll("[data-report-page]");
    if (pages.length > 0) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 32));
  }
  throw new Error("Le document PDF n'a pas pu être préparé.");
}

export function ReportPdfExportButton({
  reportId,
  label = "Télécharger PDF",
  disabled,
  onPrepare,
}: ReportPdfExportButtonProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<React.ReactNode>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const documentNode = await onPrepare();
      flushSync(() => {
        setPreview(documentNode);
      });
      if (!containerRef.current) throw new Error("Conteneur PDF indisponible.");
      await waitForReportPages(containerRef.current);
      await exportReportToPdf(containerRef.current, buildReportFilename(reportId));
      toast.success("Rapport PDF téléchargé.");
    } catch (caught) {
      toast.error(reportApiErrorMessage(caught));
    } finally {
      setPreview(null);
      setExporting(false);
    }
  }, [onPrepare, reportId, toast]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={handleExport} disabled={disabled || exporting}>
        <FileDown className="mr-2 h-4 w-4" aria-hidden />
        {exporting ? "Génération PDF…" : label}
      </Button>
      <div ref={containerRef} aria-hidden className={REPORT_PDF_HOST_CLASS}>
        {preview}
      </div>
    </>
  );
}
