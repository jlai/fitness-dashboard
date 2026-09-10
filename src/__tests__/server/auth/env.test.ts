import {
  assertServerEnv,
  getAllowedOrigins,
  getClientSecret,
  getConfiguredClientId,
  getConfiguredRedirectUri,
  getRefreshTokenKey,
  getRevocationDatabaseConfig,
  getSessionTokenKey,
  resolveRefreshTokenKey,
  resolveSessionTokenKey,
} from "@/server/auth/env";

const SESSION_JWK = {
  kty: "oct",
  kid: "session-test-1",
  alg: "HS256",
  k: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
};

const REFRESH_JWK = {
  kty: "oct",
  kid: "refresh-test-1",
  alg: "A256GCM",
  k: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
};

describe("token JWKs", () => {
  const originalSession = process.env.SESSION_TOKEN_JWK;
  const originalRefresh = process.env.REFRESH_TOKEN_JWK;

  beforeEach(() => {
    process.env.SESSION_TOKEN_JWK = JSON.stringify(SESSION_JWK);
    process.env.REFRESH_TOKEN_JWK = JSON.stringify(REFRESH_JWK);
  });

  afterEach(() => {
    process.env.SESSION_TOKEN_JWK = originalSession;
    process.env.REFRESH_TOKEN_JWK = originalRefresh;
  });

  it("loads separate session and refresh keys by kid", () => {
    const session = getSessionTokenKey();
    const refresh = getRefreshTokenKey();

    expect(session.kid).toBe("session-test-1");
    expect(refresh.kid).toBe("refresh-test-1");
    expect(session.key).toHaveLength(32);
    expect(refresh.key).toHaveLength(32);
    expect(session.key).not.toEqual(refresh.key);

    expect(resolveSessionTokenKey("session-test-1")).toEqual(session);
    expect(resolveRefreshTokenKey("refresh-test-1")).toEqual(refresh);
  });

  it("uses the first JWKS key for new tokens and keeps previous keys", () => {
    const previous = { ...SESSION_JWK, kid: "session-test-0" };
    const current = {
      ...SESSION_JWK,
      kid: "session-test-2",
      k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
    };

    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      keys: [current, previous],
    });

    expect(getSessionTokenKey().kid).toBe("session-test-2");
    expect(resolveSessionTokenKey("session-test-0").kid).toBe("session-test-0");
    expect(resolveSessionTokenKey("session-test-2").kid).toBe("session-test-2");
    expect(() => resolveSessionTokenKey("session-test-1")).toThrow(
      "unknown session token key id",
    );
  });

  it("rejects a missing, invalid, or incomplete JWK", () => {
    delete process.env.SESSION_TOKEN_JWK;
    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK is not configured",
    );

    process.env.SESSION_TOKEN_JWK = "{";
    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK must be valid JSON",
    );

    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      ...SESSION_JWK,
      kty: "RSA",
    });
    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK must be an oct JWK",
    );

    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      ...SESSION_JWK,
      kid: "",
    });
    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK must include a kid",
    );

    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      ...SESSION_JWK,
      alg: "A256GCM",
    });
    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK alg must be HS256",
    );

    process.env.REFRESH_TOKEN_JWK = JSON.stringify({
      ...REFRESH_JWK,
      use: "sig",
    });
    expect(() => getRefreshTokenKey()).toThrow(
      "REFRESH_TOKEN_JWK use must be enc",
    );

    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      ...SESSION_JWK,
      k: "AA",
    });
    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK must contain a 32-byte key",
    );
  });

  it("rejects duplicate kids in a JWKS", () => {
    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      keys: [SESSION_JWK, SESSION_JWK],
    });

    expect(() => getSessionTokenKey()).toThrow(
      "SESSION_TOKEN_JWK contains duplicate kid session-test-1",
    );
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

describe("required server env", () => {
  const originalEnv = {
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN:
      process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN,
    SESSION_TOKEN_JWK: process.env.SESSION_TOKEN_JWK,
    REFRESH_TOKEN_JWK: process.env.REFRESH_TOKEN_JWK,
    SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES:
      process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES,
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

    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ",";
    expect(() => getAllowedOrigins()).toThrow(
      "GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN is not configured",
    );
  });

  it("parses configured allowed origins", () => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN =
      "http://localhost:3000, https://example.com";

    expect(getAllowedOrigins()).toEqual([
      "http://localhost:3000",
      "https://example.com",
    ]);
  });

  it("fails startup when required variables are missing", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.SESSION_TOKEN_JWK;

    expect(() => assertServerEnv()).toThrow(
      "Missing required environment variables: GOOGLE_OAUTH_CLIENT_SECRET, SESSION_TOKEN_JWK",
    );
  });

  it("fails startup when a present variable is invalid", () => {
    process.env.SESSION_TOKEN_JWK = "{";

    expect(() => assertServerEnv()).toThrow(
      "SESSION_TOKEN_JWK must be valid JSON",
    );
  });

  it("accepts defaults for optional variables at startup", () => {
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    delete process.env.SESSION_REVOCATION_DATABASE;

    expect(() => assertServerEnv()).not.toThrow();
  });
});
