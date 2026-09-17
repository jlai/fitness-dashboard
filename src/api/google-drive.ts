"use client";

import { getFreshDriveAccessToken } from "./auth";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFileRef {
  id: string;
  name: string;
}

export class GoogleDriveError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GoogleDriveError";
    this.status = status;
  }
}

async function authorizedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getFreshDriveAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new GoogleDriveError(
      response.status,
      `Google Drive API error (${response.status}): ${errorText || response.statusText}`,
    );
  }

  return response;
}

/**
 * Look up a file in the application data folder by exact filename.
 * Filenames must come from validated settings keys (e.g. `meals.json`).
 */
export async function getAppDataFileByName(
  fileName: string,
): Promise<DriveFileRef | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${fileName}'`,
    fields: "files(id,name)",
    pageSize: "1",
  });

  const response = await authorizedFetch(
    `${DRIVE_API_BASE}/files?${params.toString()}`,
  );
  const body = (await response.json()) as { files?: DriveFileRef[] };
  const file = body.files?.[0];
  return file?.id ? file : null;
}

/** Download file contents from Drive. */
export async function downloadAppDataFile(fileId: string): Promise<string> {
  const response = await authorizedFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
  );
  return response.text();
}

/** Create a JSON file in the application data folder. */
export async function createAppDataFile(
  fileName: string,
  content: string,
): Promise<DriveFileRef> {
  const metadata = JSON.stringify({
    name: fileName,
    parents: ["appDataFolder"],
  });

  const boundary = `boundary_${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const response = await authorizedFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  return (await response.json()) as DriveFileRef;
}

/** Replace the media content of an existing Drive file. */
export async function updateAppDataFile(
  fileId: string,
  content: string,
): Promise<DriveFileRef> {
  const response = await authorizedFetch(
    `${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: content,
    },
  );

  return (await response.json()) as DriveFileRef;
}

/** Permanently delete a file from Drive (used for app data settings files). */
export async function deleteAppDataFile(fileId: string): Promise<void> {
  await authorizedFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" },
  );
}
