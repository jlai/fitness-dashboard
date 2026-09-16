/**
 * Generates a deploy-time Wrangler config from wrangler.jsonc, substituting
 * `"<CF_BINDING_…>"` string placeholders with matching environment variables,
 * then redirects Wrangler via `.wrangler/deploy/config.json`.
 *
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#generated-wrangler-configuration
 *
 * Example in wrangler.jsonc:
 *   "service": "<CF_BINDING_WORKER_SELF_REFERENCE>"
 * Resolved from:
 *   CF_BINDING_WORKER_SELF_REFERENCE=fitness-dashboard-beta
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const stripJsonComments = require("strip-json-comments");

const PLACEHOLDER = /^<(CF_BINDING_[A-Z0-9_]+)>$/;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceConfigPath = path.join(root, "wrangler.jsonc");
const deployDir = path.join(root, ".wrangler", "deploy");
const generatedConfigPath = path.join(deployDir, "wrangler.json");
const redirectConfigPath = path.join(deployDir, "config.json");

/**
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function parseJsonc(text) {
  const withoutComments = stripJsonComments(text);
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[\]}])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}

/**
 * Recursively replace `"<CF_BINDING_…>"` strings with env values.
 * @param {unknown} value
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} applied
 * @returns {unknown}
 */
export function substituteBindingPlaceholders(value, env, applied = []) {
  if (typeof value === "string") {
    const match = PLACEHOLDER.exec(value);
    if (!match) return value;
    const envName = match[1];
    const resolved = env[envName];
    if (resolved == null || resolved === "") {
      throw new Error(`Missing required environment variable ${envName}`);
    }
    applied.push(envName);
    return resolved;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      substituteBindingPlaceholders(item, env, applied),
    );
  }

  if (value && typeof value === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = substituteBindingPlaceholders(child, env, applied);
    }
    return out;
  }

  return value;
}

/**
 * Relocate project-relative paths so they resolve from `.wrangler/deploy/`.
 * @param {string} filePath
 */
function relocatePath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return filePath;
  if (path.isAbsolute(filePath)) return filePath;
  return path.posix.normalize(
    path.posix.join("../..", filePath.replaceAll("\\", "/")),
  );
}

/**
 * @param {Record<string, unknown>} config
 */
export function relocateConfigPaths(config) {
  if (typeof config.$schema === "string") {
    config.$schema = relocatePath(config.$schema);
  }
  if (typeof config.main === "string") {
    config.main = relocatePath(config.main);
  }
  if (config.assets && typeof config.assets === "object") {
    const assets = /** @type {Record<string, unknown>} */ (config.assets);
    if (typeof assets.directory === "string") {
      assets.directory = relocatePath(assets.directory);
    }
  }
  if (typeof config.tsconfig === "string") {
    config.tsconfig = relocatePath(config.tsconfig);
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.sourcePath]
 * @param {string} [options.outConfigPath]
 * @param {string} [options.redirectPath]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @returns {{ config: Record<string, unknown>, applied: string[] }}
 */
export function generateWranglerConfig(options = {}) {
  const sourcePath = options.sourcePath ?? sourceConfigPath;
  const outConfigPath = options.outConfigPath ?? generatedConfigPath;
  const redirectPath = options.redirectPath ?? redirectConfigPath;
  const env = options.env ?? process.env;

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Wrangler source config not found: ${sourcePath}`);
  }

  const source = parseJsonc(fs.readFileSync(sourcePath, "utf8"));
  // Generated configs must not include named environments.
  delete source.env;

  /** @type {string[]} */
  const applied = [];
  const config = /** @type {Record<string, unknown>} */ (
    substituteBindingPlaceholders(source, env, applied)
  );

  relocateConfigPaths(config);

  fs.mkdirSync(path.dirname(outConfigPath), { recursive: true });
  fs.writeFileSync(outConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  const relativeConfigPath = path
    .relative(path.dirname(redirectPath), outConfigPath)
    .replaceAll("\\", "/");
  const configPath = relativeConfigPath.startsWith(".")
    ? relativeConfigPath
    : `./${relativeConfigPath}`;
  fs.mkdirSync(path.dirname(redirectPath), { recursive: true });
  fs.writeFileSync(
    redirectPath,
    `${JSON.stringify({ configPath }, null, 2)}\n`,
    "utf8",
  );

  return { config, applied: [...new Set(applied)].sort() };
}

function main() {
  const { applied } = generateWranglerConfig();
  console.log(
    `Wrote generated Wrangler config to ${path.relative(root, generatedConfigPath)}`,
  );
  console.log(
    `Wrote Wrangler deploy redirect to ${path.relative(root, redirectConfigPath)}`,
  );
  if (applied.length === 0) {
    console.log("No <CF_BINDING_*> placeholders substituted.");
  } else {
    console.log(`Substituted: ${applied.join(", ")}`);
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
