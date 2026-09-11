"use client";

import { useCallback, useRef } from "react";
import { atom, useAtomValue } from "jotai";
import { atomEffect } from "jotai-effect";
import { toast } from "mui-sonner";
import { jwtDecode } from "jwt-decode";

import { singleAsync } from "@/utils/async";
import { GOOGLE_OAUTH_CLIENT_ID, withBasePath } from "@/config";
import { REQUESTED_SCOPES } from "@/config/google-health-scopes";
import { clearStaySignedIn } from "@/storage/settings";

import {
  disableGoogleAutoSelect,
  loadGoogleOAuth2,
  useGoogleIdentityReady,
} from "./google-identity";

// Refresh when token is expiring soon
const EXPIRING_SOON_MILLIS = 2 * 60 * 1000;

const SESSION_TOKEN_STORAGE_KEY = "auth:session-token";
const ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY = "auth:encrypted-health-token";
const AUTH_TOKEN_UPDATE_EVENT_TYPE = "authtokenupdated";

const SESSION_PATH = withBasePath("/auth/session");
const HEALTH_AUTHORIZE_PATH = withBasePath("/auth/health/authorize");
const HEALTH_ACCESS_PATH = withBasePath("/auth/health/access");

interface SessionTokenClaims {
  sub?: string;
  iat?: number;
  exp?: number;
}

interface TokenEndpointResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  session_token?: string;
  encrypted_health_token?: string;
  error?: string;
  error_description?: string;
}

interface CachedAccessToken {
  accessToken: string;
  expiresAt?: number;
}

let cachedAccessToken: CachedAccessToken | null = null;
let cachedGrantedScope: string | undefined;

function getSessionTokenFromStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
}

function getEncryptedHealthTokenFromStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY);
}

export interface AuthSession {
  sessionToken: string | null;
  encryptedHealthToken: string | null;
  sub?: string;
  scope?: string;
}

function decodeSessionClaims(token: string) {
  try {
    return jwtDecode<SessionTokenClaims>(token);
  } catch {
    return null;
  }
}

function getSessionClaims(token = getSessionTokenFromStorage()) {
  if (!token) {
    return null;
  }

  return decodeSessionClaims(token);
}

function isSessionTokenUnexpired(token = getSessionTokenFromStorage()) {
  if (!token) {
    return false;
  }

  const claims = decodeSessionClaims(token);

  if (!claims?.sub || typeof claims.exp !== "number") {
    return false;
  }

  return claims.exp * 1000 > Date.now();
}

function getAuthSession(): AuthSession {
  const sessionToken = getSessionTokenFromStorage();
  const claims = sessionToken ? decodeSessionClaims(sessionToken) : null;

  return {
    sessionToken,
    encryptedHealthToken: getEncryptedHealthTokenFromStorage(),
    sub: claims?.sub,
    scope: cachedGrantedScope,
  };
}

function notifyAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATE_EVENT_TYPE));
}

export function getSessionSubject(token = getSessionTokenFromStorage()) {
  return getSessionClaims(token)?.sub;
}

export function saveSessionToken(sessionToken: string) {
  localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
  notifyAuthChanged();
}

function saveEncryptedHealthToken(encryptedHealthToken?: string) {
  if (encryptedHealthToken) {
    localStorage.setItem(
      ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY,
      encryptedHealthToken,
    );
  }

  notifyAuthChanged();
}

function cacheGrantedScope(scope?: string) {
  if (!scope) {
    return;
  }

  cachedGrantedScope = scope;
}

function getSessionTokenOrThrow() {
  const sessionToken = getSessionTokenFromStorage();

  if (!isSessionTokenUnexpired(sessionToken) || !sessionToken) {
    throw new Error("no session token available");
  }

  return sessionToken;
}

function cacheAccessToken(response: TokenEndpointResponse) {
  const expiresInSeconds = Number(response.expires_in);

  if (!response.access_token) {
    return;
  }

  cachedAccessToken = {
    accessToken: response.access_token,
    expiresAt: Number.isFinite(expiresInSeconds)
      ? Date.now() + expiresInSeconds * 1000
      : undefined,
  };
}

function isCachedAccessTokenFresh() {
  return (
    !!cachedAccessToken &&
    !!cachedAccessToken.expiresAt &&
    cachedAccessToken.expiresAt > Date.now() + EXPIRING_SOON_MILLIS
  );
}

async function postSessionJson(
  path: string,
  body?: Record<string, string>,
): Promise<TokenEndpointResponse> {
  const sessionToken = getSessionTokenOrThrow();

  const response = await fetch(path, {
    method: "POST",
    mode: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload: TokenEndpointResponse = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description || payload.error || "token request failed",
    );
  }

  return payload;
}

function applyHealthTokenResponse(payload: TokenEndpointResponse) {
  cacheAccessToken(payload);
  cacheGrantedScope(payload.scope);
  saveEncryptedHealthToken(payload.encrypted_health_token);
}

export async function createSession(idToken: string) {
  const response = await fetch(SESSION_PATH, {
    method: "POST",
    mode: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  const payload: TokenEndpointResponse = await response.json();

  if (!response.ok || payload.error || !payload.session_token) {
    throw new Error(
      payload.error_description || payload.error || "session request failed",
    );
  }

  cachedAccessToken = null;
  cachedGrantedScope = undefined;
  saveSessionToken(payload.session_token);
}

async function exchangeCodeForHealthToken(code: string) {
  const payload = await postSessionJson(HEALTH_AUTHORIZE_PATH, { code });

  applyHealthTokenResponse(payload);

  if (!getEncryptedHealthTokenFromStorage()) {
    throw new Error("no refresh token returned");
  }

  return payload;
}

async function requestAccessToken() {
  const encryptedHealthToken = getEncryptedHealthTokenFromStorage();

  if (!encryptedHealthToken) {
    throw new Error("no encrypted token available");
  }

  const payload = await postSessionJson(HEALTH_ACCESS_PATH, {
    encrypted_health_token: encryptedHealthToken,
  });
  applyHealthTokenResponse(payload);

  if (!payload.access_token) {
    throw new Error("no access token returned");
  }

  return payload.access_token;
}

/**
 * Prompt the user to authorize Google Health via GIS CodeClient, then send the
 * code to the server to encrypt the refresh token.
 */
export function useGoogleLoginAndAuthorization({
  selectAccount = false,
  includeGrantedScopes = true,
  additionalScopes = [],
}: {
  /** Also prompt the user to pick which Google account to use. */
  selectAccount?: boolean;
  /**
   * When false, the new token covers only the scopes requested in this
   * authorization (Google default is true / incremental auth).
   */
  includeGrantedScopes?: boolean;
  /** Extra scopes to request in addition to {@link REQUESTED_SCOPES}. */
  additionalScopes?: Array<string>;
} = {}) {
  const scriptLoadedSuccessfully = useGoogleIdentityReady();
  const pendingRef = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);

  const failPending = useCallback(
    (error: unknown, { silent = false }: { silent?: boolean } = {}) => {
      const pending = pendingRef.current;
      pendingRef.current = null;

      if (!silent) {
        console.error("error starting login flow", error);
        toast.error("Unable to reach Google to sign in");
      }

      pending?.reject(
        error instanceof Error
          ? error
          : new Error(
              typeof error === "object" &&
                error &&
                "type" in error &&
                typeof error.type === "string"
                ? error.type
                : String(error),
            ),
      );
    },
    [],
  );

  const completeLogin = useCallback(
    async (code: string) => {
      const pending = pendingRef.current;

      try {
        await exchangeCodeForHealthToken(code);
        pendingRef.current = null;
        pending?.resolve();
      } catch (error) {
        failPending(error);
      }
    },
    [failPending],
  );

  const loginToGoogleAndAuthorize = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      pendingRef.current = { resolve, reject };

      void (async () => {
        try {
          const oauth2 = await loadGoogleOAuth2();
          const hint = selectAccount ? undefined : getSessionSubject();
          const client = oauth2.initCodeClient({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            scope: [
              ...new Set([...REQUESTED_SCOPES, ...additionalScopes]),
            ].join(" "),
            ux_mode: "popup",
            redirect_uri: window.location.origin,
            hint,
            include_granted_scopes: includeGrantedScopes,
            select_account: selectAccount,
            callback: (codeResponse) => {
              if (codeResponse.error) {
                failPending(
                  new Error(
                    codeResponse.error_description ||
                      codeResponse.error ||
                      "authorization failed",
                  ),
                  { silent: codeResponse.error === "access_denied" },
                );
                return;
              }

              void completeLogin(codeResponse.code);
            },
            error_callback: (error) => {
              failPending(error, { silent: error.type === "popup_closed" });
            },
          });

          client.requestCode();
        } catch (error) {
          failPending(error);
        }
      })();
    });
  }, [
    additionalScopes,
    completeLogin,
    failPending,
    includeGrantedScopes,
    selectAccount,
  ]);

  return { loginToGoogleAndAuthorize, ready: scriptLoadedSuccessfully };
}

export async function logout() {
  const sessionToken = getSessionTokenFromStorage();
  disableGoogleAutoSelect();
  clearStaySignedIn();
  clearToken();

  if (!sessionToken) {
    return;
  }

  await revokeSession(sessionToken);
}

/** Revoke all access tokens for the developer application, and reset consent. */
export async function revokeAuthorization() {
  if (!getEncryptedHealthTokenFromStorage()) {
    await logout();
    return;
  }

  try {
    const accessToken = await getFreshAccessToken();
    const oauth2 = await loadGoogleOAuth2();

    await new Promise<void>((resolve) =>
      oauth2.revoke(accessToken, () => resolve()),
    );
  } catch (e) {
    console.error("error revoking token", e);
  }

  await logout();
}

async function revokeSession(sessionToken: string | null) {
  if (!sessionToken) {
    return;
  }

  try {
    await fetch(SESSION_PATH, {
      method: "DELETE",
      mode: "same-origin",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch (e) {
    console.error("error revoking session", e);
  }
}

export function isLoggedIn() {
  return isSessionTokenUnexpired() && !!getEncryptedHealthTokenFromStorage();
}

function clearToken() {
  cachedAccessToken = null;
  cachedGrantedScope = undefined;
  localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY);
  notifyAuthChanged();
}

export const getFreshAccessToken = singleAsync(async () => {
  getSessionTokenOrThrow();

  if (isCachedAccessTokenFresh() && cachedAccessToken) {
    return cachedAccessToken.accessToken;
  }

  if (!getEncryptedHealthTokenFromStorage()) {
    throw new Error("no encrypted token available");
  }

  try {
    return await requestAccessToken();
  } catch (e) {
    console.error("error while refreshing token", e);
    cachedAccessToken = null;
    throw e;
  }
});

/**
 * On page load, exchange a still-valid session for a Google Health access
 * token. Access tokens are memory-only, so a reload has to fetch a new one.
 */
export async function restoreAccessToken() {
  if (!isLoggedIn()) {
    return;
  }

  try {
    await getFreshAccessToken();
  } catch (error) {
    console.error("error restoring access token", error);
  }
}

/** Always exchange the stored encrypted refresh token for a new access token. */
export async function forceTokenRefresh() {
  cachedAccessToken = null;
  return requestAccessToken();
}

const authSessionAtom = atom<AuthSession>(getAuthSession());

/** Watch for localStorage and in-memory auth changes. */
export const syncAuthTokenEffect = atomEffect((get, set) => {
  void restoreAccessToken();

  const storageListener = (event: StorageEvent) => {
    if (
      event.key === SESSION_TOKEN_STORAGE_KEY ||
      event.key === ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY
    ) {
      set(authSessionAtom, getAuthSession());
    }
  };

  const updateListener = () => {
    set(authSessionAtom, getAuthSession());
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
  return new Set(
    (cachedGrantedScope?.split(" ") ?? []).filter((scope) => scope.length > 0),
  );
}

export function getMissingScopes(requiredScopes: Array<string>) {
  const currentScopes = getAccessTokenScopes();
  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

/** Reactive missing-scope check; updates after the user grants additional permissions. */
export function useMissingScopes(requiredScopes: Array<string> = []) {
  const session = useAtomValue(authSessionAtom);
  const currentScopes = new Set(
    (session.scope?.split(" ") ?? []).filter((scope) => scope.length > 0),
  );

  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

export function hasTokenScope(scope: string) {
  return getAccessTokenScopes().has(scope);
}

export function useAuthSession() {
  return useAtomValue(authSessionAtom);
}

export function useLoggedIn() {
  const session = useAtomValue(authSessionAtom);
  return (
    isSessionTokenUnexpired(session.sessionToken) &&
    !!session.encryptedHealthToken
  );
}

export function useOpenIdSignedIn() {
  const session = useAtomValue(authSessionAtom);
  return isSessionTokenUnexpired(session.sessionToken);
}
