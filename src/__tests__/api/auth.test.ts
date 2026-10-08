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
  logoutDrive,
  persistAuthTokens,
  restoreAccessToken,
  saveEncryptedAuthTokens,
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
const SESSION_LOGOUT_PATH = "/auth/session/logout";
const HEALTH_AUTHORIZE_PATH = "/auth/health/authorize";
const HEALTH_ACCESS_PATH = "/auth/health/access";
const DRIVE_LOGOUT_PATH = "/auth/drive/logout";
const ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY = "auth:encrypted-health-token";
const ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY = "auth:encrypted-drive-token";

function sessionClaimsResponse({
  sub = "user-1",
  exp = Math.floor(Date.now() / 1000) + 60 * 60,
}: {
  sub?: string;
  exp?: number;
} = {}) {
  return new Response(JSON.stringify({ sub, exp }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function establishSession({
  sub = "user-1",
  exp = Math.floor(Date.now() / 1000) + 60 * 60,
  encryptedHealthToken = "encrypted-jwt" as string | null,
  encryptedDriveToken = null as string | null,
}: {
  sub?: string;
  exp?: number;
  encryptedHealthToken?: string | null;
  encryptedDriveToken?: string | null;
} = {}) {
  const fetchSpy = jest.spyOn(global, "fetch");
  fetchSpy.mockResolvedValueOnce(sessionClaimsResponse({ sub, exp }));
  await createSession("google-id-token");

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

  it("posts the idToken and keeps session claims in memory", async () => {
    fetchMock.mockResolvedValue(sessionClaimsResponse());

    await createSession("google-id-token");

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "google-id-token" }),
      }),
    );
    expect(getSessionSubject()).toBe("user-1");
    expect(JSON.stringify(localStorage)).not.toContain("google-id-token");
  });

  it("restores an access token when an encrypted health token is already stored", async () => {
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    fetchMock
      .mockResolvedValueOnce(sessionClaimsResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "restored-access-token",
            expiresIn: 3600,
            scope: "openid",
            encryptedHealthToken: "encrypted-jwt-rotated",
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
        body: JSON.stringify({ encryptedHealthToken: "encrypted-jwt" }),
      }),
    );
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty(
      "Authorization",
    );
    expect(getAccessTokenScopes().has("openid")).toBe(true);
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt-rotated",
    );
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

  it("writes encrypted tokens to localStorage and extends the session cookie", async () => {
    const exp = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
    fetchMock
      .mockResolvedValueOnce(sessionClaimsResponse({ exp }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "access-token",
            expiresIn: 3600,
            scope: "openid",
            encryptedHealthToken: "encrypted-jwt",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await createSession("google-id-token");

    const { result } = renderHook(() => useGoogleLoginAndAuthorization());
    await act(async () => {
      await result.current.loginToGoogleAndAuthorize();
    });

    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(true);

    await persistAuthTokens();

    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_PATH,
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    const patchCall = fetchMock.mock.calls.find(
      (call) => call[1]?.method === "PATCH",
    );
    expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({
      maxLifetimeHours: expect.any(Number),
    });
  });
});

describe("saveEncryptedAuthTokens", () => {
  beforeEach(async () => {
    await resetAuthState();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("writes health and drive tokens to memory and localStorage", () => {
    saveEncryptedAuthTokens({
      encryptedHealthToken: "encrypted-health",
      encryptedDriveToken: "encrypted-drive",
    });

    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-health",
    );
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-drive",
    );
  });

  it("leaves the other token unchanged when only one is provided", () => {
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "existing-health");

    saveEncryptedAuthTokens({
      encryptedDriveToken: "encrypted-drive",
    });

    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "existing-health",
    );
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-drive",
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

  it("posts health/drive tokens to session logout then clears local auth state", async () => {
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });
    fetchMock.mockClear();

    fetchMock.mockImplementation(async () => {
      expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
        "encrypted-jwt",
      );
      expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBe(
        "encrypted-drive-jwt",
      );
      return new Response(null, { status: 204 });
    });

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_LOGOUT_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          encryptedHealthToken: "encrypted-jwt",
          encryptedDriveToken: "encrypted-drive-jwt",
        }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("omits health/drive tokens from logout when those tokens are absent", async () => {
    await establishSession({ encryptedHealthToken: null });

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_LOGOUT_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
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

  it("logs out with unlink and any stored health/drive tokens", async () => {
    await establishSession({ encryptedHealthToken: "encrypted-jwt" });

    fetchMock.mockImplementation(async () => {
      expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
        "encrypted-jwt",
      );
      return new Response(null, { status: 204 });
    });

    await revokeAuthorization();

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_LOGOUT_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          encryptedHealthToken: "encrypted-jwt",
          unlink: true,
        }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("also sends the drive token when one is stored", async () => {
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    await revokeAuthorization();

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_LOGOUT_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          encryptedHealthToken: "encrypted-jwt",
          encryptedDriveToken: "encrypted-drive-jwt",
          unlink: true,
        }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("still sends unlink when there is no encrypted health token", async () => {
    await establishSession({ encryptedHealthToken: null });

    await revokeAuthorization();

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_LOGOUT_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ unlink: true }),
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

  it("clears local drive tokens without calling Google revoke endpoints", async () => {
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });
    fetchMock.mockClear();

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-drive-jwt",
    );

    clearEncryptedDriveAuth();

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
    expect(getSessionSubject()).toBe("user-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes the drive token before clearing scopes so no refresh is triggered", async () => {
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });
    fetchMock.mockClear();

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
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });
    fetchMock.mockClear();

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
          accessToken: "late-access",
          expiresIn: 3600,
          scope: "https://www.googleapis.com/auth/drive.appdata",
          encryptedDriveToken: "late-encrypted-drive-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await refreshPromise;

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe("logoutDrive", () => {
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

  it("posts the drive token to /auth/drive/logout then clears local drive auth", async () => {
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    await logoutDrive();

    expect(fetchMock).toHaveBeenCalledWith(
      DRIVE_LOGOUT_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          encryptedDriveToken: "encrypted-drive-jwt",
        }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
    expect(getSessionSubject()).toBe("user-1");
  });

  it("clears local drive auth even when the logout request fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    await establishSession({
      encryptedHealthToken: "encrypted-jwt",
      encryptedDriveToken: "encrypted-drive-jwt",
    });

    await logoutDrive();

    expect(localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
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
    await establishSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access-token",
          expiresIn: 3600,
          scope: "openid",
          encryptedHealthToken: "rotated-encrypted-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await forceTokenRefresh();

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ encryptedHealthToken: "encrypted-jwt" }),
      }),
    );
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "rotated-encrypted-jwt",
    );
    expect(localStorage.getItem("auth:google-token")).toBeNull();
  });

  it("does not store access tokens in local storage", async () => {
    await establishSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access-token",
          expiresIn: 3600,
          scope: "openid",
          encryptedHealthToken: "encrypted-jwt",
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
    await establishSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access-token",
          expiresIn: 3600,
          encryptedHealthToken: "encrypted-jwt",
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
    await establishSession();
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access-token",
          expiresIn: 3600,
          encryptedHealthToken: "encrypted-jwt",
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
    await establishSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "unauthorized",
          errorDescription: "invalid token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(forceTokenRefresh()).rejects.toThrow("invalid token");

    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it("clears session and health tokens when health access returns 403", async () => {
    await establishSession();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "forbidden",
          errorDescription: "invalid token",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(forceTokenRefresh()).rejects.toThrow("invalid token");

    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });
});

describe("isLoggedIn", () => {
  beforeEach(async () => {
    await resetAuthState();
  });

  it("requires an unexpired session and an encrypted token", async () => {
    expect(isLoggedIn()).toBe(false);

    await establishSession({ encryptedHealthToken: null });
    expect(isLoggedIn()).toBe(false);

    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    expect(isLoggedIn()).toBe(true);
  });

  it("treats an expired session as logged out", async () => {
    await establishSession({
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "encrypted-jwt",
    );
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
        accessToken: accessToken,
        expiresIn: 3600,
        scope: "openid",
        encryptedHealthToken: encryptedHealthToken,
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
    await establishSession();
    mockHealthAccessResponse(fetchMock);

    await restoreAccessToken();

    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ encryptedHealthToken: "encrypted-jwt" }),
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
    await establishSession({
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    fetchMock.mockClear();

    await restoreAccessToken();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not request an access token without an encrypted health token", async () => {
    await establishSession({ encryptedHealthToken: null });
    fetchMock.mockClear();

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
    await establishSession();
    mockHealthAccessResponse(fetchMock);

    const { result } = renderHook(() => useAccessTokenScopes());

    expect(result.current.has("openid")).toBe(false);

    await act(async () => {
      await forceTokenRefresh();
    });

    expect(result.current.has("openid")).toBe(true);
  });

  it("updates useMissingScopes after scopes are granted", async () => {
    await establishSession();
    mockHealthAccessResponse(fetchMock);

    const { result } = renderHook(() => useMissingScopes(["openid"]));

    expect(result.current).toEqual(["openid"]);

    await act(async () => {
      await forceTokenRefresh();
    });

    expect(result.current).toEqual([]);
  });

  it("clears scopes on logout", async () => {
    await establishSession();
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

  it("restores an access token when GET /auth/session succeeds", async () => {
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    fetchMock
      .mockResolvedValueOnce(sessionClaimsResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "restored-access-token",
            expiresIn: 3600,
            scope: "openid",
            encryptedHealthToken: "encrypted-jwt",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    renderHook(() => useAtom(syncAuthTokenEffect));

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      SESSION_PATH,
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      HEALTH_ACCESS_PATH,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ encryptedHealthToken: "encrypted-jwt" }),
      }),
    );
  });

  it("does not restore an access token when GET /auth/session fails", async () => {
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderHook(() => useAtom(syncAuthTokenEffect));

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_PATH,
      expect.objectContaining({ method: "GET" }),
    );
    expect(
      fetchMock.mock.calls.some((call) => call[0] === HEALTH_ACCESS_PATH),
    ).toBe(false);
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
    await establishSession({
      sub: "hint-user",
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
    await establishSession({ encryptedHealthToken: null });
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          encryptedHealthToken: "new-encrypted",
          accessToken: "access",
          expiresIn: 3600,
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
