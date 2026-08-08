"use client";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const LOAD_TIMEOUT_MS = 15000;

let loading: Promise<typeof google.accounts.oauth2> | undefined;

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
  const oauth2 = getGoogleOAuth2();

  if (oauth2) {
    return Promise.resolve(oauth2);
  }

  loading ??= new Promise<typeof google.accounts.oauth2>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      loading = undefined;
      reject(new Error("error loading Google Identity Services"));
    }, LOAD_TIMEOUT_MS);

    const interval = window.setInterval(() => {
      const loaded = getGoogleOAuth2();

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
      loading = undefined;
      reject(new Error("error loading Google Identity Services"));
    };

    script?.addEventListener("error", onError, { once: true });

    function cleanup() {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      script?.removeEventListener("error", onError);
    }
  });

  return loading;
}
