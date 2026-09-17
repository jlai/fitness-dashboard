/**
 * @jest-environment node
 */
import { ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS } from "@/server/auth/encrypted-token";
import {
  CloudflareKVRevocationDatabase,
  MemoryRevocationDatabase,
} from "@/server/auth/revocation-database";
import {
  createAuthMiniflare,
  type AuthMiniflare,
} from "@/__tests__/helpers/cloudflare-miniflare";

function token(overrides?: {
  jti?: string;
  sub?: string;
  iat?: number;
}) {
  return {
    jti: overrides?.jti ?? "jti-1",
    sub: overrides?.sub ?? "user-1",
    iat: overrides?.iat ?? Math.floor(Date.now() / 1000),
  };
}

describe("MemoryRevocationDatabase", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("revokes a token id until it expires", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    const expiresAt = Math.floor(Date.now() / 1000) + 60;

    await db.add("jti-1", expiresAt);

    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(true);
    await expect(db.isRevoked(token({ jti: "jti-2" }))).resolves.toBe(false);

    jest.setSystemTime(new Date("2026-01-01T00:01:01Z"));

    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(false);
  });

  it("does not store an already-expired token id", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    await db.add("jti-1", Math.floor(Date.now() / 1000) - 1);

    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(false);
  });

  it("invalidates tokens issued before a cutoff for a sub", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    const cutoff = Math.floor(Date.now() / 1000);

    await db.invalidateIssuedBefore("user-1", cutoff);

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(true);
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff })),
    ).resolves.toBe(false);
    await expect(
      db.isRevoked(token({ sub: "user-2", iat: cutoff - 1 })),
    ).resolves.toBe(false);
  });

  it("keeps the maximum issued-before cutoff", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    const earlier = Math.floor(Date.now() / 1000) - 30;
    const later = Math.floor(Date.now() / 1000);

    await db.invalidateIssuedBefore("user-1", later);
    await db.invalidateIssuedBefore("user-1", earlier);

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: later - 1 })),
    ).resolves.toBe(true);
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: later })),
    ).resolves.toBe(false);
  });

  it("drops an expired issued-before watermark", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    const cutoff = Math.floor(Date.now() / 1000);

    await db.invalidateIssuedBefore("user-1", cutoff);

    jest.setSystemTime(
      new Date(
        (cutoff + ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS + 1) * 1000,
      ),
    );

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(false);
  });

  it("does not store an already-expired issued-before watermark", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    const cutoff =
      Math.floor(Date.now() / 1000) -
      ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS -
      1;

    await db.invalidateIssuedBefore("user-1", cutoff);

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(false);
  });
});

describe("CloudflareKVRevocationDatabase (Miniflare)", () => {
  let authMf: AuthMiniflare;

  beforeEach(async () => {
    authMf = await createAuthMiniflare();
  }, 30_000);

  afterEach(async () => {
    await authMf.dispose();
  });

  it("stores revoked token ids in KV and treats them as revoked", async () => {
    const kv = await authMf.getKv();
    const db = new CloudflareKVRevocationDatabase(kv);
    const expiresAt = Math.floor(Date.now() / 1000) + 120;

    await db.add("jti-1", expiresAt);

    await expect(kv.get("jti-1")).resolves.toBe("1");
    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(true);
    await expect(db.isRevoked(token({ jti: "jti-2" }))).resolves.toBe(false);
  });

  it("uses Cloudflare KV's minimum lifetime when less than 60 seconds remain", async () => {
    const kv = await authMf.getKv();
    const db = new CloudflareKVRevocationDatabase(kv);
    const now = Math.floor(Date.now() / 1000);

    await db.add("jti-1", now + 10);

    await expect(kv.get("jti-1")).resolves.toBe("1");
    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(true);
  });

  it("does not store an already-expired token id", async () => {
    const kv = await authMf.getKv();
    const db = new CloudflareKVRevocationDatabase(kv);

    await db.add("jti-1", Math.floor(Date.now() / 1000) - 1);

    await expect(kv.get("jti-1")).resolves.toBeNull();
    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(false);
  });

  it("stores issued-before watermarks under a before: key", async () => {
    const kv = await authMf.getKv();
    const db = new CloudflareKVRevocationDatabase(kv);
    const cutoff = Math.floor(Date.now() / 1000);

    await db.invalidateIssuedBefore("user-1", cutoff);

    await expect(kv.get("before:user-1")).resolves.toBe(String(cutoff));
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(true);
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff })),
    ).resolves.toBe(false);
  });

  it("keeps the maximum issued-before cutoff in KV", async () => {
    const earlier = Math.floor(Date.now() / 1000) - 30;
    const later = Math.floor(Date.now() / 1000);
    const kv = await authMf.getKv();
    const db = new CloudflareKVRevocationDatabase(kv);

    await db.invalidateIssuedBefore("user-1", later);
    await db.invalidateIssuedBefore("user-1", earlier);

    await expect(kv.get("before:user-1")).resolves.toBe(String(later));
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: later - 1 })),
    ).resolves.toBe(true);
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: later })),
    ).resolves.toBe(false);
  });

  it("does not store an already-expired issued-before watermark", async () => {
    const kv = await authMf.getKv();
    const db = new CloudflareKVRevocationDatabase(kv);
    const cutoff =
      Math.floor(Date.now() / 1000) -
      ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS -
      1;

    await db.invalidateIssuedBefore("user-1", cutoff);

    await expect(kv.get("before:user-1")).resolves.toBeNull();
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(false);
  });
});
