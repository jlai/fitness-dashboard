import { POST } from "@/app/auth/health/access/route";
import {
  decryptRefreshToken,
  encryptRefreshToken,
} from "@/server/auth/encrypted-token";
import { signSessionToken } from "@/server/auth/session-token";
import { refreshAccessToken } from "@/server/auth/google-oauth-token";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import { getSiteTokenDefaultExpirationSeconds } from "@/server/auth/env";

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
}: {
  headers?: HeadersInit;
  encryptedHealthToken?: string;
  sessionToken?: string;
} = {}) {
  const token = sessionToken ?? (await signSessionToken({ sub: "user-1" }));
  const encrypted =
    encryptedHealthToken ??
    (await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
    }));

  return new Request("http://localhost:3000/auth/health/access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify({ encrypted_health_token: encrypted }),
  });
}

describe("POST /auth/health/access", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
    refreshAccessTokenMock.mockResolvedValue({
      status: 200,
      payload: {
        access_token: "new-access",
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

  it("exchanges the encrypted refresh token for an access token", async () => {
    const response = await POST(await makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith("stored-refresh");
    expect(payload.access_token).toBe("new-access");
    expect(payload.scope).toBe("openid");
    expect(payload.encrypted_health_token).toEqual(expect.any(String));

    await expect(
      decryptRefreshToken(payload.encrypted_health_token),
    ).resolves.toEqual({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
      jti: expect.any(String),
      iat: expect.any(Number),
    });
  });

  it("rejects when the session is for a different user", async () => {
    const sessionToken = await signSessionToken({ sub: "user-2" });
    const response = await POST(await makeRequest({ sessionToken }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "forbidden",
      error_description: "session does not match encrypted token",
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid encrypted token", async () => {
    const response = await POST(
      await makeRequest({ encryptedHealthToken: "not-a-jwt" }),
    );

    expect(response.status).toBe(403);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects requests that are not same-origin", async () => {
    const response = await POST(
      await makeRequest({
        headers: {
          "Sec-Fetch-Site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects a revoked encrypted health token jti", async () => {
    const encrypted = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
    });
    const stored = await decryptRefreshToken(encrypted);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.add(
      stored.jti,
      stored.iat + getSiteTokenDefaultExpirationSeconds(),
    );

    const response = await POST(
      await makeRequest({ encryptedHealthToken: encrypted }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "encrypted health token has been revoked",
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an encrypted health token issued before a sub watermark", async () => {
    const encrypted = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
    });
    const stored = await decryptRefreshToken(encrypted);
    const sessionToken = await signSessionToken({
      sub: "user-1",
      iat: stored.iat + 10,
    });
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.invalidateIssuedBefore(
      stored.sub,
      stored.iat + 1,
    );

    const response = await POST(
      await makeRequest({ encryptedHealthToken: encrypted, sessionToken }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "encrypted health token has been revoked",
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("accepts an encrypted health token issued at or after a sub watermark", async () => {
    const encrypted = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "openid",
    });
    const stored = await decryptRefreshToken(encrypted);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.invalidateIssuedBefore(stored.sub, stored.iat);

    const response = await POST(
      await makeRequest({ encryptedHealthToken: encrypted }),
    );

    expect(response.status).toBe(200);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith("stored-refresh");
  });

  it("returns a JSON error when the token refresh throws", async () => {
    refreshAccessTokenMock.mockRejectedValue(
      new Error("upstream token endpoint timed out"),
    );

    const response = await POST(await makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "internal_error",
      error_description: "error refreshing access token",
    });
  });

  it("returns a new encrypted token when Google rotates the refresh token", async () => {
    refreshAccessTokenMock.mockResolvedValue({
      status: 200,
      payload: {
        access_token: "new-access",
        refresh_token: "rotated-refresh",
        expires_in: 3600,
      },
    });

    const response = await POST(await makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.encrypted_health_token).toEqual(expect.any(String));
    await expect(
      decryptRefreshToken(payload.encrypted_health_token),
    ).resolves.toEqual({
      sub: "user-1",
      refreshToken: "rotated-refresh",
      scope: "openid",
      jti: expect.any(String),
      iat: expect.any(Number),
    });
  });
});
