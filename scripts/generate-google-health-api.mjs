import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generate } from "orval";

const require = createRequire(import.meta.url);
const discoveryToOpenAPI = require("google-discovery-to-swagger");

const DISCOVERY_URL =
  "https://health.googleapis.com/$discovery/rest?version=v4";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "generated", "orval", "fetch", "google-health-api");

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}

const response = await fetch(DISCOVERY_URL);
if (!response.ok) {
  throw new Error(
    `Failed to fetch discovery: ${response.status} ${response.statusText}`
  );
}

/** @type {Record<string, unknown>} */
const data = await response.json();
discoveryToOpenAPI.setStrict(true);

/**
 * google-discovery-to-swagger keys operations by discovery `path` + HTTP method.
 * Google Health uses `v4/{+name}` for many resources, so later GETs overwrite
 * earlier ones (e.g. getSettings). Rewrite each method to its unique flatPath
 * and explode `{usersId}`-style path parameters before conversion.
 *
 * @param {unknown} resource
 */
function explodeDiscoveryResourcePaths(resource) {
  if (!resource || typeof resource !== "object") return;
  const rec = /** @type {Record<string, any>} */ (resource);
  if (rec.methods) {
    for (const method of Object.values(rec.methods)) {
      if (!method?.flatPath) continue;
      const placeholders = [...String(method.flatPath).matchAll(/\{([^}]+)\}/g)].map(
        (m) => m[1]
      );
      const parameters = { ...(method.parameters || {}) };
      for (const [name, param] of Object.entries(parameters)) {
        if (param?.location === "path" && !placeholders.includes(name)) {
          delete parameters[name];
        }
      }
      for (const ph of placeholders) {
        if (!parameters[ph]) {
          parameters[ph] = {
            description: `Identifier of the ${ph.replace(/Id$/, "")} resource.`,
            location: "path",
            required: true,
            type: "string",
          };
        }
      }
      const queryOrder = (method.parameterOrder || []).filter(
        (n) => parameters[n] && parameters[n].location !== "path"
      );
      method.path = method.flatPath;
      method.parameters = parameters;
      method.parameterOrder = [...placeholders, ...queryOrder];
    }
  }
  if (rec.resources) {
    for (const sub of Object.values(rec.resources)) {
      explodeDiscoveryResourcePaths(sub);
    }
  }
}

explodeDiscoveryResourcePaths(data);

/** @type {Record<string, unknown>} */
const openapi = discoveryToOpenAPI.convert(data);

console.log(JSON.stringify(openapi, null, 2));

console.log(`Converted ${DISCOVERY_URL}`);
console.log(`openapi version: ${openapi.openapi}`);
console.log(`title: ${openapi.info?.title}`);
console.log(`paths: ${Object.keys(openapi.paths ?? {}).length}`);
console.log(
  `schemas: ${Object.keys(openapi.components?.schemas ?? {}).length}`
);

await generate(
  {
    input: {
      target: openapi,
      filters: {
        mode: "include",
        tags: ["users"],
      },
    },
    output: {
      mode: "tags-split",
      target: "./generated/orval/fetch/google-health-api/endpoints.ts",
      schemas: "./generated/orval/fetch/google-health-api/models",
      client: "fetch",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/orval-fetch.ts",
          name: "customFetch",
        },
      },
    },
    hooks: {
      afterAllFilesWrite: {
        command: "prettier --write ./generated/orval/fetch/google-health-api",
        injectGeneratedDirsAndFiles: false,
      },
    },
  },
  root
);
