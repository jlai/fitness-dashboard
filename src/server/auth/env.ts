export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const REQUIRED_ENV_NAMES = [
  "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN",
  "SESSION_TOKEN_JWK",
  "REFRESH_TOKEN_JWK",
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

const OCTET_KEY_BYTES = 32;

export interface SymmetricTokenKey {
  kid: string;
  key: Uint8Array;
}

interface OctJwkOptions {
  envName: string;
  expectedAlgs: readonly string[];
  expectedUse: "sig" | "enc";
}

function parseOctJwk(
  value: unknown,
  options: OctJwkOptions,
): SymmetricTokenKey {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${options.envName} must be a JWK object`);
  }

  const jwk = value as Record<string, unknown>;

  if (jwk.kty !== "oct") {
    throw new Error(`${options.envName} must be an oct JWK`);
  }

  if (typeof jwk.kid !== "string" || jwk.kid.length === 0) {
    throw new Error(`${options.envName} must include a kid`);
  }

  if (typeof jwk.alg !== "string" || !options.expectedAlgs.includes(jwk.alg)) {
    throw new Error(
      `${options.envName} alg must be ${options.expectedAlgs.join(" or ")}`,
    );
  }

  if (typeof jwk.use === "string" && jwk.use !== options.expectedUse) {
    throw new Error(`${options.envName} use must be ${options.expectedUse}`);
  }

  if (typeof jwk.k !== "string" || jwk.k.length === 0) {
    throw new Error(`${options.envName} must include a k`);
  }

  const key = new Uint8Array(Buffer.from(jwk.k, "base64url"));

  if (key.byteLength !== OCTET_KEY_BYTES) {
    throw new Error(`${options.envName} must contain a 32-byte key`);
  }

  return { kid: jwk.kid, key };
}

function loadSymmetricTokenKeys(options: OctJwkOptions): SymmetricTokenKey[] {
  const raw = requireEnv(options.envName);

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${options.envName} must be valid JSON`);
  }

  const jwks =
    parsed &&
    typeof parsed === "object" &&
    "keys" in parsed &&
    Array.isArray((parsed as { keys: unknown }).keys)
      ? (parsed as { keys: unknown[] }).keys
      : [parsed];

  if (jwks.length === 0) {
    throw new Error(`${options.envName} must include at least one key`);
  }

  const keys = jwks.map((jwk) => parseOctJwk(jwk, options));
  const kids = new Set<string>();

  for (const key of keys) {
    if (kids.has(key.kid)) {
      throw new Error(`${options.envName} contains duplicate kid ${key.kid}`);
    }

    kids.add(key.kid);
  }

  return keys;
}

function resolveSymmetricTokenKey(
  keys: SymmetricTokenKey[],
  kid: string | undefined,
  label: string,
) {
  if (!kid) {
    throw new Error(`${label} is missing kid`);
  }

  const key = keys.find((candidate) => candidate.kid === kid);

  if (!key) {
    throw new Error(`unknown ${label} key id`);
  }

  return key;
}

function sessionTokenJwkOptions(): OctJwkOptions {
  return {
    envName: "SESSION_TOKEN_JWK",
    expectedAlgs: ["HS256"],
    expectedUse: "sig",
  };
}

function refreshTokenJwkOptions(): OctJwkOptions {
  return {
    envName: "REFRESH_TOKEN_JWK",
    expectedAlgs: ["A256GCM"],
    expectedUse: "enc",
  };
}

export function getSessionTokenKey() {
  return loadSymmetricTokenKeys(sessionTokenJwkOptions())[0];
}

export function resolveSessionTokenKey(kid: string | undefined) {
  return resolveSymmetricTokenKey(
    loadSymmetricTokenKeys(sessionTokenJwkOptions()),
    kid,
    "session token",
  );
}

export function getRefreshTokenKey() {
  return loadSymmetricTokenKeys(refreshTokenJwkOptions())[0];
}

export function resolveRefreshTokenKey(kid: string | undefined) {
  return resolveSymmetricTokenKey(
    loadSymmetricTokenKeys(refreshTokenJwkOptions()),
    kid,
    "refresh token",
  );
}

export function assertServerEnv() {
  const missing = REQUIRED_ENV_NAMES.filter((name) => !isEnvConfigured(name));

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
  getSessionTokenKey();
  getRefreshTokenKey();
}
