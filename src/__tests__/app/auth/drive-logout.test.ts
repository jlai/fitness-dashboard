import { POST as POST_ACCESS } from "@/app/auth/drive/access/route";
import { POST } from "@/app/auth/drive/logout/route";
import {
  decryptDriveRefreshToken,
  encryptDriveRefreshToken,
} from "@/server/auth/encrypted-token";
import {
  refreshAccessToken,
  revokeGoogleToken,
} from "@/server/auth/google-oauth-token";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import { signSessionToken } from "@/server/auth/session-token";

jest.mock("@/server/auth/google-oauth-token", () => ({
  revokeGoogleToken: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const revokeGoogleTokenMock = revokeGoogleToken as jest.MockedFunction<
  typeof revokeGoogleToken
>;
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

  return new Request("http://localhost:3000/auth/drive/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify(
      body === undefined ? { encryptedDriveToken: encrypted } : body,
    ),
  });
}

describe("POST /auth/drive/logout", () => {
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;

  beforeEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
    revokeGoogleTokenMock.mockResolvedValue({ status: 200 });
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
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
  });

  it("revokes the refresh token and denylists the encrypted drive token", async () => {
    const encrypted = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
      scope: DRIVE_SCOPE,
    });
    const verified = await decryptDriveRefreshToken(encrypted);
    const sessionToken = await signSessionToken({ sub: "user-1" });

    const response = await POST(
      await makeRequest({ encryptedDriveToken: encrypted, sessionToken }),
    );

    expect(response.status).toBe(204);
    expect(revokeGoogleTokenMock).toHaveBeenCalledWith("stored-refresh");

    const revocationDatabase = await getRevocationDatabase();
    await expect(
      revocationDatabase.isRevoked({
        jti: verified.jti,
        sub: verified.sub,
        iat: verified.iat,
      }),
    ).resolves.toBe(true);

    const accessResponse = await POST_ACCESS(
      new Request("http://localhost:3000/auth/drive/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ encryptedDriveToken: encrypted }),
      }),
    );

    expect(accessResponse.status).toBe(401);
    await expect(accessResponse.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "encrypted token has been revoked",
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("does not revoke the session", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const response = await POST(await makeRequest({ sessionToken }));

    expect(response.status).toBe(204);

    const stillValid = await POST(await makeRequest({ sessionToken }));
    expect(stillValid.status).toBe(204);
  });

  it("rejects when the session is for a different user", async () => {
    const sessionToken = await signSessionToken({ sub: "user-2" });
    const response = await POST(await makeRequest({ sessionToken }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "session does not match encrypted token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid encrypted token", async () => {
    const response = await POST(
      await makeRequest({ encryptedDriveToken: "not-a-jwt" }),
    );

    expect(response.status).toBe(401);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("rejects requests without an encrypted token", async () => {
    const response = await POST(await makeRequest({ body: {} }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "missing encrypted token",
    });
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a session token", async () => {
    const encrypted = await encryptDriveRefreshToken({
      sub: "user-1",
      refreshToken: "stored-refresh",
    });
    const response = await POST(
      new Request("http://localhost:3000/auth/drive/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
        },
        body: JSON.stringify({ encryptedDriveToken: encrypted }),
      }),
    );

    expect(response.status).toBe(401);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
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
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });

  it("returns an error when Google revoke fails", async () => {
    revokeGoogleTokenMock.mockResolvedValue({ status: 400 });

    const response = await POST(await makeRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "token_revoke_failed",
      errorDescription: "refresh token revocation failed",
    });
  });

  it("returns a JSON error when token revoke throws", async () => {
    revokeGoogleTokenMock.mockRejectedValue(
      new Error("upstream revoke endpoint timed out"),
    );

    const response = await POST(await makeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "internal_error",
      errorDescription: "error revoking drive token",
    });
  });
});
