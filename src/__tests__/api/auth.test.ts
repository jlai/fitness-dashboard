import { act, renderHook } from "@testing-library/react";
import { toast } from "mui-sonner";

import { useAtom } from "jotai";

import {
  createSession,
  forceTokenRefresh,
  getAccessTokenScopes,
  getFreshAccessToken,
  isLoggedIn,
  logout,
  restoreAccessToken,
  syncAuthTokenEffect,
  useGoogleLoginAndAuthorization,
} from "@/api/auth";
import { loadGoogleOAuth2 } from "@/api/google-identity";

jest.mock("@react-oauth/google", () => ({
  useGoogleOAuth: () => ({ scriptLoadedSuccessfully: true }),
  useGoogleOneTapLogin: jest.fn(),
  googleLogout: jest.fn(),
}));

jest.mock("@/api/google-identity", () => ({
  loadGoogleOAuth2: jest.fn(),
}));

const loadGoogleOAuth2Mock = loadGoogleOAuth2 as jest.MockedFunction<
  typeof loadGoogleOAuth2
>;
const toastError = toast.error as jest.Mock;

const SESSION_PATH = "/auth/session";
const HEALTH_AUTHORIZE_PATH = "/auth/health/authorize";
const HEALTH_ACCESS_PATH = "/auth/health/access";
const SESSION_TOKEN_STORAGE_KEY = "auth:session-token";
const ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY = "auth:encrypted-health-token";

function toBase64Url(value: object) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fakeSessionToken({
  sub = "user-1",
  exp = Math.floor(Date.now() / 1000) + 60 * 60,
}: {
  sub?: string;
  exp?: number;
} = {}) {
  return `${toBase64Url({ alg: "HS256", typ: "session+jwt" })}.${toBase64Url({
    sub,
    iat: Math.floor(Date.now() / 1000) - 60,
    exp,
  })}.sig`;
}

function setStoredSession({
  sessionToken = fakeSessionToken(),
  encryptedHealthToken = "encrypted-jwt",
}: {
  sessionToken?: string | null;
  encryptedHealthToken?: string | null;
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
}

describe("createSession", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    logout();
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("posts the id_token and stores the session token", async () => {
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
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe(sessionToken);
    expect(JSON.stringify(localStorage)).not.toContain("google-id-token");
  });
});

describe("logout", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    localStorage.clear();
  });

  it("revokes the session token then clears local auth state", async () => {
    const sessionToken = fakeSessionToken();
    setStoredSession({ sessionToken, encryptedHealthToken: "encrypted-jwt" });

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      SESSION_PATH,
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
});

describe("forceTokenRefresh", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    logout();
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
});

describe("isLoggedIn", () => {
  beforeEach(() => {
    localStorage.clear();
    logout();
  });

  it("requires an unexpired session token and an encrypted token", () => {
    expect(isLoggedIn()).toBe(false);

    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, fakeSessionToken());
    expect(isLoggedIn()).toBe(false);

    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    expect(isLoggedIn()).toBe(true);
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

  beforeEach(() => {
    localStorage.clear();
    logout();
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

describe("syncAuthTokenEffect", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    logout();
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

  beforeEach(() => {
    toastError.mockClear();
    localStorage.clear();
    logout();
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
        scope: expect.stringMatching(/(^|\s)openid(\s|$)/),
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
    expect(localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY)).toBe(
      "new-encrypted",
    );
    expect(JSON.stringify(localStorage)).not.toContain("openid");
    expect(getAccessTokenScopes().has("openid")).toBe(true);
    expect(localStorage.getItem("auth:google-token")).toBeNull();

    fetchMock.mockRestore();
  });
});
