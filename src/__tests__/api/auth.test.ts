import { act, renderHook } from "@testing-library/react";
import { toast } from "mui-sonner";

import { useAtom } from "jotai";

import {
  clearEncryptedDriveAuth,
  createSession,
  forceTokenRefresh,
  getAccessTokenScopes,
  getFreshAccessToken,
  getFreshDriveAccessToken,
  getSessionSubject,
  isLoggedIn,
  logout,
  persistAuthTokens,
  restoreAccessToken,
  revokeAuthorization,
  syncAuthTokenEffect,
  useAccessTokenScopes,
  useGoogleLoginAndAuthorization,
  useMissingScopes,
} from "@/api/auth";
import { loadGoogleOAuth2 } from "@/api/google-identity";
import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

jest.mock("@/api/google-identity", () => ({
  loadGoogleOAuth2: jest.fn(),
  useGoogleIdentityReady: () => true,
  disableGoogleAutoSelect: jest.fn(),
}));

const loadGoogleOAuth2Mock = loadGoogleOAuth2 as jest.MockedFunction<
  typeof loadGoogleOAuth2
>;
const toastError = toast.error as jest.Mock;

const SESSION_PATH = "/auth/session";
const SESSION_CURRENT_PATH = "/auth/session/current";
const SESSION_ALL_PATH = "/auth/session/all";
const HEALTH_PATH = "/auth/health";
const HEALTH_CURRENT_PATH = "/auth/health/current";
const HEALTH_AUTHORIZE_PATH = "/auth/health/authorize";
const HEALTH_ACCESS_PATH = "/auth/health/access";
const DRIVE_PATH = "/auth/drive";
const DRIVE_CURRENT_PATH = "/auth/drive/current";
const SESSION_TOKEN_STORAGE_KEY = "auth:session-token";
const ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY = "auth:encrypted-health-token";
const ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY = "auth:encrypted-drive-token";

function toBase64Url(value: object) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fakeSessionToken({
  sub = "user-1",
  iat = Math.floor(Date.now() / 1000) - 60,
  exp = Math.floor(Date.now() / 1000) + 60 * 60,
}: {
  sub?: string;
  iat?: number;
  exp?: number;
} = {}) {
  return `${toBase64Url({ alg: "HS256", typ: "session+jwt" })}.${toBase64Url({
    sub,
    iat,
    exp,
  })}.sig`;
}

function setStoredSession({
  sessionToken = fakeSessionToken(),
  encryptedHealthToken = "encrypted-jwt",
  encryptedDriveToken = null as string | null,
}: {
  sessionToken?: string | null;
  encryptedHealthToken?: string | null;
  encryptedDriveToken?: string | null;
} = {}) {
  if (sessionToken) {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
  } else {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  }

  if (encryptedHealthToken) {
    localStorage.setItem(
      ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY,
      encryptedHealthToken,
    );
  } else {
    localStorage.removeItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY);
  }

  if (encryptedDriveToken) {
    localStorage.setItem(
      ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY,
      encryptedDriveToken,
    );
  } else {
    localStorage.removeItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY);
  }
}

/** Clear in-memory and persisted auth; await server revoke calls under a fetch mock. */
async function resetAuthState() {
  localStorage.clear();
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockResolvedValue(new Response(null, { status: 204 }));
  try {
    await logout();
  } finally {
    fetchMock.mockRestore();
  }
}

describe("createSession", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("posts the id_token and keeps the session token in memory", async () => {
    const sessionToken = fakeSessionToken();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ session_token: sessionToken }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await createSession("google-id-token");

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id_token: "google-id-token" }),
      }),
    );
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(getSessionSubject()).toBe("user-1");
    expect(JSON.stringify(localStorage)).not.toContain("google-id-token");
  });

  it("restores an access token when an encrypted health token is already stored", async () => {
    const sessionToken = fakeSessionToken();
    localStorage.setItem(
      ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY,
      "encrypted-jwt",
    );
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ session_token: sessionToken }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "restored-access-token",
            expires_in: 3600,
            scope: "openid",
            encrypted_health_token: "encrypted-jwt-rotated",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await createSession("google-id-token");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_health_token: "encrypted-jwt" }),
      }),
    );
    expect(getAccessTokenScopes().has("openid")).toBe(true);
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt-rotated",
    );
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe(sessionToken);
  });
});

describe("persistAuthTokens", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
    loadGoogleOAuth2Mock.mockResolvedValue({
      initCodeClient: jest.fn((options) => ({
        requestCode: () => {
          options.callback({ code: "auth-code" });
        },
      })),
      revoke: jest.fn(),
    } as unknown as Awaited<ReturnType<typeof loadGoogleOAuth2>>);
  });

  afterEach(() => {
    fetchMock.mockRestore();
    jest.clearAllMocks();
  });

  it("writes in-memory session and health tokens to localStorage", async () => {
    const sessionToken = fakeSessionToken();
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ session_token: sessionToken }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access-token",
            expires_in: 3600,
            scope: "openid",
            encrypted_health_token: "encrypted-jwt",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await createSession("google-id-token");

    const { result } = renderHook(() => useGoogleLoginAndAuthorization());
    await act(async () => {
      await result.current.loginToGoogleAndAuthorize();
    });

    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(true);

    persistAuthTokens();

    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe(sessionToken);
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
  });
});

describe("logout", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    localStorage.clear();
  });

  it("revokes current health/drive tokens and the session then clears local auth state", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({
      sessionToken,
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_CURRENT_PATH,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_health_token: "encrypted-jwt" }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      DRIVE_CURRENT_PATH,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_drive_token: "encrypted-drive-jwt" }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_CURRENT_PATH,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(HEALTH_PATH, expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(DRIVE_PATH, expect.anything());
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("skips current health/drive revoke when those tokens are absent", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: null });

    await logout();

    expect(fetchMock).not.toHaveBeenCalledWith(
      HEALTH_CURRENT_PATH,
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      DRIVE_CURRENT_PATH,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_CURRENT_PATH,
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("revokeAuthorization", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    localStorage.clear();
  });

  it("revokes the health token and all sessions then clears local auth state", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });

    await revokeAuthorization();

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_PATH,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_health_token: "encrypted-jwt" }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(DRIVE_PATH, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_ALL_PATH,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
      }),
    );
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("also revokes the drive token when one is stored", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({
      sessionToken,
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    await revokeAuthorization();

    expect(fetchMock).toHaveBeenCalledWith(
      DRIVE_PATH,
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          encrypted_drive_token: "encrypted-drive-jwt",
        }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("skips health revoke when there is no encrypted health token", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: null });

    await revokeAuthorization();

    expect(fetchMock).not.toHaveBeenCalledWith(
      HEALTH_PATH,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_ALL_PATH,
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("clearEncryptedDriveAuth", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
    localStorage.clear();
  });

  it("clears local drive tokens without calling Google revoke endpoints", () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({
      sessionToken,
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-drive-jwt",
    );

    clearEncryptedDriveAuth();

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe(sessionToken);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes the drive token before clearing scopes so no refresh is triggered", () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({
      sessionToken,
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    const removeItem = jest.spyOn(Storage.prototype, "removeItem");
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    clearEncryptedDriveAuth();

    const driveRemoveOrder = removeItem.mock.invocationCallOrder.find(
      (_, index) =>
        removeItem.mock.calls[index]?.[0] === ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY,
    );
    expect(driveRemoveOrder).toEqual(expect.any(Number));
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
    // No drive access refresh should have been attempted during clear.
    expect(fetchMock).not.toHaveBeenCalled();

    removeItem.mockRestore();
    setItem.mockRestore();
  });

  it("ignores in-flight drive token refreshes after clear so localStorage stays empty", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({
      sessionToken,
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    let resolveRefresh: (value: Response) => void = () => undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const refreshPromise = getFreshDriveAccessToken().catch(
      (error: unknown) => error,
    );

    clearEncryptedDriveAuth();
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();

    resolveRefresh(
      new Response(
        JSON.stringify({
          access_token: "late-access",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/drive.appdata",
          encrypted_drive_token: "late-encrypted-drive-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await refreshPromise;

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe("forceTokenRefresh", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("sends the session and encrypted tokens to the health access route", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
          scope: "openid",
          encrypted_health_token: "rotated-encrypted-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await forceTokenRefresh();

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_health_token: "encrypted-jwt" }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "rotated-encrypted-jwt",
    );
    expect(localStorage.getItem("auth:google-token")).toBeNull();
  });

  it("does not store access tokens in local storage", async () => {
    setStoredSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
          scope: "openid",
          encrypted_health_token: "encrypted-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await forceTokenRefresh();

    expect(JSON.stringify(localStorage)).not.toContain("new-access-token");
    expect(JSON.stringify(localStorage)).not.toContain("openid");
    expect(getAccessTokenScopes().has("openid")).toBe(true);
  });

  it("leaves an unexpired in-memory token alone when getFreshAccessToken is used", async () => {
    setStoredSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
          encrypted_health_token: "encrypted-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await forceTokenRefresh();
    fetchMock.mockClear();

    await expect(getFreshAccessToken()).resolves.toBe("new-access-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call Google One Tap when refreshing an access token", async () => {
    setStoredSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
          encrypted_health_token: "encrypted-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await forceTokenRefresh();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(HEALTH_ACCESS_PATH);
  });

  it("throws when there is no session token", async () => {
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");

    await expect(forceTokenRefresh()).rejects.toThrow(
      "no session token available",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears session and health tokens when health access returns 401", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "unauthorized",
          error_description: "encrypted health token has expired",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(forceTokenRefresh()).rejects.toThrow(
      "encrypted health token has expired",
    );

    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it("clears session and health tokens when health access returns 403", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "forbidden",
          error_description: "session does not match encrypted token",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(forceTokenRefresh()).rejects.toThrow(
      "session does not match encrypted token",
    );

    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });
});

describe("isLoggedIn", () => {
  beforeEach(async () => {
    await resetAuthState();
  });

  it("requires an unexpired session token and an encrypted token", () => {
    expect(isLoggedIn()).toBe(false);

    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, fakeSessionToken());
    expect(isLoggedIn()).toBe(false);

    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    expect(isLoggedIn()).toBe(true);
  });

  it("treats a stored session with less than 10% lifetime remaining as logged out", () => {
    const now = Math.floor(Date.now() / 1000);
    // 120-minute lifetime with ~5% remaining
    const sessionToken = fakeSessionToken({
      iat: now - 114 * 60,
      exp: now + 6 * 60,
    });

    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");

    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
  });

  it("still accepts a stored session with at least 10% lifetime remaining", () => {
    const now = Math.floor(Date.now() / 1000);
    // 120-minute lifetime with exactly 10% remaining
    const sessionToken = fakeSessionToken({
      iat: now - 108 * 60,
      exp: now + 12 * 60,
    });

    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");

    expect(isLoggedIn()).toBe(true);
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe(sessionToken);
  });
});

function mockHealthAccessResponse(
  fetchMock: jest.SpyInstance,
  {
    accessToken = "restored-access-token",
    encryptedHealthToken = "encrypted-jwt",
  }: { accessToken?: string; encryptedHealthToken?: string } = {},
) {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        access_token: accessToken,
        expires_in: 3600,
        scope: "openid",
        encrypted_health_token: encryptedHealthToken,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

describe("restoreAccessToken", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("posts the session and encrypted tokens to the health access route", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });
    mockHealthAccessResponse(fetchMock);

    await restoreAccessToken();

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_health_token: "encrypted-jwt" }),
      }),
    );
    expect(getAccessTokenScopes().has("openid")).toBe(true);
    expect(JSON.stringify(localStorage)).not.toContain("restored-access-token");
  });

  it("does not request an access token without a session", async () => {
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");

    await restoreAccessToken();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not request an access token when the session is expired", async () => {
    setStoredSession({
      sessionToken: fakeSessionToken({
        exp: Math.floor(Date.now() / 1000) - 60,
      }),
    });

    await restoreAccessToken();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not request an access token without an encrypted health token", async () => {
    setStoredSession({ encryptedHealthToken: null });

    await restoreAccessToken();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("granted scopes atom", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("updates useAccessTokenScopes after an access token is fetched", async () => {
    setStoredSession();
    mockHealthAccessResponse(fetchMock);

    const { result } = renderHook(() => useAccessTokenScopes());

    expect(result.current.has("openid")).toBe(false);

    await act(async () => {
      await forceTokenRefresh();
    });

    expect(result.current.has("openid")).toBe(true);
  });

  it("updates useMissingScopes after scopes are granted", async () => {
    setStoredSession();
    mockHealthAccessResponse(fetchMock);

    const { result } = renderHook(() => useMissingScopes(["openid"]));

    expect(result.current).toEqual(["openid"]);

    await act(async () => {
      await forceTokenRefresh();
    });

    expect(result.current).toEqual([]);
  });

  it("clears scopes on logout", async () => {
    setStoredSession();
    mockHealthAccessResponse(fetchMock);

    await forceTokenRefresh();
    const { result } = renderHook(() => useAccessTokenScopes());
    expect(result.current.has("openid")).toBe(true);

    await act(async () => {
      await logout();
    });

    expect(result.current.size).toBe(0);
  });
});

describe("syncAuthTokenEffect", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    await resetAuthState();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("restores an access token when a valid session is already stored", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });
    mockHealthAccessResponse(fetchMock);

    renderHook(() => useAtom(syncAuthTokenEffect));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ encrypted_health_token: "encrypted-jwt" }),
      }),
    );
  });

  it("does not restore an access token when the session is expired", async () => {
    setStoredSession({
      sessionToken: fakeSessionToken({
        exp: Math.floor(Date.now() / 1000) - 60,
      }),
    });

    renderHook(() => useAtom(syncAuthTokenEffect));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useGoogleLoginAndAuthorization", () => {
  let codeClient: {
    requestCode: jest.Mock;
    callback?: (response: {
      code?: string;
      error?: string;
      error_description?: string;
    }) => void;
    error_callback?: (error: { type: string }) => void;
  };

  beforeEach(async () => {
    toastError.mockClear();
    await resetAuthState();
    jest.spyOn(console, "error").mockImplementation(() => {});
    codeClient = { requestCode: jest.fn() };
    loadGoogleOAuth2Mock.mockResolvedValue({
      initCodeClient: jest.fn((options) => {
        codeClient.callback = options.callback;
        codeClient.error_callback = options.error_callback;
        return { requestCode: codeClient.requestCode };
      }),
      revoke: jest.fn(),
    } as unknown as Awaited<ReturnType<typeof loadGoogleOAuth2>>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function startLogin() {
    const { result } = renderHook(() => useGoogleLoginAndAuthorization());
    const loginPromise = result.current.loginToGoogleAndAuthorize();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    return { loginPromise };
  }

  it("passes the session subject as a CodeClient hint", async () => {
    setStoredSession({
      sessionToken: fakeSessionToken({ sub: "hint-user" }),
      encryptedHealthToken: null,
    });
    const { loginPromise } = await startLogin();

    expect(loadGoogleOAuth2Mock).toHaveBeenCalled();
    const oauth2 = await loadGoogleOAuth2Mock.mock.results[0].value;
    expect(oauth2.initCodeClient).toHaveBeenCalledWith(
      expect.objectContaining({
        hint: "hint-user",
        scope: REQUESTED_SCOPES.join(" "),
        include_granted_scopes: false,
      }),
    );

    act(() => {
      codeClient.error_callback?.({ type: "popup_closed" });
    });
    await expect(loginPromise).rejects.toThrow("popup_closed");
  });

  it("does not toast when the user closes the Google sign-in popup", async () => {
    const { loginPromise } = await startLogin();

    act(() => {
      codeClient.error_callback?.({ type: "popup_closed" });
    });

    await expect(loginPromise).rejects.toThrow();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("does not toast when the user denies consent", async () => {
    const { loginPromise } = await startLogin();

    act(() => {
      codeClient.callback?.({ error: "access_denied" });
    });

    await expect(loginPromise).rejects.toThrow("access_denied");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("toasts when the Google popup fails to open", async () => {
    const { loginPromise } = await startLogin();

    act(() => {
      codeClient.error_callback?.({ type: "popup_failed_to_open" });
    });

    await expect(loginPromise).rejects.toThrow();
    expect(toastError).toHaveBeenCalledWith(
      "Unable to reach Google to sign in",
    );
  });

  it("sends the authorization code to /auth/health/authorize", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: null });
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          encrypted_health_token: "new-encrypted",
          access_token: "access",
          expires_in: 3600,
          scope: "openid",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { loginPromise } = await startLogin();

    await act(async () => {
      codeClient.callback?.({ code: "auth-code" });
    });

    await loginPromise;

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_AUTHORIZE_PATH,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({ code: "auth-code" }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(true);
    expect(JSON.stringify(localStorage)).not.toContain("openid");
    expect(getAccessTokenScopes().has("openid")).toBe(true);
    expect(localStorage.getItem("auth:google-token")).toBeNull();

    fetchMock.mockRestore();
  });
});
