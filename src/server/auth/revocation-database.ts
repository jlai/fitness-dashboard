import { ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS } from "@/config/encrypted-token";

import {
  getRevocationDatabaseConfig,
  type RevocationDatabaseConfig,
} from "./env";

const CLOUDFLARE_KV_MIN_TTL_SECONDS = 3600;
const BEFORE_KEY_PREFIX = "before:";

export interface RevocationTokenClaims {
  jti: string;
  sub: string;
  iat: number;
}

export interface RevocationKvNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expiration: number },
  ): Promise<void>;
}

declare global {
  interface CloudflareEnv {
    SESSION_REVOCATION?: RevocationKvNamespace;
  }
}

export abstract class RevocationDatabase {
  abstract add(jti: string, expiresAt: number): Promise<void>;
  abstract invalidateIssuedBeforeNow(sub: string): Promise<void>;
  abstract isRevoked(token: RevocationTokenClaims): Promise<boolean>;
}

export class MemoryRevocationDatabase extends RevocationDatabase {
  private readonly revoked = new Map<string, number>();
  private readonly issuedBefore = new Map<
    string,
    { issuedBefore: number; expiresAt: number }
  >();

  async add(jti: string, expiresAt: number): Promise<void> {
    if (expiresAt <= nowSeconds()) {
      return;
    }

    this.revoked.set(jti, expiresAt);
  }

  async invalidateIssuedBeforeNow(sub: string): Promise<void> {
    const issuedBefore = nowSeconds();

    this.issuedBefore.set(sub, {
      issuedBefore,
      expiresAt: getExpiresAtForRevocationEntry(issuedBefore),
    });
  }

  async isRevoked(token: RevocationTokenClaims): Promise<boolean> {
    if (await this.isJtiRevoked(token.jti)) {
      return true;
    }

    return this.isInvalidatedByIssuedBefore(token.sub, token.iat);
  }

  private async isJtiRevoked(jti: string): Promise<boolean> {
    const expiresAt = this.revoked.get(jti);

    if (expiresAt === undefined) {
      return false;
    }

    if (expiresAt <= nowSeconds()) {
      this.revoked.delete(jti);
      return false;
    }

    return true;
  }

  private isInvalidatedByIssuedBefore(sub: string, iat: number): boolean {
    const entry = this.issuedBefore.get(sub);

    if (entry === undefined) {
      return false;
    }

    if (entry.expiresAt <= nowSeconds()) {
      this.issuedBefore.delete(sub);
      return false;
    }

    return iat < entry.issuedBefore;
  }
}

export class CloudflareKVRevocationDatabase extends RevocationDatabase {
  constructor(private readonly kv: RevocationKvNamespace) {
    super();
  }

  async add(jti: string, expiresAt: number): Promise<void> {
    const now = nowSeconds();

    if (expiresAt <= now) {
      return;
    }

    await this.kv.put(jti, "1", {
      expiration: Math.max(expiresAt, now + CLOUDFLARE_KV_MIN_TTL_SECONDS),
    });
  }

  async invalidateIssuedBeforeNow(sub: string): Promise<void> {
    const issuedBefore = nowSeconds();

    await this.kv.put(beforeKey(sub), String(issuedBefore), {
      expiration: getExpiresAtForRevocationEntry(issuedBefore),
    });
  }

  async isRevoked(token: RevocationTokenClaims): Promise<boolean> {
    const [jtiValue, beforeValue] = await Promise.all([
      this.kv.get(token.jti),
      this.kv.get(beforeKey(token.sub)),
    ]);

    if (jtiValue !== null) {
      return true;
    }

    const issuedBefore = parseIssuedBefore(beforeValue);

    return issuedBefore !== undefined && token.iat < issuedBefore;
  }
}

function beforeKey(sub: string) {
  return `${BEFORE_KEY_PREFIX}${sub}`;
}

/**
 * Determine when the revocation entry should expire from the KV.
 * This should be later than the expiration of the longest-lived token that might be revoked.
 */
function getExpiresAtForRevocationEntry(issuedBefore: number) {
  return Math.max(
    issuedBefore + ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS,
    nowSeconds() + CLOUDFLARE_KV_MIN_TTL_SECONDS,
  );
}

function parseIssuedBefore(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

let cached: { key: string; database: RevocationDatabase } | undefined;

export async function getRevocationDatabase(): Promise<RevocationDatabase> {
  const config = getRevocationDatabaseConfig();
  const key = revocationDatabaseCacheKey(config);

  if (cached?.key === key) {
    return cached.database;
  }

  const database =
    config.backend === "cloudflare-kv"
      ? new CloudflareKVRevocationDatabase(
          await getSessionRevocationKv(config.namespace),
        )
      : new MemoryRevocationDatabase();

  cached = { key, database };
  return database;
}

export function resetRevocationDatabase() {
  cached = undefined;
}

function revocationDatabaseCacheKey(config: RevocationDatabaseConfig) {
  return config.backend === "cloudflare-kv"
    ? `cloudflare-kv:${config.namespace}`
    : "memory";
}

async function getSessionRevocationKv(
  namespace: string,
): Promise<RevocationKvNamespace> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const kv = (env as Record<string, RevocationKvNamespace | undefined>)[
    namespace
  ];

  if (!kv) {
    throw new Error(`${namespace} KV binding is not configured`);
  }

  return kv;
}
