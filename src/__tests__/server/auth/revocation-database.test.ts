import {
  CloudflareKVRevocationDatabase,
  MemoryRevocationDatabase,
} from "@/server/auth/revocation-database";

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
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  afterEach(() => {
    jest.useRealTimers();
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
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
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "120";

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
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "120";

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
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "1";

    const db = new MemoryRevocationDatabase();
    const cutoff = Math.floor(Date.now() / 1000);

    await db.invalidateIssuedBefore("user-1", cutoff);

    jest.setSystemTime(new Date("2026-01-01T00:01:01Z"));

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(false);
  });

  it("does not store an already-expired issued-before watermark", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "1";

    const db = new MemoryRevocationDatabase();
    const cutoff = Math.floor(Date.now() / 1000) - 120;

    await db.invalidateIssuedBefore("user-1", cutoff);

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(false);
  });
});

describe("CloudflareKVRevocationDatabase", () => {
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  afterEach(() => {
    jest.useRealTimers();
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
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

    await expect(db.isRevoked(token({ jti: "jti-1" }))).resolves.toBe(true);
    await expect(db.isRevoked(token({ jti: "jti-2" }))).resolves.toBe(false);
  });

  it("stores issued-before watermarks under a before: key", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "120";

    const kv = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
    };
    const db = new CloudflareKVRevocationDatabase(kv);
    const cutoff = Math.floor(Date.now() / 1000);

    await db.invalidateIssuedBefore("user-1", cutoff);

    expect(kv.put).toHaveBeenCalledWith("before:user-1", String(cutoff), {
      expiration: cutoff + 120 * 60,
    });
  });

  it("keeps the maximum issued-before cutoff in KV", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "120";

    const earlier = Math.floor(Date.now() / 1000) - 30;
    const later = Math.floor(Date.now() / 1000);
    const kv = {
      get: jest.fn().mockResolvedValue(String(later)),
      put: jest.fn().mockResolvedValue(undefined),
    };
    const db = new CloudflareKVRevocationDatabase(kv);

    await db.invalidateIssuedBefore("user-1", earlier);

    expect(kv.put).toHaveBeenCalledWith("before:user-1", String(later), {
      expiration: later + 120 * 60,
    });
  });

  it("does not store an already-expired issued-before watermark", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "1";

    const kv = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn(),
    };
    const db = new CloudflareKVRevocationDatabase(kv);
    const cutoff = Math.floor(Date.now() / 1000) - 120;

    await db.invalidateIssuedBefore("user-1", cutoff);

    expect(kv.put).not.toHaveBeenCalled();
  });

  it("revokes tokens with iat before the KV watermark", async () => {
    const cutoff = 1_700_000_000;
    const kv = {
      get: jest.fn(async (key: string) =>
        key === "before:user-1" ? String(cutoff) : null,
      ),
      put: jest.fn(),
    };
    const db = new CloudflareKVRevocationDatabase(kv);

    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff - 1 })),
    ).resolves.toBe(true);
    await expect(
      db.isRevoked(token({ sub: "user-1", iat: cutoff })),
    ).resolves.toBe(false);
  });
});
