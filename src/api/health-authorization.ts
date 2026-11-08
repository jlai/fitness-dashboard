"use client";

import { withBasePath } from "@/config";
import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

import {
  applyHealthTokenResponse,
  getEncryptedHealthTokenFromStorage,
  postSessionJson,
} from "./auth";
import { useGoogleCodeAuthorization } from "./google-code-authorization";

const HEALTH_AUTHORIZE_PATH = withBasePath("/auth/health/authorize");

async function exchangeCodeForHealthToken(code: string) {
  const payload = await postSessionJson(HEALTH_AUTHORIZE_PATH, { code });

  applyHealthTokenResponse(payload);

  if (!getEncryptedHealthTokenFromStorage()) {
    throw new Error("no refresh token returned");
  }

  return payload;
}

/**
 * Prompt the user to authorize Google Health via GIS CodeClient, then send the
 * code to the server to encrypt the refresh token.
 *
 * Always requests {@link REQUESTED_SCOPES} (openid + all Health permissions)
 * and never includes previously granted scopes. Google Health rejects mixed
 * scope sets (e.g. Drive) even when those were granted earlier.
 */
export function useGoogleHealthAuthorization({
  selectAccount = false,
}: {
  /** Also prompt the user to pick which Google account to use. */
  selectAccount?: boolean;
} = {}) {
  const { requestAuthorization, ready } = useGoogleCodeAuthorization({
    scopes: REQUESTED_SCOPES,
    selectAccount,
    failureLog: "error starting login flow",
    failureToast: "Unable to reach Google to sign in",
    exchangeCode: exchangeCodeForHealthToken,
  });

  return { loginToGoogleAndAuthorize: requestAuthorization, ready };
}
