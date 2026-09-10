"use client";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const LOAD_TIMEOUT_MS = 15000;

let loadingOAuth2: Promise<typeof google.accounts.oauth2> | undefined;

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

/**
 * Return Google's Identity Services authorization API once the GSI script
 * (loaded by GoogleOAuthProvider) is available.
 */
export function loadGoogleOAuth2() {
  return waitForGoogleApi(getGoogleOAuth2, loadingOAuth2, (promise) => {
    loadingOAuth2 = promise;
  });
}
