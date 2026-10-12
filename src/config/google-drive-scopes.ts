/**
 * Google Drive OAuth scopes used for application data storage.
 * See https://developers.google.com/workspace/drive/api/guides/appdata
 *
 * openid, profile, and email are requested so Google returns an id_token
 * the server can check against the signed-in account.
 */

export const DRIVE_APPDATA = "https://www.googleapis.com/auth/drive.appdata";

/** Scopes requested for the separate Google Drive auth token. */
export const REQUESTED_DRIVE_SCOPES = [
  "openid",
  "profile",
  "email",
  DRIVE_APPDATA,
] as const;
