import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const JPEG_QUALITY = 0.92;
/** Ignore une tranche résiduelle inférieure à 4 % de la hauteur A4 (évite les pages blanches). */
const MIN_SLICE_RATIO = 0.04;

function canvasToJpeg(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new Error("Échec de la conversion de la page en image.");
  }
  return dataUrl;
}

function pageHeightPx(canvasWidth: number): number {
  return Math.max(1, Math.floor((canvasWidth * A4_HEIGHT_MM) / A4_WIDTH_MM));
}

/** Ajoute une image au PDF avec largeur A4 et hauteur proportionnelle. */
function addImageSlice(
  pdf: jsPDF,
  sliceCanvas: HTMLCanvasElement,
  yOffsetMm = 0,
) {
  const heightMm = (sliceCanvas.height * A4_WIDTH_MM) / sliceCanvas.width;
  pdf.addImage(
    canvasToJpeg(sliceCanvas),
    "JPEG",
    0,
    yOffsetMm,
    A4_WIDTH_MM,
    heightMm,
    undefined,
    "FAST",
  );
}

function createSliceCanvas(
  source: HTMLCanvasElement,
  position: number,
  sliceHeight: number,
): HTMLCanvasElement {
  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = source.width;
  sliceCanvas.height = sliceHeight;

  const ctx = sliceCanvas.getContext("2d");
  if (!ctx) throw new Error("Contexte canvas indisponible.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
  ctx.drawImage(
    source,
    0,
    position,
    source.width,
    sliceHeight,
    0,
    0,
    source.width,
    sliceHeight,
  );

  return sliceCanvas;
}

/** Découpe un canvas en tranches A4 en évitant les pages quasi vides en fin de document. */
function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstCapture: boolean) {
  if (canvas.width < 1 || canvas.height < 1) {
    return;
  }

  const maxPagePx = pageHeightPx(canvas.width);
  const minSlicePx = Math.max(8, Math.floor(maxPagePx * MIN_SLICE_RATIO));

  let position = 0;
  let sliceIndex = 0;

  while (position < canvas.height) {
    const remaining = canvas.height - position;
    let sliceHeight = Math.min(maxPagePx, remaining);

    // Fusionner un reste minuscule dans la tranche courante plutôt que créer une page blanche.
    if (remaining > sliceHeight && remaining - sliceHeight < minSlicePx) {
      sliceHeight = remaining;
    }

    if (sliceHeight < minSlicePx && sliceIndex > 0) {
      break;
    }

    const needsNewPage = !(isFirstCapture && sliceIndex === 0);
    if (needsNewPage) pdf.addPage();

    const sliceCanvas = createSliceCanvas(canvas, position, sliceHeight);
    addImageSlice(pdf, sliceCanvas);

    position += sliceHeight;
    sliceIndex += 1;
  }
}

/** Une page HTML = une capture ; feuille A4 pleine si le contenu tient sur une page. */
function addReportPageToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstCapture: boolean) {
  if (canvas.width < 1 || canvas.height < 1) {
    return;
  }

  const maxPagePx = pageHeightPx(canvas.width);
  // Tolérance scale×2 : évite une 2e page blanche quand la hauteur A4 diffère de 1–2 px.
  const fitsOneSheet = canvas.height <= maxPagePx + 12;

  if (fitsOneSheet) {
    if (!isFirstCapture) pdf.addPage();
    // Occupe toute la hauteur A4 pour ancrer le footer en bas de la feuille PDF.
    pdf.addImage(
      canvasToJpeg(canvas),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
      undefined,
      "FAST",
    );
    return;
  }

  addCanvasToPdf(pdf, canvas, isFirstCapture);
}

function hasVisibleContent(page: HTMLElement): boolean {
  if (page.dataset.reportEmpty === "true") return false;
  const text = page.textContent?.replace(/\s+/g, "").trim() ?? "";
  return text.length > 0;
}

export async function exportReportToPdf(
  container: HTMLElement,
  filename: string,
): Promise<void> {
  const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-report-page]")).filter(
    hasVisibleContent,
  );

  if (pages.length === 0) {
    throw new Error("Aucune page de rapport à exporter.");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index]!;
    const width = page.offsetWidth || page.scrollWidth || 794;
    const height = page.scrollHeight || page.offsetHeight || 1;

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

    addReportPageToPdf(pdf, canvas, index === 0);
  }

  pdf.save(filename);
}

export function buildReportFilename(type: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `JP-Rapport-${type}-${stamp}.pdf`;
}
