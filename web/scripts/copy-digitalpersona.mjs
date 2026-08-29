import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "public", "vendor", "digitalpersona");

const files = [
  {
    from: join(root, "node_modules", "@digitalpersona", "websdk", "dist", "websdk.client.ui.min.js"),
    to: join(destination, "websdk.client.ui.min.js"),
  },
  {
    from: join(root, "node_modules", "@digitalpersona", "fingerprint", "dist", "fingerprint.sdk.min.js"),
    to: join(destination, "fingerprint.sdk.min.js"),
  },
];

mkdirSync(destination, { recursive: true });

for (const file of files) {
  if (!existsSync(file.from)) {
    console.error(`[digitalpersona] Fichier introuvable : ${file.from}`);
    process.exitCode = 1;
    continue;
  }
  cpSync(file.from, file.to);
  console.log(`[digitalpersona] Copié → ${file.to}`);
}
