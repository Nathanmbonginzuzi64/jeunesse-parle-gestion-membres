"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { ReportFiltersState } from "@/lib/reports/api-types";
import { filtersToQuery } from "@/components/reports/report-filters-bar";

interface ReportExportButtonsProps {
  filters: ReportFiltersState;
  csvPath?: string;
  filename?: string;
}

export function ReportExportButtons({
  filters,
  csvPath = "/reports/members/export",
  filename = "rapport-membres.csv",
}: ReportExportButtonsProps) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleCsv() {
    setExporting(true);
    try {
      await downloadFile(csvPath, filtersToQuery(filters), filename);
      toast.success("Export CSV téléchargé.");
    } catch {
      toast.error("Échec du téléchargement.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={handleCsv} disabled={exporting}>
        <Download className="mr-2 h-4 w-4" aria-hidden />
        {exporting ? "Export…" : "CSV"}
      </Button>
      <Button type="button" variant="ghost" disabled title="Export Excel — prochainement">
        <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden />
        Excel
      </Button>
    </div>
  );
}
