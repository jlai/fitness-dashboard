import { ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS } from "@/config/encrypted-token";
import {
  assertServerEnv,
  getClientSecret,
  getConfiguredClientId,
  getConfiguredRedirectUri,
  getDriveSecretStore,
  getEncryptedRefreshTokenExpirationSeconds,
  getHealthSecretStore,
  getRevocationDatabaseConfig,
  getSessionSecretStore,
  getSessionTokenExpirationSeconds,
  getTokenSecretStoreConfig,
  resetSecretStores,
} from "@/server/auth/env";

const SESSION_JWK = {
  kty: "oct",
  kid: "session-test-1",
  alg: "HS256",
  k: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
};

const HEALTH_JWK = {
  kty: "oct",
  kid: "refresh-test-1",
  alg: "A256GCM",
  k: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
};

describe("token secret stores", () => {
  const originalSession = process.env.SESSION_ACTIVE_KEY;
  const originalHealth = process.env.HEALTH_ACTIVE_KEY;
  const originalDrive = process.env.DRIVE_ACTIVE_KEY;
  const originalSessionAccepted = process.env.SESSION_ACCEPTED_KEYS;
  const originalHealthAccepted = process.env.HEALTH_ACCEPTED_KEYS;
  const originalDriveAccepted = process.env.DRIVE_ACCEPTED_KEYS;
  const originalStore = process.env.TOKEN_SECRET_STORE;

  beforeEach(() => {
    process.env.SESSION_ACTIVE_KEY = JSON.stringify(SESSION_JWK);
    process.env.HEALTH_ACTIVE_KEY = JSON.stringify(HEALTH_JWK);
    process.env.DRIVE_ACTIVE_KEY = JSON.stringify({
      ...HEALTH_JWK,
      kid: "drive-test-1",
      k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
    });
    delete process.env.SESSION_ACCEPTED_KEYS;
    delete process.env.HEALTH_ACCEPTED_KEYS;
    delete process.env.DRIVE_ACCEPTED_KEYS;
    process.env.TOKEN_SECRET_STORE = "env://";
    resetSecretStores();
  });

  afterEach(() => {
    process.env.SESSION_ACTIVE_KEY = originalSession;
    process.env.HEALTH_ACTIVE_KEY = originalHealth;
    process.env.DRIVE_ACTIVE_KEY = originalDrive;
    process.env.SESSION_ACCEPTED_KEYS = originalSessionAccepted;
    process.env.HEALTH_ACCEPTED_KEYS = originalHealthAccepted;
    process.env.DRIVE_ACCEPTED_KEYS = originalDriveAccepted;
    process.env.TOKEN_SECRET_STORE = originalStore;
    resetSecretStores();
  });

  it("loads separate session, health, and drive keys by kid", async () => {
    const session = await getSessionSecretStore().getActiveKey();
    const health = await getHealthSecretStore().getActiveKey();
    const drive = await getDriveSecretStore().getActiveKey();

    expect(session.kid).toBe("session-test-1");
    expect(health.kid).toBe("refresh-test-1");
    expect(drive.kid).toBe("drive-test-1");
    expect(session.key).toHaveLength(32);
    expect(health.key).toHaveLength(32);
    expect(drive.key).toHaveLength(32);
    expect(session.key).not.toEqual(health.key);
    expect(health.key).not.toEqual(drive.key);

    await expect(
      getSessionSecretStore().getKeyById("session-test-1"),
    ).resolves.toEqual(session);
    await expect(
      getHealthSecretStore().getKeyById("refresh-test-1"),
    ).resolves.toEqual(health);
    await expect(
      getDriveSecretStore().getKeyById("drive-test-1"),
    ).resolves.toEqual(drive);
  });

  it("uses ACTIVE_KEY for new tokens and ACCEPTED_KEYS for previous keys", async () => {
    const previous = { ...SESSION_JWK, kid: "session-test-0" };
    const current = {
      ...SESSION_JWK,
      kid: "session-test-2",
      k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
    };

    process.env.SESSION_ACTIVE_KEY = JSON.stringify(current);
    process.env.SESSION_ACCEPTED_KEYS = JSON.stringify({
      keys: [current, previous],
    });
    resetSecretStores();

    await expect(getSessionSecretStore().getActiveKey()).resolves.toMatchObject(
      { kid: "session-test-2" },
    );
    await expect(
      getSessionSecretStore().getKeyById("session-test-0"),
    ).resolves.toMatchObject({ kid: "session-test-0" });
    await expect(
      getSessionSecretStore().getKeyById("session-test-2"),
    ).resolves.toMatchObject({ kid: "session-test-2" });
    await expect(
      getSessionSecretStore().getKeyById("session-test-1"),
    ).rejects.toThrow("unknown session token key id");
  });

  it("rejects a missing, invalid, or incomplete JWK", async () => {
    delete process.env.SESSION_ACTIVE_KEY;
    resetSecretStores();
    await expect(getSessionSecretStore().getActiveKey()).rejects.toThrow(
      "SESSION_ACTIVE_KEY is not configured",
    );

    process.env.SESSION_ACTIVE_KEY = "{";
    resetSecretStores();
    await expect(getSessionSecretStore().getActiveKey()).rejects.toThrow(
      "SESSION_ACTIVE_KEY must be valid JSON",
    );

    process.env.SESSION_ACTIVE_KEY = JSON.stringify({
      ...SESSION_JWK,
      kty: "RSA",
    });
    resetSecretStores();
    await expect(getSessionSecretStore().getActiveKey()).rejects.toThrow(
      "SESSION_ACTIVE_KEY must be an oct JWK",
    );

    process.env.SESSION_ACTIVE_KEY = JSON.stringify({
      ...SESSION_JWK,
      kid: "",
    });
    resetSecretStores();
    await expect(getSessionSecretStore().getActiveKey()).rejects.toThrow(
      "SESSION_ACTIVE_KEY must include a kid",
    );

    process.env.SESSION_ACTIVE_KEY = JSON.stringify({
      ...SESSION_JWK,
      alg: "A256GCM",
    });
    resetSecretStores();
    await expect(getSessionSecretStore().getActiveKey()).rejects.toThrow(
      "SESSION_ACTIVE_KEY alg must be HS256",
    );

    process.env.HEALTH_ACTIVE_KEY = JSON.stringify({
      ...HEALTH_JWK,
      use: "sig",
    });
    resetSecretStores();
    await expect(getHealthSecretStore().getActiveKey()).rejects.toThrow(
      "HEALTH_ACTIVE_KEY use must be enc",
    );

    process.env.SESSION_ACTIVE_KEY = JSON.stringify({
      ...SESSION_JWK,
      k: "AA",
    });
    resetSecretStores();
    await expect(getSessionSecretStore().getActiveKey()).rejects.toThrow(
      "SESSION_ACTIVE_KEY must contain a 32-byte key",
    );
  });

  it("rejects duplicate kids in ACCEPTED_KEYS", async () => {
    process.env.SESSION_ACCEPTED_KEYS = JSON.stringify({
      keys: [SESSION_JWK, SESSION_JWK],
    });
    resetSecretStores();

    await expect(
      getSessionSecretStore().getKeyById("session-test-1"),
    ).rejects.toThrow(
      "SESSION_ACCEPTED_KEYS contains duplicate kid session-test-1",
    );
  });

  it("throws not implemented for EnvSecretStore.rotateKeys", async () => {
    await expect(getSessionSecretStore().rotateKeys()).rejects.toThrow(
      "EnvSecretStore.rotateKeys is not implemented",
    );
  });

  it("defaults TOKEN_SECRET_STORE to env://", () => {
    delete process.env.TOKEN_SECRET_STORE;
    expect(getTokenSecretStoreConfig()).toEqual({ backend: "env" });
  });

  it("parses cloudflare-secrets://storeId", () => {
    process.env.TOKEN_SECRET_STORE = "cloudflare-secrets://store-123";
    process.env.CLOUDFLARE_ACCOUNT_ID = "account-123";

    expect(getTokenSecretStoreConfig()).toEqual({
      backend: "cloudflare-secrets",
      storeId: "store-123",
      accountId: "account-123",
    });

    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  });
});

describe("SESSION_REVOCATION_DATABASE", () => {
  const original = process.env.SESSION_REVOCATION_DATABASE;

  afterEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = original;
  });

  it("defaults to memory://", () => {
    delete process.env.SESSION_REVOCATION_DATABASE;
    expect(getRevocationDatabaseConfig()).toEqual({ backend: "memory" });

    process.env.SESSION_REVOCATION_DATABASE = "";
    expect(getRevocationDatabaseConfig()).toEqual({ backend: "memory" });
  });

  it("accepts memory:// and cloudflare-kv://namespace", () => {
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    expect(getRevocationDatabaseConfig()).toEqual({ backend: "memory" });

    process.env.SESSION_REVOCATION_DATABASE =
      "cloudflare-kv://SESSION_REVOCATION";
    expect(getRevocationDatabaseConfig()).toEqual({
      backend: "cloudflare-kv",
      namespace: "SESSION_REVOCATION",
    });
  });

  it("rejects a missing cloudflare-kv namespace", () => {
    process.env.SESSION_REVOCATION_DATABASE = "cloudflare-kv://";
    expect(() => getRevocationDatabaseConfig()).toThrow(
      "SESSION_REVOCATION_DATABASE cloudflare-kv URL must include a namespace",
    );
  });

  it("rejects an unknown or non-URL backend", () => {
    process.env.SESSION_REVOCATION_DATABASE = "redis://cache";
    expect(() => getRevocationDatabaseConfig()).toThrow(
      "SESSION_REVOCATION_DATABASE must be a URL such as memory:// or cloudflare-kv://namespace",
    );

    process.env.SESSION_REVOCATION_DATABASE = "memory";
    expect(() => getRevocationDatabaseConfig()).toThrow(
      "SESSION_REVOCATION_DATABASE must be a URL such as memory:// or cloudflare-kv://namespace",
    );
  });
});

describe("token expiration", () => {
  const originalSession = process.env.SESSION_TOKEN_EXPIRATION_MINUTES;
  const originalRefresh =
    process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES;

  afterEach(() => {
    if (originalSession === undefined) {
      delete process.env.SESSION_TOKEN_EXPIRATION_MINUTES;
    } else {
      process.env.SESSION_TOKEN_EXPIRATION_MINUTES = originalSession;
    }

    if (originalRefresh === undefined) {
      delete process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES;
    } else {
      process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES = originalRefresh;
    }
  });

  it("defaults session tokens to 120 minutes and refresh tokens to 15 days", () => {
    delete process.env.SESSION_TOKEN_EXPIRATION_MINUTES;
    delete process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES;

    expect(getSessionTokenExpirationSeconds()).toBe(120 * 60);
    expect(getEncryptedRefreshTokenExpirationSeconds()).toBe(
      ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS,
    );
  });

  it("reads configured lifetimes in minutes", () => {
    process.env.SESSION_TOKEN_EXPIRATION_MINUTES = "30";
    process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES = "60";

    expect(getSessionTokenExpirationSeconds()).toBe(30 * 60);
    expect(getEncryptedRefreshTokenExpirationSeconds()).toBe(60 * 60);
  });

  it("accepts the maximum session and refresh lifetimes", () => {
    process.env.SESSION_TOKEN_EXPIRATION_MINUTES = String(72 * 60);
    process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES = String(
      (15 * 24 * 60 * 60) / 60,
    );

    expect(getSessionTokenExpirationSeconds()).toBe(72 * 60 * 60);
    expect(getEncryptedRefreshTokenExpirationSeconds()).toBe(
      ENCRYPTED_REFRESH_TOKEN_EXPIRATION_SECONDS,
    );
  });

  it("rejects a session lifetime longer than 72 hours", () => {
    process.env.SESSION_TOKEN_EXPIRATION_MINUTES = String(72 * 60 + 1);

    expect(() => getSessionTokenExpirationSeconds()).toThrow(
      "SESSION_TOKEN_EXPIRATION_MINUTES must be at most 4320 minutes (72 hours)",
    );
  });

  it("rejects a refresh lifetime longer than 15 days", () => {
    process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES = String(
      15 * 24 * 60 + 1,
    );

    expect(() => getEncryptedRefreshTokenExpirationSeconds()).toThrow(
      "ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES must be at most 21600 minutes (15 days)",
    );
  });

  it("rejects non-positive lifetimes", () => {
    process.env.SESSION_TOKEN_EXPIRATION_MINUTES = "0";
    expect(() => getSessionTokenExpirationSeconds()).toThrow(
      "SESSION_TOKEN_EXPIRATION_MINUTES must be a positive number",
    );

    process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES = "-1";
    expect(() => getEncryptedRefreshTokenExpirationSeconds()).toThrow(
      "ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES must be a positive number",
    );
  });
});

describe("required server env", () => {
  const originalEnv = {
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    SESSION_ACTIVE_KEY: process.env.SESSION_ACTIVE_KEY,
    HEALTH_ACTIVE_KEY: process.env.HEALTH_ACTIVE_KEY,
    DRIVE_ACTIVE_KEY: process.env.DRIVE_ACTIVE_KEY,
    TOKEN_SECRET_STORE: process.env.TOKEN_SECRET_STORE,
    SESSION_TOKEN_EXPIRATION_MINUTES:
      process.env.SESSION_TOKEN_EXPIRATION_MINUTES,
    ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES:
      process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES,
    SESSION_REVOCATION_DATABASE: process.env.SESSION_REVOCATION_DATABASE,
  };

  afterEach(() => {
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    resetSecretStores();
  });

  it("throws when a required variable is missing or blank", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(() => getClientSecret()).toThrow(
      "GOOGLE_OAUTH_CLIENT_SECRET is not configured",
    );

    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = "   ";
    expect(() => getConfiguredClientId()).toThrow(
      "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID is not configured",
    );

    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    expect(() => getConfiguredRedirectUri()).toThrow(
      "GOOGLE_OAUTH_REDIRECT_URI is not configured",
    );
  });

  it("fails startup when required variables are missing", async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.SESSION_ACTIVE_KEY;
    process.env.TOKEN_SECRET_STORE = "env://";
    resetSecretStores();

    await expect(assertServerEnv()).rejects.toThrow(
      "Missing required environment variables: GOOGLE_OAUTH_CLIENT_SECRET, SESSION_ACTIVE_KEY",
    );
  });

  it("fails startup when a present variable is invalid", async () => {
    process.env.SESSION_ACTIVE_KEY = "{";
    process.env.TOKEN_SECRET_STORE = "env://";
    resetSecretStores();

    await expect(assertServerEnv()).rejects.toThrow(
      "SESSION_ACTIVE_KEY must be valid JSON",
    );
  });

  it("accepts defaults for optional variables at startup", async () => {
    delete process.env.SESSION_TOKEN_EXPIRATION_MINUTES;
    delete process.env.ENCRYPTED_REFRESH_TOKEN_EXPIRATION_MINUTES;
    delete process.env.SESSION_REVOCATION_DATABASE;
    process.env.TOKEN_SECRET_STORE = "env://";
    resetSecretStores();

    await expect(assertServerEnv()).resolves.toBeUndefined();
  });
});
