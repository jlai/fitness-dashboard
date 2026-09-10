import { POST } from "@/app/auth/health/authorize/route";
import { decryptRefreshToken } from "@/server/auth/encrypted-token";
import { signSessionToken } from "@/server/auth/session-token";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import { exchangeAuthorizationCode } from "@/server/auth/google-oauth-token";

jest.mock("@/server/auth/google-id-token", () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock("@/server/auth/google-oauth-token", () => ({
  exchangeAuthorizationCode: jest.fn(),
}));

const ALLOWED_ORIGIN = "http://localhost:3000";
const verifyGoogleIdTokenMock = verifyGoogleIdToken as jest.MockedFunction<
  typeof verifyGoogleIdToken
>;
const exchangeAuthorizationCodeMock =
  exchangeAuthorizationCode as jest.MockedFunction<
    typeof exchangeAuthorizationCode
  >;

async function makeRequest({
  headers = {},
  body = { code: "abc" },
  sessionToken,
}: {
  headers?: HeadersInit;
  body?: unknown;
  sessionToken?: string;
} = {}) {
  const token = sessionToken ?? (await signSessionToken({ sub: "user-1" }));

  return new Request("http://localhost:3000/auth/health/authorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /auth/health/authorize", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = ALLOWED_ORIGIN;
    verifyGoogleIdTokenMock.mockResolvedValue({ sub: "user-1" });
    exchangeAuthorizationCodeMock.mockResolvedValue({
      status: 200,
      payload: {
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        scope: "openid",
      },
    });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = originalRedirectUri;
  });

  it("exchanges the code and returns an encrypted refresh token", async () => {
    const response = await POST(await makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(exchangeAuthorizationCodeMock).toHaveBeenCalledWith({
      code: "abc",
      redirectUri: ALLOWED_ORIGIN,
    });
    expect(payload.access_token).toBe("access");
    expect(payload.scope).toBe("openid");
    expect(payload.encrypted_health_token).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty("refresh_token");
    expect(payload).not.toHaveProperty("session_token");

    await expect(
      decryptRefreshToken(payload.encrypted_health_token),
    ).resolves.toEqual(
      {
        sub: "user-1",
        refreshToken: "refresh",
        scope: "openid",
      },
    );
  });

  it("rejects when redirect_uri is not configured", async () => {
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;

    const response = await POST(await makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "internal_error",
      error_description: "GOOGLE_OAUTH_REDIRECT_URI is not configured",
    });
    expect(exchangeAuthorizationCodeMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a session token", async () => {
    const response = await POST(
      await makeRequest({
        headers: {
          Authorization: "",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(exchangeAuthorizationCodeMock).not.toHaveBeenCalled();
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
    expect(exchangeAuthorizationCodeMock).not.toHaveBeenCalled();
  });

  it("rejects when the authorization code belongs to a different user", async () => {
    exchangeAuthorizationCodeMock.mockResolvedValue({
      status: 200,
      payload: {
        access_token: "access",
        refresh_token: "refresh",
        id_token: "other-user-id-token",
        expires_in: 3600,
      },
    });
    verifyGoogleIdTokenMock.mockResolvedValue({ sub: "user-2" });

    const response = await POST(await makeRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "forbidden",
      error_description: "authorization code user does not match session",
    });
  });
});
