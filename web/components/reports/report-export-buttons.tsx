"use client";

import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import type { ReportFiltersState } from "@/lib/reports/api-types";

interface ReportExportButtonsProps {
  filters?: ReportFiltersState;
  reportId: string;
  disabled?: boolean;
  onPreparePdf: () => Promise<React.ReactNode>;
}

/** Bouton d'export PDF institutionnel pour les rapports analytiques. */
export function ReportExportButtons({
  reportId,
  disabled,
  onPreparePdf,
}: ReportExportButtonsProps) {
  return (
    <ReportPdfExportButton
      reportId={reportId}
      disabled={disabled}
      onPrepare={onPreparePdf}
    />
  );
}
