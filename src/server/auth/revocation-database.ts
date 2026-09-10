import {
  getRevocationDatabaseConfig,
  type RevocationDatabaseConfig,
} from "./env";

const CLOUDFLARE_KV_MIN_TTL_SECONDS = 60;

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
  abstract isRevoked(jti: string): Promise<boolean>;
}

export class MemoryRevocationDatabase extends RevocationDatabase {
  private readonly revoked = new Map<string, number>();

  async add(jti: string, expiresAt: number): Promise<void> {
    if (expiresAt <= nowSeconds()) {
      return;
    }

    this.revoked.set(jti, expiresAt);
  }

  async isRevoked(jti: string): Promise<boolean> {
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

  async isRevoked(jti: string): Promise<boolean> {
    return (await this.kv.get(jti)) !== null;
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

let cached:
  | { key: string; database: RevocationDatabase }
  | undefined;

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
