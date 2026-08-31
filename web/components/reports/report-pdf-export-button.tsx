"use client";

import { useCallback, useRef, useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildReportFilename, exportReportToPdf } from "@/lib/reports/export-pdf";

interface ReportPdfExportButtonProps {
  /** Identifiant court pour le nom de fichier (ex. membres, activites). */
  reportId: string;
  label?: string;
  disabled?: boolean;
  /** Prépare le document PDF (peut inclure un fetch API). */
  onPrepare: () => Promise<React.ReactNode>;
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
      const document = await onPrepare();
      setPreview(document);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (!containerRef.current) throw new Error("Conteneur PDF indisponible.");
      await exportReportToPdf(containerRef.current, buildReportFilename(reportId));
      toast.success("Rapport PDF téléchargé.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Export PDF impossible.");
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
      <div
        ref={containerRef}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] opacity-0"
      >
        {preview}
      </div>
    </>
  );
}
