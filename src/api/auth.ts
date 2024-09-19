"use client";

import { atom, useAtomValue } from "jotai";
import {
  OAuth2Client,
  OAuth2Token,
  generateCodeVerifier,
} from "@badgateway/oauth2-client";
import { atomEffect } from "jotai-effect";
import { JwtPayload, jwtDecode } from "jwt-decode";

import { singleAsync } from "@/utils/async";
import {
  FITBIT_OAUTH_SERVER,
  FITBIT_OAUTH_CLIENT_ID,
  FITBIT_OAUTH_AUTHORIZATION_ENDPOINT,
  OAUTH_CALLBACK_URI,
} from "@/config";

// Refresh when token is expiring soon
const EXPIRING_SOON_MILLIS = 2 * 60 * 1000;

const SCOPES = [
  "activity",
  "heartrate",
  "location",
  "nutrition",
  "profile",
  "settings",
  "sleep",
  "weight",
];

const ADVANCED_SCOPES = [
  "oxygen_saturation",
  "respiratory_rate",
  "temperature",
  "cardio_fitness",
];

const FITBIT_TOKEN_STORAGE_KEY = "auth:fitbit-token";
const PKCE_CODEVERIFIER_STORAGE_KEY = "auth:pkce-codeverifier";
const AUTH_TOKEN_UPDATE_EVENT_TYPE = "authtokenupdated";

const authClient = new OAuth2Client({
  server: FITBIT_OAUTH_SERVER,
  clientId: FITBIT_OAUTH_CLIENT_ID,
  authorizationEndpoint: FITBIT_OAUTH_AUTHORIZATION_ENDPOINT,
  revocationEndpoint: "/oauth2/revoke",
  tokenEndpoint: "/oauth2/token",
});

/** Redirect to Fitbit account login */
export async function redirectToLogin({
  prompt = "none",
  requestAdvancedScopes = false,
}: {
  /** see https://dev.fitbit.com/build/reference/web-api/authorization/authorize/ */
  prompt?: string;
  requestAdvancedScopes?: boolean;
} = {}) {
  const codeVerifier = await generateCodeVerifier();

  sessionStorage.setItem(PKCE_CODEVERIFIER_STORAGE_KEY, codeVerifier);

  const url = await authClient.authorizationCode.getAuthorizeUri({
    redirectUri: OAUTH_CALLBACK_URI!,
    scope: requestAdvancedScopes ? [...SCOPES, ...ADVANCED_SCOPES] : SCOPES,
    codeVerifier,
    extraParams: {
      prompt,
    },
  });

  document.location = url;
}

export async function handleAuthCallback() {
  const codeVerifier =
    sessionStorage.getItem(PKCE_CODEVERIFIER_STORAGE_KEY) ?? undefined;

  // Remove code to avoid race conditions caused by React StrictMode
  // (while in dev mode) which triggers double requests. We'll just ignore the
  // second attempt.
  sessionStorage.removeItem(PKCE_CODEVERIFIER_STORAGE_KEY);

  if (!codeVerifier) {
    return;
  }

  const token = await authClient.authorizationCode.getTokenFromCodeRedirect(
    document.location.href,
    {
      redirectUri: OAUTH_CALLBACK_URI,
      codeVerifier,
    }
  );

  saveTokenToStorage(token);
}

export async function logout() {
  clearToken();
}

/** Revoke all access tokens for the developer application, and reset consent. */
export async function revokeAuthorization() {
  const token = getTokenFromStorage();

  if (token) {
    try {
      await authClient.revoke(token, "refresh_token");
    } catch (e) {
      if (e instanceof Error && !/HTTP Error 404/.test(e.message)) {
        console.error("error revoking token", e);
      }
    }

    clearToken();
  }
}

function getTokenFromStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const tokenString = localStorage.getItem(FITBIT_TOKEN_STORAGE_KEY);
  const token: OAuth2Token | null = tokenString
    ? JSON.parse(tokenString)
    : null;

  return token;
}

export function isLoggedIn() {
  return !!getTokenFromStorage();
}

function saveTokenToStorage(token: OAuth2Token) {
  localStorage.setItem(FITBIT_TOKEN_STORAGE_KEY, JSON.stringify(token));

  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATE_EVENT_TYPE));
}

function clearToken() {
  localStorage.removeItem(FITBIT_TOKEN_STORAGE_KEY);

  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATE_EVENT_TYPE));
}

export const getFreshAccessToken = singleAsync(async () => {
  let token = getTokenFromStorage();

  if (!token) {
    throw new Error("no access token available");
  }

  if (token.expiresAt && token.expiresAt < Date.now() - EXPIRING_SOON_MILLIS) {
    try {
      token = await authClient.refreshToken(token);
    } catch (e) {
      console.error("error while refreshing token", e);

      if (e instanceof Error && /HTTP Error 4\d\d/.test(e.message)) {
        clearToken();
      }

      throw e;
    }
    saveTokenToStorage(token);
  }

  return token.accessToken;
});

/**
 * This is a copy of the Fitbit token wrapped in an atom, which allows us to
 * observe changes such as getting logged out, userId changes, etc.
 */
const fitbitTokenAtom = atom<OAuth2Token | null>(getTokenFromStorage());

/** Watch for localStorage changes from other windows. */
export const syncFitbitTokenEffect = atomEffect((get, set) => {
  const storageListener = (event: StorageEvent) => {
    if (event.key === FITBIT_TOKEN_STORAGE_KEY) {
      const token = getTokenFromStorage();

      set(fitbitTokenAtom, token);
    }
  };

  // Events fired from dispatchEvent
  const updateListener = () => {
    const token = getTokenFromStorage();
    set(fitbitTokenAtom, token);
  };

  window.addEventListener("storage", storageListener);
  window.addEventListener(AUTH_TOKEN_UPDATE_EVENT_TYPE, updateListener);

  return () => {
    window.removeEventListener("storage", storageListener);
    window.removeEventListener(AUTH_TOKEN_UPDATE_EVENT_TYPE, updateListener);
  };
});

type FitbitJwtPayload = JwtPayload & {
  scopes?: string;
};

/**
 * Get scopes for the current access token. Note that these use an internal name
 * like 'wpro' rather than the public scope name 'profile'.
 */
export function getAccessTokenScopes() {
  const token = getTokenFromStorage();
  const accessToken =
    token && (jwtDecode(token.accessToken) as FitbitJwtPayload);

  return new Set(accessToken?.scopes?.split(" ") ?? []);
}

export function getMissingScopes(requiredScopes: Array<string>) {
  const currentScopes = getAccessTokenScopes();
  return requiredScopes.filter(
    (scope) => !currentScopes.has(scope) && !currentScopes.has(`w${scope}`)
  );
}

export function hasTokenScope(scope: string) {
  const currentScopes = getAccessTokenScopes();
  return currentScopes.has(scope) || currentScopes.has(`w${scope}`);
}

export const rawUserIdAtom = atom((get) => {
  const accessToken = get(fitbitTokenAtom)?.accessToken;
  return accessToken ? jwtDecode(accessToken).sub : undefined;
});

export const userIdAtom = atom((get) => {
  const userId = get(rawUserIdAtom);

  if (!userId) {
    throw new Error("no token available");
  }

  return userId;
});

export function useLoggedIn() {
  const token = useAtomValue(fitbitTokenAtom);
  return !!token;
}
