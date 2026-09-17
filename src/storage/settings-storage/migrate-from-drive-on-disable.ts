"use client";

import { getDefaultStore } from "jotai";

import {
  getGoogleDriveSettingsStorage,
  getMemorySettingsStorage,
  resetGoogleDriveSettingsStorage,
  settingsStorageEpochAtom,
} from "./backend";
import { SETTINGS_STORAGE_KEYS, type SettingsStorageKey } from "./keys";

export type MigrateFromDriveOnDisableResult = {
  movedKeys: SettingsStorageKey[];
};

const ALL_KEYS = Object.values(SETTINGS_STORAGE_KEYS);

/**
 * Copy every settings blob from Drive into Memory, then delete those files from
 * the Drive app data folder.
 *
 * Callers should then {@link clearEncryptedDriveAuth} and
 * {@link bumpSettingsStorageEpoch} so the backend switches to Memory.
 */
export async function migrateFromDriveOnDisable(): Promise<MigrateFromDriveOnDisableResult> {
  const memory = getMemorySettingsStorage();
  const drive = getGoogleDriveSettingsStorage();
  const movedKeys: SettingsStorageKey[] = [];

  for (const key of ALL_KEYS) {
    const stored = await drive.get(key);
    if (!stored) {
      continue;
    }
    await memory.set(key, stored.data, stored.version);
    await drive.delete(key);
    movedKeys.push(key);
  }

  resetGoogleDriveSettingsStorage();

  return { movedKeys };
}

/** Bump the settings storage epoch so jotai blob atoms reload. */
export function bumpSettingsStorageEpoch() {
  getDefaultStore().set(settingsStorageEpochAtom, (epoch) => epoch + 1);
}
