/**
 * Google Drive OAuth scopes used for application data storage.
 * See https://developers.google.com/workspace/drive/api/guides/appdata
 */

export const DRIVE_APPDATA =
  "https://www.googleapis.com/auth/drive.appdata";

/** Scopes requested for the separate Google Drive auth token. */
export const REQUESTED_DRIVE_SCOPES = [DRIVE_APPDATA] as const;
