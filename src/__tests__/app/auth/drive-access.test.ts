import { POST } from "@/app/auth/drive/access/route";
import {
  decryptDriveRefreshToken,
  encryptDriveRefreshToken,
} from "@/server/auth/encrypted-token";
import { sessionCookieRequestHeader } from "@/server/auth/session-cookie";
import { signSessionToken } from "@/server/auth/session-token";
import { refreshAccessToken } from "@/server/auth/google-oauth-token";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import { getSessionTokenExpirationSeconds } from "@/server/auth/env";

jest.mock("@/server/auth/google-oauth-token", () => ({
  refreshAccessToken: jest.fn(),
}));

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
      "Sec-Fetch-Site": "same-origin",
      Cookie: sessionCookieRequestHeader(token),
      ...headers,
    },
    body: JSON.stringify({ encryptedDriveToken: encrypted }),
  });
}

describe("POST /auth/drive/access", () => {
  beforeEach(() => {
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

  it("refreshes and returns a new encrypted drive token", async () => {
    const response = await POST(await makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith("stored-refresh");
    expect(payload.accessToken).toBe("new-access");
    expect(payload.encryptedDriveToken).toEqual(expect.any(String));

    const refreshed = await decryptDriveRefreshToken(
      payload.encryptedDriveToken,
    );
    expect(refreshed.refreshToken).toBe("stored-refresh");
    expect(refreshed.scope).toBe(
      "https://www.googleapis.com/auth/drive.appdata",
    );
  });

  it("rejects requests without an encrypted token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST(
      new Request("http://localhost:3000/auth/drive/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
          Cookie: sessionCookieRequestHeader(sessionToken),
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "missing encrypted token",
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
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
      errorDescription: "invalid token",
    });
    jest.useRealTimers();
  });

  it("rejects a revoked encrypted drive token jti", async () => {
    const encrypted = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
    });
    const verified = await decryptDriveRefreshToken(encrypted);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.add(
      verified.jti,
      verified.iat + getSessionTokenExpirationSeconds(),
    );

    const response = await POST(
      await makeRequest({ encryptedDriveToken: encrypted }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
  });
});
