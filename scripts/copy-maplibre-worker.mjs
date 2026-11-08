import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destDir = path.join(root, "public", "maplibre");

fs.mkdirSync(destDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  const source = require.resolve(`maplibre-gl/dist/${file}`);
  fs.copyFileSync(source, path.join(destDir, file));
}
