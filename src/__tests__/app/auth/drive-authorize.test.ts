import { POST } from "@/app/auth/drive/authorize/route";
import { decryptDriveRefreshToken } from "@/server/auth/encrypted-token";
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

  return new Request("http://localhost:3000/auth/drive/authorize", {
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

describe("POST /auth/drive/authorize", () => {
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
        scope: "https://www.googleapis.com/auth/drive.appdata",
      },
    });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = originalRedirectUri;
  });

  it("exchanges the code and returns an encrypted drive refresh token", async () => {
    const response = await POST(await makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(exchangeAuthorizationCodeMock).toHaveBeenCalledWith({
      code: "abc",
      redirectUri: ALLOWED_ORIGIN,
    });
    expect(payload.access_token).toBe("access");
    expect(payload.scope).toBe(
      "https://www.googleapis.com/auth/drive.appdata",
    );
    expect(payload.encrypted_drive_token).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty("refresh_token");
    expect(payload).not.toHaveProperty("encrypted_health_token");

    await expect(
      decryptDriveRefreshToken(payload.encrypted_drive_token),
    ).resolves.toEqual({
      sub: "user-1",
      refreshToken: "refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
      jti: expect.any(String),
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
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
});
