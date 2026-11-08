/**
 * Register (or update) the Google Cross-Account Protection (RISC) event stream
 * so Google delivers security event tokens to this app's receiver.
 *
 * Prerequisites:
 * - Same GCP project as Sign In with Google / OAuth
 * - Service account with role roles/riscconfigs.admin and a JSON key
 * - RISC API enabled (accept RISC Terms in the API Console)
 * - Receiver URL on an authorized domain for the project (HTTPS)
 *
 * @see https://developers.google.com/identity/protocols/risc
 *
 * Usage:
 *   node scripts/register-risc-receiver.mjs \
 *     --credentials ./risc-service-account.json \
 *     --receiver-url https://example.com/auth/google/risc/callback
 *
 *   node scripts/register-risc-receiver.mjs \
 *     --credentials ./risc-service-account.json \
 *     --origin https://example.com \
 *     --base-path /fitness
 *
 *   # Optional: send a verification event after registering
 *   node scripts/register-risc-receiver.mjs ... --verify
 *
 * Env alternatives:
 *   GOOGLE_RISC_SERVICE_ACCOUNT_KEY  Path to the service account JSON key
 *   RISC_RECEIVER_URL                Full HTTPS receiver URL
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importPKCS8, SignJWT } from "jose";

const RISC_STREAM_UPDATE_URL = "https://risc.googleapis.com/v1beta/stream:update";
const RISC_STREAM_VERIFY_URL = "https://risc.googleapis.com/v1beta/stream:verify";
const RISC_STREAM_GET_URL = "https://risc.googleapis.com/v1beta/stream";
const RISC_AUTH_AUDIENCE =
  "https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService";
const DELIVERY_METHOD =
  "https://schemas.openid.net/secevent/risc/delivery-method/push";
const DEFAULT_RECEIVER_PATH = "/auth/google/risc/callback";

const EVENTS_REQUESTED = [
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  "https://schemas.openid.net/secevent/risc/event-type/verification",
];

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const args = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--verify") {
      args.verify = true;
      continue;
    }

    if (arg === "--print-config") {
      args.printConfig = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[i + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    i++;
  }

  return args;
}

function printUsage() {
  console.log(`Register a Google RISC security-event receiver.

Usage:
  node scripts/register-risc-receiver.mjs --credentials <sa.json> --receiver-url <https-url>
  node scripts/register-risc-receiver.mjs --credentials <sa.json> --origin <https-origin> [--base-path <path>]

Options:
  --credentials <path>   Service account JSON key (RISC Configuration Admin)
  --receiver-url <url>   Full HTTPS receiver URL
  --origin <url>         Site origin used to build the receiver URL
  --base-path <path>     Optional app base path (also reads NEXT_PUBLIC_BASE_PATH)
  --verify               After update, request a verification event
  --print-config         GET and print the current stream configuration after update
  -h, --help             Show this help

Environment:
  GOOGLE_RISC_SERVICE_ACCOUNT_KEY   Default for --credentials
  RISC_RECEIVER_URL                 Default for --receiver-url
  NEXT_PUBLIC_BASE_PATH             Default for --base-path
`);
}

/**
 * @param {string | undefined} value
 */
function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

/**
 * @param {string} origin
 * @param {string} basePath
 */
function buildReceiverUrl(origin, basePath) {
  let parsed;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid --origin URL: ${origin}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error("RISC receiver URLs must use HTTPS (--origin must be https://)");
  }

  const normalizedOrigin = parsed.origin;
  const pathPrefix = normalizeBasePath(basePath);
  return `${normalizedOrigin}${pathPrefix}${DEFAULT_RECEIVER_PATH}`;
}

/**
 * @param {string} receiverUrl
 */
function assertHttpsReceiverUrl(receiverUrl) {
  let parsed;

  try {
    parsed = new URL(receiverUrl);
  } catch {
    throw new Error(`Invalid --receiver-url: ${receiverUrl}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error("RISC receiver URLs must use HTTPS");
  }

  return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || parsed.origin;
}

/**
 * @param {string} credentialsPath
 */
function loadServiceAccount(credentialsPath) {
  const resolved = path.resolve(credentialsPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Service account file not found: ${resolved}`);
  }

  /** @type {Record<string, unknown>} */
  const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
  const clientEmail = serviceAccount.client_email;
  const privateKey = serviceAccount.private_key;
  const privateKeyId = serviceAccount.private_key_id;

  if (
    typeof clientEmail !== "string" ||
    typeof privateKey !== "string" ||
    typeof privateKeyId !== "string"
  ) {
    throw new Error(
      "Service account JSON must include client_email, private_key, and private_key_id",
    );
  }

  return {
    clientEmail,
    privateKey,
    privateKeyId,
  };
}

/**
 * @param {{ clientEmail: string; privateKey: string; privateKeyId: string }} serviceAccount
 */
async function makeRiscAuthToken(serviceAccount) {
  const key = await importPKCS8(serviceAccount.privateKey, "RS256");
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({
      alg: "RS256",
      kid: serviceAccount.privateKeyId,
      typ: "JWT",
    })
    .setIssuer(serviceAccount.clientEmail)
    .setSubject(serviceAccount.clientEmail)
    .setAudience(RISC_AUTH_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 3600)
    .sign(key);
}

/**
 * @param {string} url
 * @param {string} authToken
 * @param {RequestInit} [init]
 */
async function riscFetch(url, authToken, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  /** @type {unknown} */
  let body = text;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // keep raw text
    }
  } else {
    body = null;
  }

  if (!response.ok) {
    const detail =
      typeof body === "object" && body !== null
        ? JSON.stringify(body, null, 2)
        : String(body);
    throw new Error(
      `RISC API ${init.method ?? "GET"} ${url} failed: HTTP ${response.status}\n${detail}`,
    );
  }

  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const credentialsPath =
    (typeof args.credentials === "string" && args.credentials) ||
    process.env.GOOGLE_RISC_SERVICE_ACCOUNT_KEY;

  if (!credentialsPath) {
    throw new Error(
      "Provide --credentials or set GOOGLE_RISC_SERVICE_ACCOUNT_KEY",
    );
  }

  let receiverUrl =
    (typeof args["receiver-url"] === "string" && args["receiver-url"]) ||
    process.env.RISC_RECEIVER_URL;

  if (!receiverUrl) {
    const origin = typeof args.origin === "string" ? args.origin : undefined;

    if (!origin) {
      throw new Error(
        "Provide --receiver-url / RISC_RECEIVER_URL, or --origin to build the URL",
      );
    }

    const basePath =
      (typeof args["base-path"] === "string" && args["base-path"]) ||
      process.env.NEXT_PUBLIC_BASE_PATH ||
      "";
    receiverUrl = buildReceiverUrl(origin, basePath);
  } else {
    receiverUrl = assertHttpsReceiverUrl(receiverUrl);
  }

  if (!receiverUrl.startsWith("https://")) {
    throw new Error("RISC receiver URLs must use HTTPS");
  }

  const serviceAccount = loadServiceAccount(credentialsPath);
  const authToken = await makeRiscAuthToken(serviceAccount);

  console.log(`Service account: ${serviceAccount.clientEmail}`);
  console.log(`Receiver URL:    ${receiverUrl}`);
  console.log(`Events:          ${EVENTS_REQUESTED.length}`);

  const streamConfig = {
    delivery: {
      delivery_method: DELIVERY_METHOD,
      url: receiverUrl,
    },
    events_requested: EVENTS_REQUESTED,
  };

  await riscFetch(RISC_STREAM_UPDATE_URL, authToken, {
    method: "POST",
    body: JSON.stringify(streamConfig),
  });

  console.log("Stream configuration updated.");

  if (args.printConfig) {
    const current = await riscFetch(RISC_STREAM_GET_URL, authToken);
    console.log("Current stream configuration:");
    console.log(JSON.stringify(current, null, 2));
  }

  if (args.verify) {
    const state = `fitness-dashboard-risc-verify-${Date.now()}`;
    await riscFetch(RISC_STREAM_VERIFY_URL, authToken, {
      method: "POST",
      body: JSON.stringify({ state }),
    });
    console.log(`Verification event requested (state=${state}).`);
    console.log(
      "Check server logs / revocation handling for the verification delivery.",
    );
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
