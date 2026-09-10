import {
  CloudflareKVRevocationDatabase,
  MemoryRevocationDatabase,
} from "@/server/auth/revocation-database";

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

    await expect(db.isRevoked("jti-1")).resolves.toBe(true);
    await expect(db.isRevoked("jti-2")).resolves.toBe(false);

    jest.setSystemTime(new Date("2026-01-01T00:01:01Z"));

    await expect(db.isRevoked("jti-1")).resolves.toBe(false);
  });

  it("does not store an already-expired token id", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const db = new MemoryRevocationDatabase();
    await db.add("jti-1", Math.floor(Date.now() / 1000) - 1);

    await expect(db.isRevoked("jti-1")).resolves.toBe(false);
  });
});

describe("CloudflareKVRevocationDatabase", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("stores revoked token ids in KV with an absolute expiration", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const kv = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
    };
    const db = new CloudflareKVRevocationDatabase(kv);
    const expiresAt = Math.floor(Date.now() / 1000) + 120;

    await db.add("jti-1", expiresAt);

    expect(kv.put).toHaveBeenCalledWith("jti-1", "1", {
      expiration: expiresAt,
    });
  });

  it("uses Cloudflare KV's minimum lifetime when less than 60 seconds remain", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const kv = {
      get: jest.fn(),
      put: jest.fn().mockResolvedValue(undefined),
    };
    const db = new CloudflareKVRevocationDatabase(kv);
    const now = Math.floor(Date.now() / 1000);

    await db.add("jti-1", now + 10);

    expect(kv.put).toHaveBeenCalledWith("jti-1", "1", {
      expiration: now + 60,
    });
  });

  it("does not store an already-expired token id", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const kv = {
      get: jest.fn(),
      put: jest.fn(),
    };
    const db = new CloudflareKVRevocationDatabase(kv);

    await db.add("jti-1", Math.floor(Date.now() / 1000) - 1);

    expect(kv.put).not.toHaveBeenCalled();
  });

  it("treats a present KV key as revoked", async () => {
    const kv = {
      get: jest.fn(async (key: string) => (key === "jti-1" ? "1" : null)),
      put: jest.fn(),
    };
    const db = new CloudflareKVRevocationDatabase(kv);

    await expect(db.isRevoked("jti-1")).resolves.toBe(true);
    await expect(db.isRevoked("jti-2")).resolves.toBe(false);
  });
});
