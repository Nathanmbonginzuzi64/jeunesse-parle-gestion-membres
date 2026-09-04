/**
 * Génère le logo JP sans fond bleu (emblème circulaire) + icônes PWA / favicon.
 * Usage: node scripts/prepare-brand-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourceCandidates = [
  path.join(root, "public", "logo.jpeg"),
  path.join(root, "..", "mobile", "assets", "images", "logo.jpeg"),
];

const source = sourceCandidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error("Logo source introuvable.");
  process.exit(1);
}

const outDir = path.join(root, "public");
const iconsDir = path.join(outDir, "icons");
fs.mkdirSync(iconsDir, { recursive: true });

function isBlueBackground(r, g, b, a) {
  if (a < 20) return true;
  const isBlueDominant = b > r + 20 && b > g + 5;
  const highBlue = b > 130 && r < 170 && g < 220;
  return isBlueDominant && highBlue;
}

async function removeBlueBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (isBlueBackground(r, g, b, a)) {
      pixels[i + 3] = 0;
    }
  }

  return { pixels, width: info.width, height: info.height };
}

function contentBounds(pixels, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = pixels[(y * width + x) * 4 + 3];
      if (a > 40) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { left: 0, top: 0, width, height };
  }
  // Ne garder que la partie haute (emblème) : ~72 % de la hauteur utile
  const fullH = maxY - minY + 1;
  const emblemH = Math.round(fullH * 0.72);
  const pad = Math.round(Math.min(width, height) * 0.02);
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2),
    height: Math.min(height - Math.max(0, minY - pad), emblemH + pad * 2),
  };
}

const { pixels, width, height } = await removeBlueBackground(source);
const bounds = contentBounds(pixels, width, height);

const transparent = sharp(pixels, {
  raw: { width, height, channels: 4 },
}).extract(bounds).png();

await transparent
  .clone()
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile(path.join(outDir, "logo.png"));

const sizes = [
  { size: 32, name: "favicon-32.png" },
  { size: 48, name: "favicon-48.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

for (const { size, name } of sizes) {
  await transparent
    .clone()
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(iconsDir, name));
}

await transparent
  .clone()
  .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(outDir, "favicon.ico"));

fs.writeFileSync(
  path.join(outDir, "icon.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" role="img" aria-label="Jeunesse Parle">
  <image width="512" height="512" xlink:href="/logo.png" href="/logo.png"/>
</svg>
`,
);

console.log("OK — emblème JP transparent + icônes générés.");
