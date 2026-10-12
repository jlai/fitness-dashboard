"use client";

import { withBasePath } from "@/config";
import { REQUESTED_DRIVE_SCOPES } from "@/config/google-drive-scopes";

import {
  applyDriveTokenResponse,
  getEncryptedDriveTokenFromStorage,
  postSessionJson,
} from "./auth";
import { useGoogleCodeAuthorization } from "./google-code-authorization";

const DRIVE_AUTHORIZE_PATH = withBasePath("/auth/drive/authorize");

async function exchangeCodeForDriveToken(code: string) {
  const payload = await postSessionJson(DRIVE_AUTHORIZE_PATH, { code });

  applyDriveTokenResponse(payload);

  if (!getEncryptedDriveTokenFromStorage()) {
    throw new Error("no drive refresh token returned");
  }

  return payload;
}

/**
 * Prompt the user to authorize Google Drive via GIS CodeClient, then send the
 * code to the server to encrypt a Drive-only refresh token.
 *
 * Requests {@link REQUESTED_DRIVE_SCOPES} (openid, profile, email, and Drive
 * app data) and does not include previously granted scopes. openid is required
 * so the token response includes an id_token for the signed-in account.
 */
export function useGoogleDriveAuthorization({
  selectAccount = false,
}: {
  /** Also prompt the user to pick which Google account to use. */
  selectAccount?: boolean;
} = {}) {
  const { requestAuthorization, ready } = useGoogleCodeAuthorization({
    scopes: REQUESTED_DRIVE_SCOPES,
    selectAccount,
    failureLog: "error starting drive authorization flow",
    failureToast: "Unable to reach Google to authorize Drive",
    exchangeCode: exchangeCodeForDriveToken,
  });

  return { authorizeGoogleDrive: requestAuthorization, ready };
}
