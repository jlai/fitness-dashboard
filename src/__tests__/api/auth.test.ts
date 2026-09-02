import { forceTokenRefresh, getFreshAccessToken } from "@/api/auth";

const TOKEN_STORAGE_KEY = "auth:google-token";
const TOKEN_EXCHANGE_PATH = "/auth/google-oauth2-policy-requires-a-server";

const STORED_TOKEN = {
  accessToken: "old-access-token",
  refreshToken: "stored-refresh-token",
  expiresAt: Date.now() + 60 * 60 * 1000,
  scope: "https://www.googleapis.com/auth/googlehealth.profile.readonly",
};

function setStoredToken(token: object | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function getStoredToken() {
  const value = localStorage.getItem(TOKEN_STORAGE_KEY);
  return value ? JSON.parse(value) : null;
}

describe("forceTokenRefresh", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("refreshes even when the access token is not expiring soon", async () => {
    setStoredToken(STORED_TOKEN);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
          refresh_token: "rotated-refresh-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await forceTokenRefresh();

    expect(fetchMock).toHaveBeenCalledWith(
      TOKEN_EXCHANGE_PATH,
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("stored-refresh-token");

    expect(getStoredToken()).toEqual(
      expect.objectContaining({
        accessToken: "new-access-token",
        refreshToken: "rotated-refresh-token",
      }),
    );
  });

  it("does not clear the stored token when refresh fails", async () => {
    setStoredToken(STORED_TOKEN);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(forceTokenRefresh()).rejects.toThrow(
      "Token has been expired or revoked.",
    );

    expect(getStoredToken()).toEqual(STORED_TOKEN);
  });

  it("leaves an unexpired token alone when getFreshAccessToken is used", async () => {
    setStoredToken(STORED_TOKEN);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(getFreshAccessToken()).resolves.toBe("old-access-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
