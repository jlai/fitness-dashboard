"use client";

import {
  createAppDataFile,
  downloadAppDataFile,
  getAppDataFileByName,
  updateAppDataFile,
} from "@/api/google-drive";

import {
  assertValidSettingsKey,
  parseStoredData,
  settingsKeyToFileName,
  type SettingsStorage,
  type StoredData,
  wrapStoredData,
} from "./types";

type CacheEntry =
  | { kind: "present"; value: StoredData<unknown>; fileId: string }
  | { kind: "missing" };

/**
 * SettingsStorage backed by the Google Drive application data folder.
 * Each key maps to `{key}.json`; invalid keys throw.
 * Caches each key on first read and updates the cache on write.
 */
export class GoogleDriveSettingsStorage implements SettingsStorage {
  private readonly cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<StoredData<T> | null> {
    assertValidSettingsKey(key);

    const cached = this.cache.get(key);
    if (cached) {
      return cached.kind === "present"
        ? (cached.value as StoredData<T>)
        : null;
    }

    const file = await getAppDataFileByName(settingsKeyToFileName(key));
    if (!file) {
      this.cache.set(key, { kind: "missing" });
      return null;
    }

    const raw = await downloadAppDataFile(file.id);
    const parsed = parseStoredData<T>(JSON.parse(raw));
    this.cache.set(key, {
      kind: "present",
      value: parsed,
      fileId: file.id,
    });
    return parsed;
  }

  async set<T>(
    key: string,
    data: T,
    version?: number,
  ): Promise<StoredData<T>> {
    assertValidSettingsKey(key);

    const existing = await this.getExistingForVersion(key);
    const resolvedVersion = version ?? existing?.version ?? 1;
    const stored = wrapStoredData(data, resolvedVersion);
    const content = JSON.stringify(stored);
    const fileName = settingsKeyToFileName(key);

    let fileId = existing?.fileId;
    if (!fileId && this.cache.get(key)?.kind !== "missing") {
      fileId = (await getAppDataFileByName(fileName))?.id;
    }

    if (fileId) {
      await updateAppDataFile(fileId, content);
    } else {
      const created = await createAppDataFile(fileName, content);
      fileId = created.id;
    }

    this.cache.set(key, {
      kind: "present",
      value: stored,
      fileId,
    });
    return stored;
  }

  private async getExistingForVersion(
    key: string,
  ): Promise<{ version: number; fileId?: string } | null> {
    const cached = this.cache.get(key);
    if (cached?.kind === "present") {
      return { version: cached.value.version, fileId: cached.fileId };
    }
    if (cached?.kind === "missing") {
      return null;
    }

    const current = await this.get(key);
    if (!current) {
      return null;
    }
    const present = this.cache.get(key);
    return {
      version: current.version,
      fileId: present?.kind === "present" ? present.fileId : undefined,
    };
  }
}
