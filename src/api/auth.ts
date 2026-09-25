"use client";

import { useCallback, useRef } from "react";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import { atomEffect } from "jotai-effect";
import { toast } from "mui-sonner";
import { jwtDecode } from "jwt-decode";

import { singleAsync } from "@/utils/async";
import { GOOGLE_OAUTH_CLIENT_ID, withBasePath } from "@/config";
import { REQUESTED_DRIVE_SCOPES } from "@/config/google-drive-scopes";
import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

import {
  disableGoogleAutoSelect,
  loadGoogleOAuth2,
  useGoogleIdentityReady,
} from "./google-identity";

// Refresh when token is expiring soon
const EXPIRING_SOON_MILLIS = 2 * 60 * 1000;

/**
 * When restoring a stored session on page load, require at least this fraction
 * of the session lifetime remaining so the user is not signed out shortly after.
 */
const MIN_SESSION_LIFETIME_REMAINING = 0.1;

const SESSION_TOKEN_STORAGE_KEY = "auth:session-token";
const ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY = "auth:encrypted-health-token";
const ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY = "auth:encrypted-drive-token";
const LEGACY_STAY_SIGNED_IN_STORAGE_KEY = "auth:stay-signed-in";
const AUTH_TOKEN_UPDATE_EVENT_TYPE = "authtokenupdated";

const SESSION_PATH = withBasePath("/auth/session");
const SESSION_CURRENT_PATH = withBasePath("/auth/session/current");
const SESSION_ALL_PATH = withBasePath("/auth/session/all");
const HEALTH_PATH = withBasePath("/auth/health");
const HEALTH_CURRENT_PATH = withBasePath("/auth/health/current");
const HEALTH_AUTHORIZE_PATH = withBasePath("/auth/health/authorize");
const HEALTH_ACCESS_PATH = withBasePath("/auth/health/access");
const DRIVE_PATH = withBasePath("/auth/drive");
const DRIVE_CURRENT_PATH = withBasePath("/auth/drive/current");
const DRIVE_AUTHORIZE_PATH = withBasePath("/auth/drive/authorize");
const DRIVE_ACCESS_PATH = withBasePath("/auth/drive/access");

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
  encrypted_drive_token?: string;
  error?: string;
  error_description?: string;
}

interface CachedAccessToken {
  accessToken: string;
  expiresAt?: number;
}

let currentHealthAccessToken: CachedAccessToken | null = null;
let currentDriveAccessToken: CachedAccessToken | null = null;
let sessionAccessToken: string | null = null;
let encryptedHealthRefreshToken: string | null = null;
let encryptedDriveRefreshToken: string | null = null;
/** Bumped when Drive auth is cleared so in-flight refreshes cannot re-persist tokens. */
let driveAuthGeneration = 0;

/**
 * After Google Health access is granted during login, keep the login box
 * visible until the user finishes the remember-me step.
 */
export const pendingRememberMeChoiceAtom = atom(false);

/** Space-separated Google Health scopes from the latest access-token response. */
export const grantedScopesAtom = atom<string | undefined>(undefined);

/** Space-separated Google Drive scopes from the latest drive access-token response. */
export const grantedDriveScopesAtom = atom<string | undefined>(undefined);

function readSessionTokenFromLocalStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
}

function readEncryptedHealthTokenFromLocalStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY);
}

function readEncryptedDriveTokenFromLocalStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY);
}

/** True when an encrypted health token was saved for return visits. */
export function hasPersistedEncryptedHealthToken() {
  return !!readEncryptedHealthTokenFromLocalStorage();
}

/** Persist session + health/drive tokens across visits when the user chose remember me. */
function isPersistingAuthTokens() {
  return hasPersistedEncryptedHealthToken();
}

/**
 * True when a stored session still has enough lifetime left to restore on
 * page load (unexpired and at least {@link MIN_SESSION_LIFETIME_REMAINING}
 * of its total lifetime remaining).
 */
function isSessionTokenWorthRestoring(token: string) {
  const claims = decodeSessionClaims(token);

  if (!claims?.sub || typeof claims.exp !== "number") {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (claims.exp <= nowSeconds) {
    return false;
  }

  if (typeof claims.iat !== "number" || claims.iat >= claims.exp) {
    // Lifetime unknown; allow restore based on absolute expiry only.
    return true;
  }

  const lifetime = claims.exp - claims.iat;
  const remaining = claims.exp - nowSeconds;

  return remaining / lifetime >= MIN_SESSION_LIFETIME_REMAINING;
}

function getSessionTokenFromStorage() {
  if (sessionAccessToken) {
    return sessionAccessToken;
  }

  const stored = readSessionTokenFromLocalStorage();
  if (stored) {
    if (isSessionTokenWorthRestoring(stored)) {
      sessionAccessToken = stored;
    } else if (typeof localStorage !== "undefined") {
      // Near expiry or expired — drop the session so the user re-auths with a
      // fresh token instead of being signed out mid-visit. Keep the encrypted
      // health token so remember-me / One Tap can recreate the session.
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
  }

  return sessionAccessToken;
}

function getEncryptedHealthTokenFromStorage() {
  if (encryptedHealthRefreshToken) {
    return encryptedHealthRefreshToken;
  }

  const stored = readEncryptedHealthTokenFromLocalStorage();
  if (stored) {
    encryptedHealthRefreshToken = stored;
  }

  return encryptedHealthRefreshToken;
}

function getEncryptedDriveTokenFromStorage() {
  if (encryptedDriveRefreshToken) {
    return encryptedDriveRefreshToken;
  }

  const stored = readEncryptedDriveTokenFromLocalStorage();
  if (stored) {
    encryptedDriveRefreshToken = stored;
  }

  return encryptedDriveRefreshToken;
}

/** True when an encrypted Google Drive refresh token is available. */
export function hasEncryptedDriveToken() {
  return !!getEncryptedDriveTokenFromStorage();
}

export interface AuthSession {
  sessionToken: string | null;
  encryptedHealthToken: string | null;
  encryptedDriveToken: string | null;
  sub?: string;
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
    encryptedDriveToken: getEncryptedDriveTokenFromStorage(),
    sub: claims?.sub,
  };
}

function getCachedGrantedScope() {
  return getDefaultStore().get(grantedScopesAtom);
}

function getCachedGrantedDriveScope() {
  return getDefaultStore().get(grantedDriveScopesAtom);
}

/** Raw space-separated scope string from the latest access-token response. */
export function getGrantedScopesRaw(): string | undefined {
  return getCachedGrantedScope();
}

/** Raw space-separated scope string from the latest drive access-token response. */
export function getGrantedDriveScopesRaw(): string | undefined {
  return getCachedGrantedDriveScope();
}

function setGrantedHealthScope(scope: string | undefined) {
  getDefaultStore().set(grantedScopesAtom, scope);
}

function setGrantedDriveScope(scope: string | undefined) {
  getDefaultStore().set(grantedDriveScopesAtom, scope);
}

function notifyAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATE_EVENT_TYPE));
  // Keep the jotai snapshot in sync even if syncAuthTokenEffect isn't mounted yet.
  getDefaultStore().set(authSessionAtom, getAuthSession());
}

export function getSessionSubject(token = getSessionTokenFromStorage()) {
  return getSessionClaims(token)?.sub;
}

/** Keep the session JWT in memory; also write to localStorage when remembering. */
export function saveSessionToken(sessionToken: string) {
  sessionAccessToken = sessionToken;

  if (isPersistingAuthTokens()) {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
  }

  notifyAuthChanged();
}

function saveEncryptedHealthToken(encryptedHealthToken?: string) {
  if (!encryptedHealthToken) {
    notifyAuthChanged();
    return;
  }

  const shouldPersist = isPersistingAuthTokens();
  encryptedHealthRefreshToken = encryptedHealthToken;

  if (shouldPersist) {
    localStorage.setItem(
      ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY,
      encryptedHealthToken,
    );
  }

  notifyAuthChanged();
}

function saveEncryptedDriveToken(encryptedDriveToken?: string) {
  if (!encryptedDriveToken) {
    notifyAuthChanged();
    return;
  }

  const shouldPersist = isPersistingAuthTokens();
  encryptedDriveRefreshToken = encryptedDriveToken;

  if (shouldPersist) {
    localStorage.setItem(
      ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY,
      encryptedDriveToken,
    );
  }

  notifyAuthChanged();
}

/**
 * Save the current in-memory session and encrypted health/drive tokens to
 * localStorage so the user can resume on return visits.
 */
export function persistAuthTokens() {
  const sessionToken = getSessionTokenFromStorage();
  const encryptedHealthToken = getEncryptedHealthTokenFromStorage();
  const encryptedDriveToken = getEncryptedDriveTokenFromStorage();

  if (sessionToken) {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
  }

  if (encryptedHealthToken) {
    localStorage.setItem(
      ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY,
      encryptedHealthToken,
    );
  }

  if (encryptedDriveToken) {
    localStorage.setItem(
      ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY,
      encryptedDriveToken,
    );
  }

  localStorage.removeItem(LEGACY_STAY_SIGNED_IN_STORAGE_KEY);
  notifyAuthChanged();
}

function cacheGrantedScope(scope?: string) {
  if (!scope) {
    return;
  }

  setGrantedHealthScope(scope);
}

function cacheGrantedDriveScope(scope?: string) {
  if (!scope) {
    return;
  }

  setGrantedDriveScope(scope);
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

  currentHealthAccessToken = {
    accessToken: response.access_token,
    expiresAt: Number.isFinite(expiresInSeconds)
      ? Date.now() + expiresInSeconds * 1000
      : undefined,
  };
}

function cacheDriveAccessToken(response: TokenEndpointResponse) {
  const expiresInSeconds = Number(response.expires_in);

  if (!response.access_token) {
    return;
  }

  currentDriveAccessToken = {
    accessToken: response.access_token,
    expiresAt: Number.isFinite(expiresInSeconds)
      ? Date.now() + expiresInSeconds * 1000
      : undefined,
  };
}

function isCachedAccessTokenFresh(
  cached: CachedAccessToken | null = currentHealthAccessToken,
) {
  return (
    !!cached &&
    !!cached.expiresAt &&
    cached.expiresAt > Date.now() + EXPIRING_SOON_MILLIS
  );
}

/** Clear local session + health JWE when a session/health endpoint returns 401/403. */
function forceSignOut() {
  disableGoogleAutoSelect();
  clearAllAuthTokens();
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

  if (response.status === 401 || response.status === 403) {
    forceSignOut();
    let description =
      response.status === 401 ? "unauthorized" : "forbidden";

    try {
      const payload = (await response.json()) as TokenEndpointResponse;
      description =
        payload.error_description || payload.error || description;
    } catch {
      // ignore JSON parse failures; still signed out locally
    }

    throw new Error(description);
  }

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

function applyDriveTokenResponse(
  payload: TokenEndpointResponse,
  generation = driveAuthGeneration,
) {
  if (generation !== driveAuthGeneration) {
    return;
  }

  cacheDriveAccessToken(payload);
  cacheGrantedDriveScope(payload.scope);
  saveEncryptedDriveToken(payload.encrypted_drive_token);
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

  currentHealthAccessToken = null;
  currentDriveAccessToken = null;
  setGrantedHealthScope(undefined);
  setGrantedDriveScope(undefined);
  saveSessionToken(payload.session_token);

  // Session JWTs can expire while the encrypted health refresh token remains.
  // After Sign In With Google recreates the session, restore an access token
  // (page-load restoreAccessToken already no-oped while the session was expired).
  await restoreAccessToken();
  await restoreDriveAccessToken();
}

async function exchangeCodeForHealthToken(code: string) {
  const payload = await postSessionJson(HEALTH_AUTHORIZE_PATH, { code });

  applyHealthTokenResponse(payload);

  if (!getEncryptedHealthTokenFromStorage()) {
    throw new Error("no refresh token returned");
  }

  return payload;
}

async function exchangeCodeForDriveToken(code: string) {
  const payload = await postSessionJson(DRIVE_AUTHORIZE_PATH, { code });

  applyDriveTokenResponse(payload);

  if (!getEncryptedDriveTokenFromStorage()) {
    throw new Error("no drive refresh token returned");
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

async function requestDriveAccessToken() {
  const generation = driveAuthGeneration;
  const encryptedDriveToken = getEncryptedDriveTokenFromStorage();

  if (!encryptedDriveToken) {
    throw new Error("no encrypted drive token available");
  }

  const payload = await postSessionJson(DRIVE_ACCESS_PATH, {
    encrypted_drive_token: encryptedDriveToken,
  });

  if (generation !== driveAuthGeneration) {
    throw new Error("drive authorization was cleared");
  }

  applyDriveTokenResponse(payload, generation);

  if (!payload.access_token) {
    throw new Error("no drive access token returned");
  }

  return payload.access_token;
}

/**
 * Prompt the user to authorize Google Health via GIS CodeClient, then send the
 * code to the server to encrypt the refresh token.
 *
 * Always requests {@link REQUESTED_SCOPES} (openid + all Health permissions)
 * and never includes previously granted scopes. Google Health rejects mixed
 * scope sets (e.g. Drive) even when those were granted earlier.
 */
export function useGoogleLoginAndAuthorization({
  selectAccount = false,
}: {
  /** Also prompt the user to pick which Google account to use. */
  selectAccount?: boolean;
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
            scope: REQUESTED_SCOPES.join(" "),
            ux_mode: "popup",
            redirect_uri: window.location.origin,
            hint,
            include_granted_scopes: false,
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
  }, [completeLogin, failPending, selectAccount]);

  return { loginToGoogleAndAuthorize, ready: scriptLoadedSuccessfully };
}

/**
 * Prompt the user to authorize Google Drive via GIS CodeClient, then send the
 * code to the server to encrypt a Drive-only refresh token.
 *
 * Uses {@link REQUESTED_DRIVE_SCOPES} only (not Health scopes) and does not
 * include previously granted scopes, so Drive stays on a separate token.
 */
export function useGoogleDriveAuthorization({
  selectAccount = false,
}: {
  /** Also prompt the user to pick which Google account to use. */
  selectAccount?: boolean;
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
        console.error("error starting drive authorization flow", error);
        toast.error("Unable to reach Google to authorize Drive");
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

  const completeAuthorization = useCallback(
    async (code: string) => {
      const pending = pendingRef.current;

      try {
        await exchangeCodeForDriveToken(code);
        pendingRef.current = null;
        pending?.resolve();
      } catch (error) {
        failPending(error);
      }
    },
    [failPending],
  );

  const authorizeGoogleDrive = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      pendingRef.current = { resolve, reject };

      void (async () => {
        try {
          const oauth2 = await loadGoogleOAuth2();
          const hint = selectAccount ? undefined : getSessionSubject();
          const client = oauth2.initCodeClient({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            scope: REQUESTED_DRIVE_SCOPES.join(" "),
            ux_mode: "popup",
            redirect_uri: window.location.origin,
            hint,
            include_granted_scopes: false,
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

              void completeAuthorization(codeResponse.code);
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
  }, [completeAuthorization, failPending, selectAccount]);

  return { authorizeGoogleDrive, ready: scriptLoadedSuccessfully };
}

export async function logout() {
  const sessionToken = getSessionTokenFromStorage();
  const encryptedHealthToken = getEncryptedHealthTokenFromStorage();
  const encryptedDriveToken = getEncryptedDriveTokenFromStorage();

  disableGoogleAutoSelect();

  try {
    if (sessionToken) {
      if (encryptedHealthToken) {
        await revokeCurrentHealthToken(sessionToken, encryptedHealthToken);
      }

      if (encryptedDriveToken) {
        await revokeCurrentDriveToken(sessionToken, encryptedDriveToken);
      }

      await revokeSession(sessionToken);
    }
  } finally {
    clearAllAuthTokens();
  }
}

/** Revoke Google Health and Drive access and invalidate all site sessions for this user. */
export async function revokeAuthorization() {
  const sessionToken = getSessionTokenFromStorage();
  const encryptedHealthToken = getEncryptedHealthTokenFromStorage();
  const encryptedDriveToken = getEncryptedDriveTokenFromStorage();

  disableGoogleAutoSelect();

  try {
    if (sessionToken && encryptedHealthToken) {
      await revokeHealthToken(sessionToken, encryptedHealthToken);
    }

    if (sessionToken && encryptedDriveToken) {
      await revokeDriveToken(sessionToken, encryptedDriveToken);
    }

    if (sessionToken) {
      await revokeAllSessions(sessionToken);
    }
  } finally {
    clearAllAuthTokens();
  }
}

async function revokeCurrentHealthToken(
  sessionToken: string,
  encryptedHealthToken: string,
) {
  try {
    await fetch(HEALTH_CURRENT_PATH, {
      method: "DELETE",
      mode: "same-origin",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encrypted_health_token: encryptedHealthToken }),
    });
  } catch (e) {
    console.error("error revoking current health token", e);
  }
}

async function revokeCurrentDriveToken(
  sessionToken: string,
  encryptedDriveToken: string,
) {
  try {
    await fetch(DRIVE_CURRENT_PATH, {
      method: "DELETE",
      mode: "same-origin",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encrypted_drive_token: encryptedDriveToken }),
    });
  } catch (e) {
    console.error("error revoking current drive token", e);
  }
}

async function revokeHealthToken(
  sessionToken: string,
  encryptedHealthToken: string,
) {
  try {
    await fetch(HEALTH_PATH, {
      method: "DELETE",
      mode: "same-origin",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encrypted_health_token: encryptedHealthToken }),
    });
  } catch (e) {
    console.error("error revoking health token", e);
  }
}

async function revokeDriveToken(
  sessionToken: string,
  encryptedDriveToken: string,
) {
  try {
    await fetch(DRIVE_PATH, {
      method: "DELETE",
      mode: "same-origin",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ encrypted_drive_token: encryptedDriveToken }),
    });
  } catch (e) {
    console.error("error revoking drive token", e);
  }
}

async function revokeSession(sessionToken: string | null) {
  if (!sessionToken) {
    return;
  }

  try {
    await fetch(SESSION_CURRENT_PATH, {
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

async function revokeAllSessions(sessionToken: string) {
  try {
    await fetch(SESSION_ALL_PATH, {
      method: "DELETE",
      mode: "same-origin",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch (e) {
    console.error("error revoking all sessions", e);
  }
}

export function isLoggedIn() {
  return isSessionTokenUnexpired() && !!getEncryptedHealthTokenFromStorage();
}

function clearAllAuthTokens() {
  currentHealthAccessToken = null;
  currentDriveAccessToken = null;
  sessionAccessToken = null;
  encryptedHealthRefreshToken = null;
  encryptedDriveRefreshToken = null;
  setGrantedHealthScope(undefined);
  setGrantedDriveScope(undefined);
  getDefaultStore().set(pendingRememberMeChoiceAtom, false);

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STAY_SIGNED_IN_STORAGE_KEY);
  }

  notifyAuthChanged();
}

/**
 * Drop the local encrypted Drive refresh token (memory and localStorage) and
 * the in-memory Drive access token. Does not call Google's revoke endpoint or
 * clear Health/session auth.
 */
export function clearEncryptedDriveAuth() {
  // Invalidate in-flight refreshes first, then drop the token before clearing
  // scopes. Clearing scopes while the token still exists makes settingsStorageAtom
  // treat scopes as "unknown" and call getFreshDriveAccessToken().
  driveAuthGeneration += 1;
  currentDriveAccessToken = null;
  encryptedDriveRefreshToken = null;

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY);
  }

  setGrantedDriveScope(undefined);
  notifyAuthChanged();
}

export const getFreshAccessToken = singleAsync(async () => {
  getSessionTokenOrThrow();

  if (isCachedAccessTokenFresh(currentHealthAccessToken) && currentHealthAccessToken) {
    return currentHealthAccessToken.accessToken;
  }

  if (!getEncryptedHealthTokenFromStorage()) {
    throw new Error("no encrypted token available");
  }

  try {
    return await requestAccessToken();
  } catch (e) {
    console.error("error while refreshing token", e);
    currentHealthAccessToken = null;
    throw e;
  }
});

/** Exchange or reuse the in-memory Google Drive access token. */
export const getFreshDriveAccessToken = singleAsync(async () => {
  getSessionTokenOrThrow();

  if (
    isCachedAccessTokenFresh(currentDriveAccessToken) &&
    currentDriveAccessToken
  ) {
    return currentDriveAccessToken.accessToken;
  }

  if (!getEncryptedDriveTokenFromStorage()) {
    throw new Error("no encrypted drive token available");
  }

  try {
    return await requestDriveAccessToken();
  } catch (e) {
    console.error("error while refreshing drive token", e);
    currentDriveAccessToken = null;
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

/**
 * On page load, exchange a still-valid session for a Google Drive access
 * token when an encrypted drive refresh token is present.
 */
export async function restoreDriveAccessToken() {
  if (!isSessionTokenUnexpired() || !getEncryptedDriveTokenFromStorage()) {
    return;
  }

  try {
    await getFreshDriveAccessToken();
  } catch (error) {
    console.error("error restoring drive access token", error);
  }
}

/** Always exchange the stored encrypted refresh token for a new access token. */
export async function forceTokenRefresh() {
  currentHealthAccessToken = null;
  return requestAccessToken();
}

/** Always exchange the stored encrypted drive refresh token for a new access token. */
export async function forceDriveTokenRefresh() {
  currentDriveAccessToken = null;
  return requestDriveAccessToken();
}

export const authSessionAtom = atom<AuthSession>(getAuthSession());

/** Watch for localStorage and in-memory auth changes. */
export const syncAuthTokenEffect = atomEffect((get, set) => {
  void restoreAccessToken();
  void restoreDriveAccessToken();

  const storageListener = (event: StorageEvent) => {
    if (
      event.key === SESSION_TOKEN_STORAGE_KEY ||
      event.key === ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY ||
      event.key === ENCRYPTED_DRIVE_TOKEN_STORAGE_KEY
    ) {
      // Another tab changed persisted tokens; refresh memory from storage.
      sessionAccessToken = null;
      encryptedHealthRefreshToken = null;
      encryptedDriveRefreshToken = null;
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

function parseScopeSet(scope: string | undefined) {
  return new Set(
    (scope?.split(" ") ?? []).filter((entry) => entry.length > 0),
  );
}

/** Get the full Google Health scope URLs granted for the current access token. */
export function getAccessTokenScopes() {
  return parseScopeSet(getCachedGrantedScope());
}

/** Get the Google Drive scope URLs granted for the current drive access token. */
export function getDriveAccessTokenScopes() {
  return parseScopeSet(getCachedGrantedDriveScope());
}

export function getMissingScopes(requiredScopes: Array<string>) {
  const currentScopes = getAccessTokenScopes();
  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

export function getMissingDriveScopes(requiredScopes: Array<string>) {
  const currentScopes = getDriveAccessTokenScopes();
  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

/** Reactive scopes from the latest access token; updates after token exchange. */
export function useAccessTokenScopes() {
  return parseScopeSet(useAtomValue(grantedScopesAtom));
}

/** Reactive Drive scopes from the latest drive access token. */
export function useDriveAccessTokenScopes() {
  return parseScopeSet(useAtomValue(grantedDriveScopesAtom));
}

/** Reactive missing-scope check; updates after the user grants additional permissions. */
export function useMissingScopes(requiredScopes: Array<string> = []) {
  const currentScopes = useAccessTokenScopes();
  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

/** Reactive missing Drive-scope check. */
export function useMissingDriveScopes(requiredScopes: Array<string> = []) {
  const currentScopes = useDriveAccessTokenScopes();
  return requiredScopes.filter((scope) => !currentScopes.has(scope));
}

export function hasTokenScope(scope: string) {
  return getAccessTokenScopes().has(scope);
}

export function hasDriveTokenScope(scope: string) {
  return getDriveAccessTokenScopes().has(scope);
}

export function useAuthSession() {
  return useAtomValue(authSessionAtom);
}

/** True when a Drive encrypted refresh token is present (live check). */
export function useDriveAuthEnabled() {
  // Re-render when auth session or drive scopes change; read live storage/memory.
  useAtomValue(authSessionAtom);
  useAtomValue(grantedDriveScopesAtom);
  return hasEncryptedDriveToken();
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
