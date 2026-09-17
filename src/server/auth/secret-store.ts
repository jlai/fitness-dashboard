import {
  exportJWK,
  generateSecret,
  importJWK,
  type JWK,
  type JSONWebKeySet,
} from "jose";

export type SecretStorePurpose = "session" | "health" | "drive";

export interface SymmetricTokenKey {
  kid: string;
  key: Uint8Array;
}

export type OctJwk = JWK & {
  kty: "oct";
  kid: string;
  alg: string;
  k: string;
  use?: "sig" | "enc";
  /** Unix seconds when the key was created. */
  iat?: number;
};

export interface SecretStore {
  getActiveKey(): Promise<SymmetricTokenKey>;
  getKeyById(kid: string | undefined): Promise<SymmetricTokenKey>;
  /** Generate a new key, add it to ACCEPTED_KEYS, and set it as ACTIVE_KEY. */
  rotateKeys(): Promise<SymmetricTokenKey>;
}

export type SecretStoreConfig =
  | { backend: "env" }
  | { backend: "cloudflare-secrets"; storeId: string; accountId: string };

export interface SecretPurposeOptions {
  purpose: SecretStorePurpose;
  expectedAlgs: readonly string[];
  expectedUse: "sig" | "enc";
  /** Algorithm written into newly generated JWKs during rotation. */
  generateAlg: string;
}

const DEFAULT_TOKEN_SECRET_STORE_URL = "env://";

export function purposeOptions(
  purpose: SecretStorePurpose,
): SecretPurposeOptions {
  if (purpose === "session") {
    return {
      purpose,
      expectedAlgs: ["HS256"],
      expectedUse: "sig",
      generateAlg: "HS256",
    };
  }

  // health and drive both encrypt refresh tokens with A256GCM
  return {
    purpose,
    expectedAlgs: ["A256GCM"],
    expectedUse: "enc",
    generateAlg: "A256GCM",
  };
}

export function secretBindingName(
  purpose: SecretStorePurpose,
  kind: "ACTIVE_KEY" | "ACCEPTED_KEYS",
) {
  return `${purpose.toUpperCase()}_${kind}`;
}

export function getTokenSecretStoreConfig(): SecretStoreConfig {
  const raw = process.env.TOKEN_SECRET_STORE;

  return parseTokenSecretStoreUrl(
    raw === undefined || raw === "" ? DEFAULT_TOKEN_SECRET_STORE_URL : raw,
  );
}

function parseTokenSecretStoreUrl(raw: string): SecretStoreConfig {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw invalidTokenSecretStoreUrl();
  }

  if (url.protocol === "env:") {
    return { backend: "env" };
  }

  if (url.protocol === "cloudflare-secrets:") {
    const storeId = cloudflareSecretsStoreIdFromUrl(raw);

    if (!storeId) {
      throw new Error(
        "TOKEN_SECRET_STORE cloudflare-secrets URL must include a store id",
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (accountId === undefined || accountId.trim() === "") {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID is not configured for cloudflare-secrets store",
      );
    }

    return {
      backend: "cloudflare-secrets",
      storeId,
      accountId: accountId.trim(),
    };
  }

  throw invalidTokenSecretStoreUrl();
}

function cloudflareSecretsStoreIdFromUrl(raw: string) {
  const match = /^cloudflare-secrets:\/\/([^/?#]*)/i.exec(raw.trim());

  return match ? decodeURIComponent(match[1]) : "";
}

function invalidTokenSecretStoreUrl() {
  return new Error(
    "TOKEN_SECRET_STORE must be a URL such as env:// or cloudflare-secrets://storeId",
  );
}

const OCTET_KEY_BYTES = 32;

/** Drop accepted keys older than this when rotating. */
export const ACCEPTED_KEY_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Keep keys that are younger than {@link ACCEPTED_KEY_MAX_AGE_SECONDS}.
 * Keys without `iat` are retained (legacy keys minted before iat was written).
 */
export function retainAcceptedJwks(
  keys: OctJwk[],
  nowSeconds = Math.floor(Date.now() / 1000),
): OctJwk[] {
  const cutoff = nowSeconds - ACCEPTED_KEY_MAX_AGE_SECONDS;

  return keys.filter(
    (key) => typeof key.iat !== "number" || key.iat >= cutoff,
  );
}

function asOctJwk(
  value: unknown,
  label: string,
  options: Pick<SecretPurposeOptions, "expectedAlgs" | "expectedUse">,
): OctJwk {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JWK object`);
  }

  const jwk = value as JWK;

  if (jwk.kty !== "oct") {
    throw new Error(`${label} must be an oct JWK`);
  }

  if (typeof jwk.kid !== "string" || jwk.kid.length === 0) {
    throw new Error(`${label} must include a kid`);
  }

  if (typeof jwk.alg !== "string" || !options.expectedAlgs.includes(jwk.alg)) {
    throw new Error(
      `${label} alg must be ${options.expectedAlgs.join(" or ")}`,
    );
  }

  if (typeof jwk.use === "string" && jwk.use !== options.expectedUse) {
    throw new Error(`${label} use must be ${options.expectedUse}`);
  }

  if (typeof jwk.k !== "string" || jwk.k.length === 0) {
    throw new Error(`${label} must include a k`);
  }

  return jwk as OctJwk;
}

export async function parseOctJwk(
  value: unknown,
  label: string,
  options: Pick<SecretPurposeOptions, "expectedAlgs" | "expectedUse">,
): Promise<SymmetricTokenKey> {
  const jwk = asOctJwk(value, label, options);

  let key: Uint8Array;
  try {
    const imported = await importJWK(jwk, jwk.alg);
    if (!(imported instanceof Uint8Array)) {
      throw new Error(`${label} must be an oct JWK`);
    }
    key = imported;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${label} `)) {
      throw error;
    }
    throw new Error(`${label} is not a valid JWK`, { cause: error });
  }

  if (key.byteLength !== OCTET_KEY_BYTES) {
    throw new Error(`${label} must contain a 32-byte key`);
  }

  return { kid: jwk.kid, key };
}

export async function parseOctJwkValue(
  raw: string,
  label: string,
  options: Pick<SecretPurposeOptions, "expectedAlgs" | "expectedUse">,
): Promise<SymmetricTokenKey> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }

  return parseOctJwk(parsed, label, options);
}

export async function parseAcceptedKeys(
  raw: string,
  label: string,
  options: Pick<SecretPurposeOptions, "expectedAlgs" | "expectedUse">,
): Promise<{ keys: SymmetricTokenKey[]; jwks: JSONWebKeySet }> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("keys" in parsed) ||
    !Array.isArray((parsed as JSONWebKeySet).keys)
  ) {
    throw new Error(`${label} must be a JWKS object with a keys array`);
  }

  const jwks = parsed as JSONWebKeySet;

  if (jwks.keys.length === 0) {
    throw new Error(`${label} must include at least one key`);
  }

  const keys = await Promise.all(
    jwks.keys.map((jwk, index) =>
      parseOctJwk(jwk, `${label} keys[${index}]`, options),
    ),
  );
  const kids = new Set<string>();

  for (const key of keys) {
    if (kids.has(key.kid)) {
      throw new Error(`${label} contains duplicate kid ${key.kid}`);
    }

    kids.add(key.kid);
  }

  return { keys, jwks };
}

export function resolveKeyById(
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

export async function generateOctJwk(
  options: Pick<SecretPurposeOptions, "generateAlg" | "expectedUse">,
): Promise<OctJwk> {
  const secret = await generateSecret(options.generateAlg, {
    extractable: true,
  });
  const jwk = await exportJWK(secret);

  if (jwk.kty !== "oct" || typeof jwk.k !== "string") {
    throw new Error("failed to generate an oct JWK");
  }

  return {
    ...jwk,
    kty: "oct",
    kid: crypto.randomUUID(),
    alg: options.generateAlg,
    use: options.expectedUse,
    k: jwk.k,
    iat: Math.floor(Date.now() / 1000),
  };
}

export async function octJwkToSymmetricKey(
  jwk: OctJwk,
  options: Pick<SecretPurposeOptions, "expectedAlgs" | "expectedUse">,
  label: string,
): Promise<SymmetricTokenKey> {
  return parseOctJwk(jwk, label, options);
}
