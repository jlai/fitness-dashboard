import { DELETE } from "@/app/auth/health/current/route";
import { POST as POST_ACCESS } from "@/app/auth/health/access/route";
import {
  decryptRefreshToken,
  encryptRefreshToken,
} from "@/server/auth/encrypted-token";
import { refreshAccessToken } from "@/server/auth/google-oauth-token";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import { signSessionToken } from "@/server/auth/session-token";

jest.mock("@/server/auth/google-oauth-token", () => ({
  refreshAccessToken: jest.fn(),
}));

const ALLOWED_ORIGIN = "http://localhost:3000";
const refreshAccessTokenMock = refreshAccessToken as jest.MockedFunction<
  typeof refreshAccessToken
>;

async function makeRequest({
  headers = {},
  encryptedHealthToken,
  sessionToken,
  body,
}: {
  headers?: HeadersInit;
  encryptedHealthToken?: string;
  sessionToken?: string;
  body?: unknown;
} = {}) {
  const token = sessionToken ?? (await signSessionToken({ sub: "user-1" }));
  const encrypted =
    encryptedHealthToken ??
    (await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
    }));

  return new Request("http://localhost:3000/auth/health/current", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify(
      body === undefined ? { encrypted_health_token: encrypted } : body,
    ),
  });
}

describe("DELETE /auth/health/current", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
    refreshAccessTokenMock.mockResolvedValue({
      status: 200,
      payload: {
        access_token: "access-token",
        expires_in: 3600,
        scope: "openid",
      },
    });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
  });

  it("denylists the encrypted health token jti", async () => {
    const encrypted = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
    });
    const stored = await decryptRefreshToken(encrypted);
    const sessionToken = await signSessionToken({ sub: "user-1" });

    const response = await DELETE(
      await makeRequest({ encryptedHealthToken: encrypted, sessionToken }),
    );

    expect(response.status).toBe(204);

    const revocationDatabase = await getRevocationDatabase();
    await expect(
      revocationDatabase.isRevoked({
        jti: stored.jti,
        sub: stored.sub,
        iat: stored.iat,
      }),
    ).resolves.toBe(true);

    const accessResponse = await POST_ACCESS(
      new Request("http://localhost:3000/auth/health/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: ALLOWED_ORIGIN,
          "Sec-Fetch-Site": "same-origin",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ encrypted_health_token: encrypted }),
      }),
    );

    expect(accessResponse.status).toBe(401);
    await expect(accessResponse.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "encrypted health token has been revoked",
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the session is for a different user", async () => {
    const sessionToken = await signSessionToken({ sub: "user-2" });
    const response = await DELETE(await makeRequest({ sessionToken }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "forbidden",
      error_description: "session does not match encrypted token",
    });
  });

  it("rejects an invalid encrypted token", async () => {
    const response = await DELETE(
      await makeRequest({ encryptedHealthToken: "not-a-jwt" }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects requests without an encrypted token", async () => {
    const response = await DELETE(await makeRequest({ body: {} }));

    expect(response.status).toBe(400);
  });

  it("rejects requests without a session token", async () => {
    const encrypted = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
    });
    const response = await DELETE(
      new Request("http://localhost:3000/auth/health/current", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Origin: ALLOWED_ORIGIN,
          "Sec-Fetch-Site": "same-origin",
        },
        body: JSON.stringify({ encrypted_health_token: encrypted }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests that are not same-origin", async () => {
    const response = await DELETE(
      await makeRequest({
        headers: {
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
  });
});
