import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function exportReportToPdf(
  container: HTMLElement,
  filename: string,
): Promise<void> {
  const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-report-page]"));

  if (pages.length === 0) {
    throw new Error("Aucune page de rapport à exporter.");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index]!;
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

    if (index > 0) pdf.addPage();

    if (imgHeightMm <= A4_HEIGHT_MM) {
      pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, imgHeightMm);
    } else {
      let position = 0;
      const pageHeightPx = (canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM;
      while (position < canvas.height) {
        if (position > 0) pdf.addPage();
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(pageHeightPx, canvas.height - position);
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) break;
        ctx.drawImage(
          canvas,
          0,
          position,
          canvas.width,
          sliceCanvas.height,
          0,
          0,
          canvas.width,
          sliceCanvas.height,
        );
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceHeightMm = (sliceCanvas.height * A4_WIDTH_MM) / sliceCanvas.width;
        pdf.addImage(sliceData, "PNG", 0, 0, A4_WIDTH_MM, sliceHeightMm);
        position += pageHeightPx;
      }
    }
  }

  pdf.save(filename);
}

export function buildReportFilename(type: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `JP-Rapport-${type}-${stamp}.pdf`;
}
