"use client";

import { useCallback, useRef } from "react";
import { atom, useAtomValue } from "jotai";
import { atomEffect } from "jotai-effect";
import { toast } from "mui-sonner";
import { useGoogleLogin, useGoogleOAuth } from "@react-oauth/google";

import { singleAsync } from "@/utils/async";
import { GOOGLE_OAUTH_CLIENT_ID } from "@/config";
import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

import { loadGoogleOAuth2 } from "./google-identity";

// Refresh when token is expiring soon
const EXPIRING_SOON_MILLIS = 2 * 60 * 1000;

const GOOGLE_TOKEN_STORAGE_KEY = "auth:google-token";
const AUTH_TOKEN_UPDATE_EVENT_TYPE = "authtokenupdated";

const TOKEN_EXCHANGE_PATH = "/auth/google-oauth2-policy-requires-a-server";

const AUTH_CODE_LOGIN_OPTIONS = {
  flow: "auth-code" as const,
  ux_mode: "popup" as const,
  scope: REQUESTED_SCOPES.join(" "),
  overrideScope: true,
};

export interface GoogleToken {
  accessToken: string;
  refreshToken?: string;
  /** Time the access token expires, in epoch millis. */
  expiresAt?: number;
  /** Space-delimited list of scopes the user actually granted. */
  scope?: string;
  /**
   * Stable id for this browser login session. Google's code client does not
   * return a user id, so we keep one locally across silent refreshes.
   */
  userId?: string;
}

interface TokenEndpointResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

type TokenExchangeBody = Record<string, string>;

async function fetchGoogleToken(
  params: TokenExchangeBody,
): Promise<TokenEndpointResponse> {
  const response = await fetch(TOKEN_EXCHANGE_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const payload: TokenEndpointResponse = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description || payload.error || "token request failed",
    );
  }

  return payload;
}

function exchangeCodeForTokens(code: string) {
  return fetchGoogleToken({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    code,
    grant_type: "authorization_code",
    redirect_uri: window.location.origin,
  });
}

function refreshGoogleToken(refreshToken: string) {
  return fetchGoogleToken({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

function tokenFromResponse(
  response: TokenEndpointResponse,
  previous?: GoogleToken | null,
): GoogleToken {
  const expiresInSeconds = Number(response.expires_in);

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previous?.refreshToken,
    expiresAt: Number.isFinite(expiresInSeconds)
      ? Date.now() + expiresInSeconds * 1000
      : undefined,
    scope: response.scope ?? previous?.scope,
    userId: previous?.userId ?? crypto.randomUUID(),
  };
}

/**
 * Prompt the user to authorize via @react-oauth/google's authorization code
 * popup, exchange the code for tokens, then store them.
 */
export function useGoogleLoginAndAuthorization({
  selectAccount = false,
  additionalScopes = [],
}: {
  /** Also prompt the user to pick which Google account to use. */
  selectAccount?: boolean;
  /** Extra scopes to request in addition to {@link REQUESTED_SCOPES}. */
  additionalScopes?: Array<string>;
} = {}) {
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  const pendingRef = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);

  const failPending = useCallback((error: unknown) => {
    const pending = pendingRef.current;
    pendingRef.current = null;

    console.error("error starting login flow", error);
    toast.error("Unable to reach Google to sign in");
    pending?.reject(error instanceof Error ? error : new Error(String(error)));
  }, []);

  const completeLogin = useCallback(
    async (code: string) => {
      const pending = pendingRef.current;

      try {
        const response = await exchangeCodeForTokens(code);
        saveTokenToStorage(
          tokenFromResponse(
            response,
            selectAccount ? null : getTokenFromStorage(),
          ),
        );
        pendingRef.current = null;
        pending?.resolve();
      } catch (error) {
        failPending(error);
      }
    },
    [failPending, selectAccount],
  );

  const login = useGoogleLogin({
    ...AUTH_CODE_LOGIN_OPTIONS,
    scope: [...new Set([...REQUESTED_SCOPES, ...additionalScopes])].join(" "),
    select_account: selectAccount,
    redirect_uri:
      typeof window !== "undefined" ? window.location.origin : undefined,
    onSuccess: (codeResponse) => {
      void completeLogin(codeResponse.code);
    },
    onError: (errorResponse) => {
      failPending(
        new Error(
          errorResponse.error_description ||
            errorResponse.error ||
            "authorization failed",
        ),
      );
    },
    onNonOAuthError: (error) => {
      failPending(error);
    },
  });

  const googleLoginAndAuthorization = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      login();
    });
  }, [login]);

  return { googleLoginAndAuthorization, ready: scriptLoadedSuccessfully };
}

export async function logout() {
  clearToken();
}

/** Revoke all access tokens for the developer application, and reset consent. */
export async function revokeAuthorization() {
  if (!getTokenFromStorage()) {
    return;
  }

  try {
    // Google rejects revocation requests using an expired access token
    const accessToken = await getFreshAccessToken();
    const oauth2 = await loadGoogleOAuth2();

    await new Promise<void>((resolve) =>
      oauth2.revoke(accessToken, () => resolve()),
    );
  } catch (e) {
    console.error("error revoking token", e);
  }

  clearToken();
}

function getTokenFromStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const tokenString = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
  const token: GoogleToken | null = tokenString
    ? JSON.parse(tokenString)
    : null;

  return token;
}

export function isLoggedIn() {
  return !!getTokenFromStorage();
}

function saveTokenToStorage(token: GoogleToken) {
  localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, JSON.stringify(token));

  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATE_EVENT_TYPE));
}

function clearToken() {
  localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);

  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATE_EVENT_TYPE));
}

export const getFreshAccessToken = singleAsync(async () => {
  const token = getTokenFromStorage();

  if (!token) {
    throw new Error("no access token available");
  }

  if (token.expiresAt && token.expiresAt > Date.now() + EXPIRING_SOON_MILLIS) {
    return token.accessToken;
  }

  if (!token.refreshToken) {
    clearToken();
    throw new Error("no refresh token available");
  }

  try {
    const response = await refreshGoogleToken(token.refreshToken);
    const updatedToken = tokenFromResponse(response, token);

    saveTokenToStorage(updatedToken);

    return updatedToken.accessToken;
  } catch (e) {
    console.error("error while refreshing token", e);
    clearToken();
    throw e;
  }
});

/**
 * This is a copy of the Google token wrapped in an atom, which allows us to
 * observe changes such as getting logged out, userId changes, etc.
 */
const googleTokenAtom = atom<GoogleToken | null>(getTokenFromStorage());

/** Watch for localStorage changes from other windows. */
export const syncAuthTokenEffect = atomEffect((get, set) => {
  const storageListener = (event: StorageEvent) => {
    if (event.key === GOOGLE_TOKEN_STORAGE_KEY) {
      const token = getTokenFromStorage();

      set(googleTokenAtom, token);
    }
  };

  // Events fired from dispatchEvent
  const updateListener = () => {
    const token = getTokenFromStorage();
    set(googleTokenAtom, token);
  };

  window.addEventListener("storage", storageListener);
  window.addEventListener(AUTH_TOKEN_UPDATE_EVENT_TYPE, updateListener);

  return () => {
    window.removeEventListener("storage", storageListener);
    window.removeEventListener(AUTH_TOKEN_UPDATE_EVENT_TYPE, updateListener);
  };
});

/** Get the full Google Health scope URLs granted for the current access token. */
export function getAccessTokenScopes() {
  const token = getTokenFromStorage();

  return new Set(
    (token?.scope?.split(" ") ?? []).filter((scope) => scope.length > 0),
  );
}

export function getMissingScopes(requiredScopes: Array<string>) {
  const currentScopes = getAccessTokenScopes();
  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

/** Reactive missing-scope check; updates after the user grants additional permissions. */
export function useMissingScopes(requiredScopes: Array<string> = []) {
  const token = useAtomValue(googleTokenAtom);
  const currentScopes = new Set(
    (token?.scope?.split(" ") ?? []).filter((scope) => scope.length > 0),
  );

  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

export function hasTokenScope(scope: string) {
  return getAccessTokenScopes().has(scope);
}

export const rawUserIdAtom = atom((get) => get(googleTokenAtom)?.userId);

export const userIdAtom = atom((get) => {
  const userId = get(rawUserIdAtom);

  if (!userId) {
    throw new Error("no token available");
  }

  return userId;
});

export function useLoggedIn() {
  const token = useAtomValue(googleTokenAtom);
  return !!token;
}
