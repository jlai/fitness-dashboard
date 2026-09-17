import { DELETE } from "@/app/auth/drive/route";
import { encryptDriveRefreshToken } from "@/server/auth/encrypted-token";
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
      scope: "https://www.googleapis.com/auth/drive.appdata",
    }));

  return new Request("http://localhost:3000/auth/drive", {
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

describe("DELETE /auth/drive", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    revokeGoogleTokenMock.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
  });

  it("revokes the refresh token from the encrypted drive token", async () => {
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

  it("rejects requests without an encrypted token", async () => {
    const response = await DELETE(await makeRequest({ body: {} }));

    expect(response.status).toBe(400);
    expect(revokeGoogleTokenMock).not.toHaveBeenCalled();
  });
});
