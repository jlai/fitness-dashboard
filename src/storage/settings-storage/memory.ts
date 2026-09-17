import {
  assertValidSettingsKey,
  type SettingsStorage,
  type StoredData,
  wrapStoredData,
} from "./types";

/** In-memory SettingsStorage for tests and ephemeral backends. */
export class MemorySettingsStorage implements SettingsStorage {
  private readonly store = new Map<string, StoredData<unknown>>();

  /** Synchronously seed a key (tests / e2e init). */
  seedSync<T>(key: string, data: T, version = 1): StoredData<T> {
    assertValidSettingsKey(key);
    const stored = wrapStoredData(data, version);
    this.store.set(key, stored);
    return stored;
  }

  async get<T>(key: string): Promise<StoredData<T> | null> {
    assertValidSettingsKey(key);
    const value = this.store.get(key);
    return value ? (value as StoredData<T>) : null;
  }

  async set<T>(
    key: string,
    data: T,
    version?: number,
  ): Promise<StoredData<T>> {
    assertValidSettingsKey(key);
    const existing = this.store.get(key);
    const resolvedVersion = version ?? existing?.version ?? 1;
    const stored = wrapStoredData(data, resolvedVersion);
    this.store.set(key, stored);
    return stored;
  }

  async delete(key: string): Promise<void> {
    assertValidSettingsKey(key);
    this.store.delete(key);
  }
}
