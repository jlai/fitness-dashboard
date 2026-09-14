import { jwtDecode } from "jwt-decode";

import { DELETE as DELETE_ALL } from "@/app/auth/session/all/route";
import { DELETE as DELETE_CURRENT } from "@/app/auth/session/current/route";
import { POST } from "@/app/auth/session/route";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import { resetRevocationDatabase } from "@/server/auth/revocation-database";
import {
  signSessionToken,
  verifySessionToken,
} from "@/server/auth/session-token";

jest.mock("@/server/auth/google-id-token", () => ({
  verifyGoogleIdToken: jest.fn(),
}));

const ALLOWED_ORIGIN = "http://localhost:3000";
const verifyGoogleIdTokenMock = verifyGoogleIdToken as jest.MockedFunction<
  typeof verifyGoogleIdToken
>;

function makeRequest({
  method = "POST",
  path = "/auth/session",
  headers = {},
  body = { id_token: "google-id-token" },
  sessionToken,
}: {
  method?: "POST" | "DELETE";
  path?: string;
  headers?: HeadersInit;
  body?: unknown;
  sessionToken?: string;
} = {}) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      Origin: ALLOWED_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...headers,
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

describe("POST /auth/session", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    verifyGoogleIdTokenMock.mockResolvedValue({ sub: "user-1" });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
  });

  it("creates a signed session JWT from the Google id_token", async () => {
    const response = await POST(makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.session_token).toEqual(expect.any(String));
    expect(payload.session_token.split(".")).toHaveLength(3);

    const claims = jwtDecode<{
      sub: string;
      iat: number;
      exp: number;
      jti: string;
    }>(payload.session_token);
    expect(claims.sub).toBe("user-1");
    expect(claims.exp).toBe(claims.iat + 120 * 60);
    expect(claims.jti).toEqual(expect.any(String));

    await expect(verifySessionToken(payload.session_token)).resolves.toEqual({
      sub: "user-1",
      iat: claims.iat,
      exp: claims.exp,
      jti: claims.jti,
    });
  });

  it("rejects requests without an id_token", async () => {
    const response = await POST(makeRequest({ body: {} }));

    expect(response.status).toBe(400);
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid id_token", async () => {
    verifyGoogleIdTokenMock.mockRejectedValue(new Error("bad token"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "invalid id_token",
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

describe("DELETE /auth/session/current", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    resetRevocationDatabase();
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
    resetRevocationDatabase();
  });

  it("revokes the session token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await DELETE_CURRENT(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/current",
        sessionToken,
      }),
    );

    expect(response.status).toBe(204);

    const revoked = await DELETE_CURRENT(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/current",
        sessionToken,
      }),
    );

    expect(revoked.status).toBe(401);
    await expect(revoked.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "session token has been revoked",
    });
  });

  it("rejects requests without a session token", async () => {
    const response = await DELETE_CURRENT(
      makeRequest({ method: "DELETE", path: "/auth/session/current" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "missing session token",
    });
  });

  it("rejects requests that are not same-origin", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await DELETE_CURRENT(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/current",
        sessionToken,
        headers: {
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
  });
});

describe("DELETE /auth/session/all", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
    resetRevocationDatabase();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
    resetRevocationDatabase();
    jest.useRealTimers();
  });

  it("invalidates all sessions for the subject issued before now", async () => {
    const olderToken = await signSessionToken({
      sub: "user-1",
      iat: Math.floor(Date.now() / 1000) - 60,
    });
    const otherUserToken = await signSessionToken({
      sub: "user-2",
      iat: Math.floor(Date.now() / 1000) - 60,
    });
    const currentToken = await signSessionToken({ sub: "user-1" });

    const response = await DELETE_ALL(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/all",
        sessionToken: currentToken,
      }),
    );

    expect(response.status).toBe(204);

    const olderRevoked = await DELETE_CURRENT(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/current",
        sessionToken: olderToken,
      }),
    );
    expect(olderRevoked.status).toBe(401);

    const otherUserStillValid = await DELETE_CURRENT(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/current",
        sessionToken: otherUserToken,
      }),
    );
    expect(otherUserStillValid.status).toBe(204);
  });

  it("rejects requests without a session token", async () => {
    const response = await DELETE_ALL(
      makeRequest({ method: "DELETE", path: "/auth/session/all" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "missing session token",
    });
  });

  it("rejects requests that are not same-origin", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await DELETE_ALL(
      makeRequest({
        method: "DELETE",
        path: "/auth/session/all",
        sessionToken,
        headers: {
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
  });
});
