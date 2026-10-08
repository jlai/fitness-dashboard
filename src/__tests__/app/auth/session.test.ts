import { POST as POST_ACCESS } from "@/app/auth/health/access/route";
import { POST as POST_LOGOUT } from "@/app/auth/session/logout/route";
import { GET, PATCH, POST } from "@/app/auth/session/route";
import {
  decryptHealthRefreshToken,
  encryptDriveRefreshToken,
  encryptRefreshToken,
} from "@/server/auth/encrypted-token";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import { revokeGoogleToken } from "@/server/auth/google-oauth-token";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import {
  SESSION_COOKIE_NAME,
  sessionCookieRequestHeader,
} from "@/server/auth/session-cookie";
import {
  signSessionToken,
  verifySessionToken,
} from "@/server/auth/session-token";

jest.mock("@/server/auth/google-id-token", () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock("@/server/auth/google-oauth-token", () => ({
  revokeGoogleToken: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

const verifyGoogleIdTokenMock = verifyGoogleIdToken as jest.MockedFunction<
  typeof verifyGoogleIdToken
>;
const revokeGoogleTokenMock = revokeGoogleToken as jest.MockedFunction<
  typeof revokeGoogleToken
>;

function makeRequest({
  method = "POST",
  path = "/auth/session",
  headers = {},
  body = { idToken: "google-id-token" },
  sessionToken,
}: {
  method?: "GET" | "POST" | "PATCH";
  path?: string;
  headers?: HeadersInit;
  body?: unknown;
  sessionToken?: string;
} = {}) {
  const hasBody = method === "POST" || method === "PATCH";

  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      "Sec-Fetch-Site": "same-origin",
      ...(sessionToken
        ? { Cookie: sessionCookieRequestHeader(sessionToken) }
        : {}),
      ...headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });
}

function readSessionCookieValue(response: Response) {
  const header = response.headers.get("Set-Cookie");

  expect(header).toEqual(expect.any(String));

  const match = header!.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]*)`));

  expect(match?.[1]).toEqual(expect.any(String));

  return decodeURIComponent(match![1]);
}

describe("POST /auth/session", () => {
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  beforeEach(() => {
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    verifyGoogleIdTokenMock.mockResolvedValue({ sub: "user-1" });
  });

  afterEach(() => {
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
  });

  it("creates a signed session JWT cookie from the Google idToken", async () => {
    const response = await POST(makeRequest());
    const payload = await response.json();
    const sessionToken = readSessionCookieValue(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, max-age=0, must-revalidate",
    );
    expect(payload).toEqual({
      sub: "user-1",
      exp: expect.any(Number),
    });
    expect(payload).not.toHaveProperty("sessionToken");

    const setCookie = response.headers.get("Set-Cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Max-Age");
    expect(setCookie).not.toContain("Domain=");

    const claims = await verifySessionToken(sessionToken);
    expect(claims.sub).toBe("user-1");
    expect(claims.exp).toBe(claims.iat + 120 * 60);
    expect(claims.jti).toEqual(expect.any(String));
    expect(payload.exp).toBe(claims.exp);
  });

  it("rejects requests without an idToken", async () => {
    const response = await POST(makeRequest({ body: {} }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "missing idToken",
    });
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost:3000/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
        },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "invalid json body",
    });
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid idToken", async () => {
    verifyGoogleIdTokenMock.mockRejectedValue(new Error("bad token"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
  });

  it("rejects requests that are not same-origin", async () => {
    const response = await POST(
      makeRequest({
        headers: {
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });
});

describe("POST /auth/session/logout", () => {
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  beforeEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    resetRevocationDatabase();
    revokeGoogleTokenMock.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
    resetRevocationDatabase();
    jest.useRealTimers();
  });

  function logoutRequest({
    sessionToken,
    headers,
    body = {},
  }: {
    sessionToken?: string;
    headers?: HeadersInit;
    body?: unknown;
  } = {}) {
    return makeRequest({
      method: "POST",
      path: "/auth/session/logout",
      sessionToken,
      headers,
      body,
    });
  }

  it("revokes the session token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST_LOGOUT(logoutRequest({ sessionToken }));

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, max-age=0, must-revalidate",
    );
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();

    const revoked = await POST_LOGOUT(logoutRequest({ sessionToken }));

    expect(revoked.status).toBe(401);
    await expect(revoked.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
  });

  it("denylists optional encrypted health and drive tokens without revoking at Google", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
      scope: "openid",
    });
    const encryptedDrive = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "drive-refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    });
    const healthVerified = await decryptHealthRefreshToken(encryptedHealth);

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: {
          encryptedHealthToken: encryptedHealth,
          encryptedDriveToken: encryptedDrive,
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();

    const revocationDatabase = await getRevocationDatabase();
    await expect(
      revocationDatabase.isRevoked({
        jti: healthVerified.jti,
        sub: healthVerified.sub,
        iat: healthVerified.iat,
      }),
    ).resolves.toBe(true);

    const accessResponse = await POST_ACCESS(
      new Request("http://localhost:3000/auth/health/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
          Cookie: sessionCookieRequestHeader(sessionToken),
        },
        body: JSON.stringify({ encryptedHealthToken: encryptedHealth }),
      }),
    );

    expect(accessResponse.status).toBe(401);
    await expect(accessResponse.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
  });

  it("rejects when the session is for a different user than the health token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-2" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { encryptedHealthToken: encryptedHealth },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();

    const revoked = await POST_LOGOUT(logoutRequest({ sessionToken }));
    expect(revoked.status).toBe(401);
  });

  it("rejects an invalid encrypted health token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { encryptedHealthToken: "not-a-jwt" },
      }),
    );

    expect(response.status).toBe(401);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("reports a generic error when both encrypted tokens are invalid", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: {
          encryptedHealthToken: "not-a-jwt",
          encryptedDriveToken: "also-not-a-jwt",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      errorDescription: "some tokens could not be revoked",
    });

    const revoked = await POST_LOGOUT(logoutRequest({ sessionToken }));
    expect(revoked.status).toBe(401);
  });

  it("rejects requests without a session token", async () => {
    const response = await POST_LOGOUT(logoutRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
  });

  it("rejects requests that are not same-origin", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        headers: {
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects a non-boolean unlink flag", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { unlink: "true" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "invalid value for unlink",
    });

    const stillValid = await POST_LOGOUT(logoutRequest({ sessionToken }));
    expect(stillValid.status).toBe(204);
  });

  it("with unlink revokes Google refresh tokens and invalidates other sessions", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const olderToken = await signSessionToken({
      sub: "user-1",
      iat: Math.floor(Date.now() / 1000) - 60,
    });
    const otherUserToken = await signSessionToken({
      sub: "user-2",
      iat: Math.floor(Date.now() / 1000) - 60,
    });
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
      scope: "openid",
    });
    const encryptedDrive = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "drive-refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: {
          encryptedHealthToken: encryptedHealth,
          encryptedDriveToken: encryptedDrive,
          unlink: true,
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("health-refresh");
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("drive-refresh");

    const olderRevoked = await POST_LOGOUT(
      logoutRequest({ sessionToken: olderToken }),
    );
    expect(olderRevoked.status).toBe(401);

    const otherUserStillValid = await POST_LOGOUT(
      logoutRequest({ sessionToken: otherUserToken }),
    );
    expect(otherUserStillValid.status).toBe(204);

    jest.useRealTimers();
  });

  it("with unlink still invalidates other sessions when no encrypted tokens are sent", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const olderToken = await signSessionToken({
      sub: "user-1",
      iat: Math.floor(Date.now() / 1000) - 60,
    });
    const sessionToken = await signSessionToken({ sub: "user-1" });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { unlink: true },
      }),
    );

    expect(response.status).toBe(204);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();

    const olderRevoked = await POST_LOGOUT(
      logoutRequest({ sessionToken: olderToken }),
    );
    expect(olderRevoked.status).toBe(401);

    jest.useRealTimers();
  });

  it("with unlink does not call Google revoke when the session is missing", async () => {
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });
    const encryptedDrive = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "drive-refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        body: {
          encryptedHealthToken: encryptedHealth,
          encryptedDriveToken: encryptedDrive,
          unlink: true,
        },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("with unlink does not call Google revoke when the session token is invalid", async () => {
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken: "not-a-valid-session",
        body: { encryptedHealthToken: encryptedHealth, unlink: true },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("with unlink does not call Google revoke when the session was already revoked", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });

    const first = await POST_LOGOUT(logoutRequest({ sessionToken }));
    expect(first.status).toBe(204);

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { encryptedHealthToken: encryptedHealth, unlink: true },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("with unlink does not call Google revoke when encrypted tokens are invalid", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: {
          encryptedHealthToken: "not-a-jwt",
          encryptedDriveToken: "also-not-a-jwt",
          unlink: true,
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      errorDescription: "some tokens could not be revoked",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("with unlink does not call Google revoke when the session user mismatches the token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-2" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { encryptedHealthToken: encryptedHealth, unlink: true },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("returns an error when unlink Google revoke fails", async () => {
    revokeGoogleTokenMock.mockResolvedValue({ status: 400 });
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: { encryptedHealthToken: encryptedHealth, unlink: true },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      errorDescription: "refresh token revocation failed",
    });
  });

  it("still revokes the drive token when health revoke fails", async () => {
    revokeGoogleTokenMock
      .mockResolvedValueOnce({ status: 400 })
      .mockResolvedValueOnce({ status: 200 });
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });
    const encryptedDrive = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "drive-refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: {
          encryptedHealthToken: encryptedHealth,
          encryptedDriveToken: encryptedDrive,
          unlink: true,
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      errorDescription: "refresh token revocation failed",
    });
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("health-refresh");
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("drive-refresh");
  });

  it("reports a generic error when multiple tokens cannot be revoked", async () => {
    revokeGoogleTokenMock.mockResolvedValue({ status: 400 });
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const encryptedHealth = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "health-refresh",
    });
    const encryptedDrive = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "drive-refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    });

    const response = await POST_LOGOUT(
      logoutRequest({
        sessionToken,
        body: {
          encryptedHealthToken: encryptedHealth,
          encryptedDriveToken: encryptedDrive,
          unlink: true,
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      errorDescription: "some tokens could not be revoked",
    });
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("health-refresh");
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("drive-refresh");
  });
});

describe("GET /auth/session", () => {
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;

  beforeEach(() => {
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
  });

  afterEach(() => {
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
  });

  it("returns sub and exp from a valid session cookie", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const verified = await verifySessionToken(sessionToken);
    const response = await GET(makeRequest({ method: "GET", sessionToken }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ sub: "user-1", exp: verified.exp });
    expect(payload).not.toHaveProperty("sessionToken");
  });

  it("rejects requests without a session cookie", async () => {
    const response = await GET(makeRequest({ method: "GET" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
  });

  it("rejects requests that are not same-origin", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await GET(
      makeRequest({
        method: "GET",
        sessionToken,
        headers: { "Sec-Fetch-Site": "cross-site" },
      }),
    );

    expect(response.status).toBe(403);
  });
});

describe("PATCH /auth/session", () => {
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;

  beforeEach(() => {
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
  });

  afterEach(() => {
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
    jest.useRealTimers();
  });

  it("extends the cookie Max-Age up to the JWT exp", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const sessionToken = await signSessionToken({
      sub: "user-1",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
    });
    const response = await PATCH(
      makeRequest({
        method: "PATCH",
        sessionToken,
        body: { maxLifetimeHours: 24 },
      }),
    );

    expect(response.status).toBe(204);
    const setCookie = response.headers.get("Set-Cookie")!;
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=7200");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
    expect(readSessionCookieValue(response)).toBe(sessionToken);

    jest.useRealTimers();
  });

  it("uses the requested hours when shorter than remaining JWT lifetime", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const sessionToken = await signSessionToken({
      sub: "user-1",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
    });
    const response = await PATCH(
      makeRequest({
        method: "PATCH",
        sessionToken,
        body: { maxLifetimeHours: 1 },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=3600");

    jest.useRealTimers();
  });

  it("rejects missing or invalid maxLifetimeHours", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });

    const missing = await PATCH(
      makeRequest({ method: "PATCH", sessionToken, body: {} }),
    );
    expect(missing.status).toBe(400);

    const zero = await PATCH(
      makeRequest({
        method: "PATCH",
        sessionToken,
        body: { maxLifetimeHours: 0 },
      }),
    );
    expect(zero.status).toBe(400);
    await expect(zero.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "invalid maxLifetimeHours",
    });
  });

  it("rejects requests without a session cookie", async () => {
    const response = await PATCH(
      makeRequest({ method: "PATCH", body: { maxLifetimeHours: 1 } }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests that are not same-origin", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await PATCH(
      makeRequest({
        method: "PATCH",
        sessionToken,
        body: { maxLifetimeHours: 1 },
        headers: { "Sec-Fetch-Site": "cross-site" },
      }),
    );

    expect(response.status).toBe(403);
  });
});
