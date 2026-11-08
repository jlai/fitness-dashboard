import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  generateWranglerConfig,
  parseJsonc,
} from "./generate-wrangler-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = path.join(root, ".temp");
fs.mkdirSync(tempRoot, { recursive: true });
const tempDir = fs.mkdtempSync(path.join(tempRoot, "wrangler-config-test-"));
after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

const env = {
  CF_BINDING_WORKER_SELF_REFERENCE: "my-custom-worker",
  CF_BINDING_SESSION_REVOCATION: "kv-id",
  CF_BINDING_SECRETS_STORE_ID: "store-id",
};
const options = {
  outConfigPath: path.join(tempDir, "wrangler.json"),
  redirectPath: path.join(tempDir, "config.json"),
};

test("source config has a valid default name without deployment variables", () => {
  const config = parseJsonc(
    fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"),
  );
  assert.equal(config.name, "fitness-dashboard");
});

test("generates a deploy config with a custom name and substituted bindings", () => {
  const result = generateWranglerConfig({
    ...options,
    env: { ...env, CF_PROJECT_NAME: "my-custom-worker" },
  });
  assert.equal(result.config.name, "my-custom-worker");
  assert.deepEqual(result.config.services, [
    { binding: "WORKER_SELF_REFERENCE", service: "my-custom-worker" },
  ]);
  assert.ok(result.applied.includes("CF_PROJECT_NAME"));
  assert.deepEqual(
    JSON.parse(fs.readFileSync(options.outConfigPath, "utf8")),
    result.config,
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(options.redirectPath, "utf8")), {
    configPath: "./wrangler.json",
  });
});

test("uses the source name when CF_PROJECT_NAME is unset", () => {
  const result = generateWranglerConfig({ ...options, env });
  assert.equal(result.config.name, "fitness-dashboard");
  assert.ok(!result.applied.includes("CF_PROJECT_NAME"));
});

test("rejects invalid custom names and missing bindings", () => {
  for (const name of [
    "",
    "Bad_name",
    "-invalid",
    "a".repeat(256),
    "<CF_PROJECT_NAME>",
  ]) {
    assert.throws(
      () =>
        generateWranglerConfig({
          ...options,
          env: { ...env, CF_PROJECT_NAME: name },
        }),
      /CF_PROJECT_NAME must start with a lowercase letter or number/,
    );
  }
  assert.throws(
    () => generateWranglerConfig({ ...options, env: {} }),
    /Missing required environment variable CF_BINDING_WORKER_SELF_REFERENCE/,
  );
});
