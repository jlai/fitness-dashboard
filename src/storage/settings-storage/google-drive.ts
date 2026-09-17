"use client";

import { debounce, type DebouncedFunction } from "es-toolkit";

import {
  createAppDataFile,
  deleteAppDataFile,
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

/** Delay before persisting a settings key to Drive after the last write. */
export const DRIVE_SETTINGS_WRITE_DEBOUNCE_MS = 5_000;

type CacheEntry =
  | { kind: "present"; value: StoredData<unknown>; fileId?: string }
  | { kind: "missing" };

/**
 * SettingsStorage backed by the Google Drive application data folder.
 * Each key maps to `{key}.json`; invalid keys throw.
 * Caches each key on first read and updates the cache on write.
 * Drive API writes are debounced per key to avoid repeated uploads.
 */
export class GoogleDriveSettingsStorage implements SettingsStorage {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly dirtyKeys = new Set<string>();
  private readonly debouncers = new Map<string, DebouncedFunction<() => void>>();
  private readonly inflightPersists = new Map<string, Promise<void>>();
  /** Bumped to abandon in-flight / scheduled persists (e.g. on disable). */
  private writeGeneration = 0;

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
    const fileName = settingsKeyToFileName(key);

    let fileId = existing?.fileId;
    if (!fileId && this.cache.get(key)?.kind !== "missing") {
      fileId = (await getAppDataFileByName(fileName))?.id;
    }

    this.cache.set(key, {
      kind: "present",
      value: stored,
      fileId,
    });
    this.dirtyKeys.add(key);
    this.schedulePersist(key);
    return stored;
  }

  async delete(key: string): Promise<void> {
    assertValidSettingsKey(key);

    this.cancelPersist(key);

    const inflight = this.inflightPersists.get(key);
    if (inflight) {
      await inflight.catch(() => undefined);
    }

    const cached = this.cache.get(key);
    let fileId =
      cached?.kind === "present" ? cached.fileId : undefined;

    if (!fileId && cached?.kind !== "missing") {
      fileId = (await getAppDataFileByName(settingsKeyToFileName(key)))?.id;
    }

    if (fileId) {
      await deleteAppDataFile(fileId);
    }

    this.cache.set(key, { kind: "missing" });
  }

  /**
   * Immediately persist all dirty keys and wait for in-flight Drive writes.
   * Used after reconcile so memory→Drive copies land before the flow returns.
   */
  async flush(): Promise<void> {
    for (let i = 0; i < 5 && this.dirtyKeys.size > 0; i++) {
      for (const key of [...this.dirtyKeys]) {
        this.debouncers.get(key)?.flush();
      }
      await Promise.allSettled([...this.inflightPersists.values()]);
    }
  }

  /**
   * Cancel scheduled writes and bump generation so in-flight persists no-op
   * before hitting the network when possible. Call before tearing down.
   */
  invalidatePendingWrites(): void {
    this.writeGeneration += 1;
    for (const debounced of this.debouncers.values()) {
      debounced.cancel();
    }
    this.dirtyKeys.clear();
  }

  /** Wait for any in-flight Drive requests to settle. */
  async waitForInflightWrites(): Promise<void> {
    await Promise.allSettled([...this.inflightPersists.values()]);
  }

  private schedulePersist(key: string): void {
    let debounced = this.debouncers.get(key);
    if (!debounced) {
      debounced = debounce(() => {
        this.startPersist(key);
      }, DRIVE_SETTINGS_WRITE_DEBOUNCE_MS);
      this.debouncers.set(key, debounced);
    }
    debounced();
  }

  private cancelPersist(key: string): void {
    this.debouncers.get(key)?.cancel();
    this.dirtyKeys.delete(key);
  }

  private startPersist(key: string): void {
    if (!this.dirtyKeys.has(key)) {
      return;
    }

    const cached = this.cache.get(key);
    if (cached?.kind !== "present") {
      this.dirtyKeys.delete(key);
      return;
    }

    this.dirtyKeys.delete(key);
    const stored = cached.value;
    const generation = this.writeGeneration;

    const run = async () => {
      await this.persistToDrive(key, stored, generation);
    };

    const previous = this.inflightPersists.get(key) ?? Promise.resolve();
    const next = previous.then(run, run).finally(() => {
      if (this.inflightPersists.get(key) === next) {
        this.inflightPersists.delete(key);
      }
    });
    this.inflightPersists.set(key, next);
  }

  private async persistToDrive(
    key: string,
    stored: StoredData<unknown>,
    generation: number,
  ): Promise<void> {
    if (generation !== this.writeGeneration) {
      return;
    }

    const content = JSON.stringify(stored);
    const fileName = settingsKeyToFileName(key);

    let fileId: string | undefined;
    const cached = this.cache.get(key);
    if (cached?.kind === "present" && cached.fileId) {
      fileId = cached.fileId;
    } else if (cached?.kind !== "missing") {
      fileId = (await getAppDataFileByName(fileName))?.id;
    }

    if (generation !== this.writeGeneration) {
      return;
    }

    try {
      if (fileId) {
        await updateAppDataFile(fileId, content);
      } else {
        const created = await createAppDataFile(fileName, content);
        fileId = created.id;
      }
    } catch (error) {
      console.error(`Failed to persist settings key "${key}" to Drive`, error);
      if (
        generation === this.writeGeneration &&
        !this.dirtyKeys.has(key)
      ) {
        const latest = this.cache.get(key);
        if (latest?.kind === "present") {
          this.dirtyKeys.add(key);
          this.schedulePersist(key);
        }
      }
      return;
    }

    if (generation !== this.writeGeneration) {
      return;
    }

    const latest = this.cache.get(key);
    if (latest?.kind === "present" && fileId) {
      this.cache.set(key, { ...latest, fileId });
    }

    if (this.dirtyKeys.has(key)) {
      this.schedulePersist(key);
    }
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
