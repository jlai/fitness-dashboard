import {
  getDriveSecretStore,
  getHealthSecretStore,
  getSessionSecretStore,
} from "./get-secret-store";
import { getTokenSecretStoreConfig } from "./secret-store";

export type { SymmetricTokenKey } from "./secret-store";
export {
  getDriveSecretStore,
  getHealthSecretStore,
  getSessionSecretStore,
  resetSecretStores,
} from "./get-secret-store";
export {
  getTokenSecretStoreConfig,
  type SecretStore,
  type SecretStoreConfig,
} from "./secret-store";

export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

const REQUIRED_OAUTH_ENV_NAMES = [
  "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN",
] as const;

function isEnvConfigured(name: string) {
  const value = process.env[name];

  return value !== undefined && value.trim() !== "";
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getClientSecret() {
  return requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
}

export function getConfiguredClientId() {
  return requireEnv("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID");
}

export function getConfiguredRedirectUri() {
  return requireEnv("GOOGLE_OAUTH_REDIRECT_URI");
}

export function getAllowedOrigins() {
  const origins = requireEnv("GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN is not configured");
  }

  return origins;
}

const DEFAULT_SITE_TOKEN_EXPIRATION_MINUTES = 120;

export function getSiteTokenDefaultExpirationSeconds() {
  const raw = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
  const minutes =
    raw === undefined || raw === ""
      ? DEFAULT_SITE_TOKEN_EXPIRATION_MINUTES
      : Number(raw);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error(
      "SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES must be a positive number",
    );
  }

  return Math.round(minutes * 60);
}

export type RevocationDatabaseConfig =
  | { backend: "memory" }
  | { backend: "cloudflare-kv"; namespace: string };

const DEFAULT_REVOCATION_DATABASE_URL = "memory://";

export function getRevocationDatabaseConfig(): RevocationDatabaseConfig {
  const raw = process.env.SESSION_REVOCATION_DATABASE;

  return parseRevocationDatabaseUrl(
    raw === undefined || raw === "" ? DEFAULT_REVOCATION_DATABASE_URL : raw,
  );
}

function parseRevocationDatabaseUrl(raw: string): RevocationDatabaseConfig {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw invalidRevocationDatabaseUrl();
  }

  if (url.protocol === "memory:") {
    return { backend: "memory" };
  }

  if (url.protocol === "cloudflare-kv:") {
    const namespace = cloudflareKvNamespaceFromUrl(raw);

    if (!namespace) {
      throw new Error(
        "SESSION_REVOCATION_DATABASE cloudflare-kv URL must include a namespace",
      );
    }

    return { backend: "cloudflare-kv", namespace };
  }

  throw invalidRevocationDatabaseUrl();
}

function cloudflareKvNamespaceFromUrl(raw: string) {
  const match = /^cloudflare-kv:\/\/([^/?#]*)/i.exec(raw.trim());

  return match ? decodeURIComponent(match[1]) : "";
}

function invalidRevocationDatabaseUrl() {
  return new Error(
    "SESSION_REVOCATION_DATABASE must be a URL such as memory:// or cloudflare-kv://namespace",
  );
}

export async function assertServerEnv() {
  const missing: string[] = [...REQUIRED_OAUTH_ENV_NAMES].filter(
    (name) => !isEnvConfigured(name),
  );

  const secretStoreConfig = getTokenSecretStoreConfig();

  if (secretStoreConfig.backend === "env") {
    for (const name of [
      "SESSION_ACTIVE_KEY",
      "HEALTH_ACTIVE_KEY",
      "DRIVE_ACTIVE_KEY",
    ] as const) {
      if (!isEnvConfigured(name)) {
        missing.push(name);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  getConfiguredClientId();
  getClientSecret();
  getConfiguredRedirectUri();
  getAllowedOrigins();
  getSiteTokenDefaultExpirationSeconds();
  getRevocationDatabaseConfig();
  await getSessionSecretStore().getActiveKey();
  await getHealthSecretStore().getActiveKey();
  await getDriveSecretStore().getActiveKey();
}
