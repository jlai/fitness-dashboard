import { DELETE } from "@/app/auth/drive/current/route";
import { POST as POST_ACCESS } from "@/app/auth/drive/access/route";
import {
  decryptDriveRefreshToken,
  encryptDriveRefreshToken,
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
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const refreshAccessTokenMock = refreshAccessToken as jest.MockedFunction<
  typeof refreshAccessToken
>;

async function makeRequest({
  headers = {},
  encryptedDriveToken,
  sessionToken,
  body,
}: {
  headers?: HeadersInit;
  encryptedDriveToken?: string;
  sessionToken?: string;
  body?: unknown;
} = {}) {
  const token = sessionToken ?? (await signSessionToken({ sub: "user-1" }));
  const encrypted =
    encryptedDriveToken ??
    (await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: DRIVE_SCOPE,
    }));

  return new Request("http://localhost:3000/auth/drive/current", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify(
      body === undefined ? { encrypted_drive_token: encrypted } : body,
    ),
  });
}

describe("DELETE /auth/drive/current", () => {
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
        scope: DRIVE_SCOPE,
      },
    });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
  });

  it("denylists the encrypted drive token jti", async () => {
    const encrypted = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: DRIVE_SCOPE,
    });
    const stored = await decryptDriveRefreshToken(encrypted);
    const sessionToken = await signSessionToken({ sub: "user-1" });

    const response = await DELETE(
      await makeRequest({ encryptedDriveToken: encrypted, sessionToken }),
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
      new Request("http://localhost:3000/auth/drive/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: ALLOWED_ORIGIN,
          "Sec-Fetch-Site": "same-origin",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ encrypted_drive_token: encrypted }),
      }),
    );

    expect(accessResponse.status).toBe(401);
    await expect(accessResponse.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "encrypted drive token has been revoked",
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

  it("rejects requests without an encrypted token", async () => {
    const response = await DELETE(await makeRequest({ body: {} }));

    expect(response.status).toBe(400);
  });
});
