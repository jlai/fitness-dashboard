import { POST } from "@/app/auth/drive/access/route";
import {
  decryptDriveRefreshToken,
  encryptDriveRefreshToken,
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
  encryptedDriveToken,
  sessionToken,
}: {
  headers?: HeadersInit;
  encryptedDriveToken?: string;
  sessionToken?: string;
} = {}) {
  const token = sessionToken ?? (await signSessionToken({ sub: "user-1" }));
  const encrypted =
    encryptedDriveToken ??
    (await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    }));

  return new Request("http://localhost:3000/auth/drive/access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify({ encrypted_drive_token: encrypted }),
  });
}

describe("POST /auth/drive/access", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    resetRevocationDatabase();
    refreshAccessTokenMock.mockResolvedValue({
      status: 200,
      payload: {
        access_token: "new-access",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/drive.appdata",
      },
    });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
  });

  it("refreshes and returns a new encrypted drive token", async () => {
    const response = await POST(await makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith("stored-refresh");
    expect(payload.access_token).toBe("new-access");
    expect(payload.encrypted_drive_token).toEqual(expect.any(String));

    const refreshed = await decryptDriveRefreshToken(
      payload.encrypted_drive_token,
    );
    expect(refreshed.refreshToken).toBe("stored-refresh");
    expect(refreshed.scope).toBe(
      "https://www.googleapis.com/auth/drive.appdata",
    );
  });

  it("rejects an expired encrypted drive token", async () => {
    jest.useFakeTimers({ now: new Date("2020-01-01T00:00:00Z") });
    const encrypted = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
    });
    jest.setSystemTime(new Date("2020-01-20T00:00:00Z"));

    const response = await POST(
      await makeRequest({ encryptedDriveToken: encrypted }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "encrypted drive token has expired",
    });
    jest.useRealTimers();
  });

  it("rejects a revoked encrypted drive token jti", async () => {
    const encrypted = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
    });
    const stored = await decryptDriveRefreshToken(encrypted);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.add(
      stored.jti,
      stored.iat + getSiteTokenDefaultExpirationSeconds(),
    );

    const response = await POST(
      await makeRequest({ encryptedDriveToken: encrypted }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "encrypted drive token has been revoked",
    });
  });
});
