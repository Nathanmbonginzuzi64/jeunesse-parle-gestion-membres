import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const JPEG_QUALITY = 0.92;

function canvasToJpeg(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new Error("Échec de la conversion de la page en image.");
  }
  return dataUrl;
}

/** Ajoute un canvas capturé au PDF (découpe A4 si trop haut). */
function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstCapture: boolean) {
  if (canvas.width < 1 || canvas.height < 1) {
    throw new Error("Capture vide : impossible de générer le PDF.");
  }

  const pageHeightPx = Math.max(1, Math.floor((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM));
  let position = 0;
  let sliceIndex = 0;

  while (position < canvas.height) {
    const needsNewPage = !(isFirstCapture && sliceIndex === 0);
    if (needsNewPage) pdf.addPage();

    const sliceHeight = Math.max(1, Math.min(pageHeightPx, canvas.height - position));
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;

    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) throw new Error("Contexte canvas indisponible.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      position,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const heightMm = (sliceCanvas.height * A4_WIDTH_MM) / sliceCanvas.width;
    pdf.addImage(canvasToJpeg(sliceCanvas), "JPEG", 0, 0, A4_WIDTH_MM, heightMm, undefined, "FAST");

    position += sliceHeight;
    sliceIndex += 1;
  }
}

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
    const width = Math.max(page.scrollWidth, page.offsetWidth, 794);
    const height = Math.max(page.scrollHeight, page.offsetHeight, 1);

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15_000,
      foreignObjectRendering: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });

    addCanvasToPdf(pdf, canvas, index === 0);
  }

  pdf.save(filename);
}

export function buildReportFilename(type: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `JP-Rapport-${type}-${stamp}.pdf`;
}
