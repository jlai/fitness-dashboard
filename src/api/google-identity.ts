"use client";

import { useEffect, useState } from "react";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const LOAD_TIMEOUT_MS = 15000;

let loadingOAuth2: Promise<typeof google.accounts.oauth2> | undefined;
let loadingId: Promise<typeof google.accounts.id> | undefined;
let googleIdInitialized = false;
let idTokenCallback: google.accounts.id.IdConfiguration["callback"];

/**
 * GIS only honors the last `google.accounts.id.initialize()` call. Keep the
 * credential handler in a ref so React remounts can update it without
 * initializing again.
 */
export function setGoogleIdTokenCallback(
  callback: google.accounts.id.IdConfiguration["callback"],
) {
  idTokenCallback = callback;
}

/** Inject the GSI script once. Pass a CSP nonce on first insert. */
export function ensureGsiScript(nonce?: string) {
  if (typeof document === "undefined") {
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="${GSI_SCRIPT_URL}"]`,
  );

  if (existing) {
    return existing;
  }

  const script = document.createElement("script");
  script.src = GSI_SCRIPT_URL;
  script.async = true;
  script.defer = true;

  if (nonce) {
    script.nonce = nonce;
  }

  document.head.appendChild(script);
  return script;
}

function waitForGoogleApi<T>(
  getApi: () => T | undefined,
  loading: Promise<T> | undefined,
  setLoading: (promise: Promise<T> | undefined) => void,
): Promise<T> {
  const api = getApi();

  if (api) {
    return Promise.resolve(api);
  }

  if (loading) {
    return loading;
  }

  ensureGsiScript();

  const pending = new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      setLoading(undefined);
      reject(new Error("error loading Google Identity Services"));
    }, LOAD_TIMEOUT_MS);

    const interval = window.setInterval(() => {
      const loaded = getApi();

      if (loaded) {
        cleanup();
        resolve(loaded);
      }
    }, 50);

    const script = document.querySelector<HTMLScriptElement>(
      `script[src^="${GSI_SCRIPT_URL}"]`,
    );

    const onError = () => {
      cleanup();
      setLoading(undefined);
      reject(new Error("error loading Google Identity Services"));
    };

    script?.addEventListener("error", onError, { once: true });

    function cleanup() {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      script?.removeEventListener("error", onError);
    }
  });

  setLoading(pending);
  return pending;
}

function getGoogleOAuth2() {
  if (typeof google !== "undefined" && google.accounts?.oauth2) {
    return google.accounts.oauth2;
  }
}

function getGoogleAccountsId() {
  if (typeof google !== "undefined" && google.accounts?.id) {
    return google.accounts.id;
  }
}

/**
 * Return Google's Identity Services authorization API once the GSI script
 * is available.
 */
export function loadGoogleOAuth2() {
  return waitForGoogleApi(getGoogleOAuth2, loadingOAuth2, (promise) => {
    loadingOAuth2 = promise;
  });
}

/** Return Google's Identity Services Sign In With Google API. */
export function loadGoogleAccountsId() {
  return waitForGoogleApi(getGoogleAccountsId, loadingId, (promise) => {
    loadingId = promise;
  });
}

/**
 * Initialize `google.accounts.id` at most once for this page. Later calls
 * reuse the existing instance and only update the credential callback.
 */
export async function initializeGoogleId(
  config: Omit<google.accounts.id.IdConfiguration, "callback">,
) {
  const id = await loadGoogleAccountsId();

  if (!googleIdInitialized) {
    id.initialize({
      ...config,
      callback: (response) => {
        idTokenCallback?.(response);
      },
    });
    googleIdInitialized = true;
  }

  return id;
}

/** Record a site sign-out so One Tap does not immediately sign the user back in. */
export function disableGoogleAutoSelect() {
  getGoogleAccountsId()?.disableAutoSelect();
}

/** True once the GSI script has exposed `google.accounts.oauth2`. */
export function useGoogleIdentityReady() {
  const [ready, setReady] = useState(() => Boolean(getGoogleOAuth2()));

  useEffect(() => {
    let cancelled = false;

    loadGoogleOAuth2()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

/** Reset module state between tests. */
export function resetGoogleIdentityState() {
  loadingOAuth2 = undefined;
  loadingId = undefined;
  googleIdInitialized = false;
  idTokenCallback = undefined;
}
