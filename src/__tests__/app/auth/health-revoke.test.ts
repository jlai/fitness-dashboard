import { DELETE } from "@/app/auth/health/route";
import { encryptRefreshToken } from "@/server/auth/encrypted-token";
import { revokeGoogleToken } from "@/server/auth/google-oauth-token";
import { signSessionToken } from "@/server/auth/session-token";

jest.mock("@/server/auth/google-oauth-token", () => ({
  revokeGoogleToken: jest.fn(),
}));

const ALLOWED_ORIGIN = "http://localhost:3000";
const revokeGoogleTokenMock = revokeGoogleToken as jest.MockedFunction<
  typeof revokeGoogleToken
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

  return new Request("http://localhost:3000/auth/health", {
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

describe("DELETE /auth/health", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    revokeGoogleTokenMock.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
  });

  it("revokes the refresh token from the encrypted health token", async () => {
    const response = await DELETE(await makeRequest());

    expect(response.status).toBe(204);
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("stored-refresh");
  });

  it("rejects when the session is for a different user", async () => {
    const sessionToken = await signSessionToken({ sub: "user-2" });
    const response = await DELETE(await makeRequest({ sessionToken }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "forbidden",
      error_description: "session does not match encrypted token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid encrypted token", async () => {
    const response = await DELETE(
      await makeRequest({ encryptedHealthToken: "not-a-jwt" }),
    );

    expect(response.status).toBe(403);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("rejects requests without an encrypted token", async () => {
    const response = await DELETE(await makeRequest({ body: {} }));

    expect(response.status).toBe(400);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a session token", async () => {
    const encrypted = await encryptRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
    });
    const response = await DELETE(
      new Request("http://localhost:3000/auth/health", {
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
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
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
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("returns an error when Google revoke fails", async () => {
    revokeGoogleTokenMock.mockResolvedValue({ status: 400 });

    const response = await DELETE(await makeRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      error_description: "refresh token revocation failed",
    });
  });
});
