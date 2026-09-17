"use client";

import { atom } from "jotai";

import {
  authSessionAtom,
  getFreshDriveAccessToken,
  getGrantedDriveScopesRaw,
  grantedDriveScopesAtom,
  hasEncryptedDriveToken,
  isLoggedIn,
} from "@/api/auth";
import { DRIVE_APPDATA } from "@/config/google-drive-scopes";

import { GoogleDriveSettingsStorage } from "./google-drive";
import { MemorySettingsStorage } from "./memory";
import { type SettingsStorage, type StoredData } from "./types";

declare global {
  interface Window {
    /** Playwright / test seed applied once when the Memory backend is created. */
    __SETTINGS_STORAGE_SEED__?: Record<string, unknown>;
  }
}

let memorySettingsStorage: MemorySettingsStorage | undefined;
let googleDriveSettingsStorage: GoogleDriveSettingsStorage | undefined;

/** Bumped after Drive enable merge so blob atoms drop stale caches and reload. */
export const settingsStorageEpochAtom = atom(0);

function applyTestSeed(storage: MemorySettingsStorage) {
  if (typeof window === "undefined") {
    return;
  }

  const seed = window.__SETTINGS_STORAGE_SEED__;
  if (!seed || typeof seed !== "object") {
    return;
  }

  for (const [key, data] of Object.entries(seed)) {
    if (
      data !== null &&
      typeof data === "object" &&
      "data" in data &&
      "version" in data &&
      "updateTime" in data
    ) {
      const envelope = data as StoredData<unknown>;
      storage.seedSync(key, envelope.data, envelope.version);
    } else {
      storage.seedSync(key, data);
    }
  }
}

/** Session-scoped MemorySettingsStorage singleton. */
export function getMemorySettingsStorage(): MemorySettingsStorage {
  if (!memorySettingsStorage) {
    memorySettingsStorage = new MemorySettingsStorage();
    applyTestSeed(memorySettingsStorage);
  }
  return memorySettingsStorage;
}

/** Process-scoped GoogleDriveSettingsStorage singleton (caches file ids). */
export function getGoogleDriveSettingsStorage(): GoogleDriveSettingsStorage {
  if (!googleDriveSettingsStorage) {
    googleDriveSettingsStorage = new GoogleDriveSettingsStorage();
  }
  return googleDriveSettingsStorage;
}

/** Drop the Drive singleton so the next enable starts with a cold cache. */
export function resetGoogleDriveSettingsStorage() {
  googleDriveSettingsStorage?.invalidatePendingWrites();
  googleDriveSettingsStorage = undefined;
}

/** Reset singletons — for unit tests only. */
export function resetSettingsStorageSingletonsForTests() {
  memorySettingsStorage = undefined;
  googleDriveSettingsStorage?.invalidatePendingWrites();
  googleDriveSettingsStorage = undefined;
}

function scopesIncludeDrive(scope: string | undefined) {
  if (!scope) {
    return false;
  }
  return scope.split(" ").includes(DRIVE_APPDATA);
}

/**
 * Resolves the SettingsStorage backend for the current session.
 * Drive when logged in with a Drive token that includes drive.appdata;
 * otherwise the Memory singleton.
 * When a Drive token exists but scopes are not yet known, waits for a token exchange.
 */
export const settingsStorageAtom = atom(async (get): Promise<SettingsStorage> => {
  get(authSessionAtom);
  get(grantedDriveScopesAtom);
  get(settingsStorageEpochAtom);

  if (!isLoggedIn() || !hasEncryptedDriveToken()) {
    return getMemorySettingsStorage();
  }

  let scopes = getGrantedDriveScopesRaw();
  if (scopes === undefined) {
    try {
      await getFreshDriveAccessToken();
    } catch {
      // Token may not be available yet; fall through to Memory.
    }
    scopes = getGrantedDriveScopesRaw();
  }

  if (scopesIncludeDrive(scopes)) {
    return getGoogleDriveSettingsStorage();
  }

  return getMemorySettingsStorage();
});
