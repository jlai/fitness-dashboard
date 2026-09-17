/** Envelope stored for each settings key. Version is bumped only for breaking changes. */
export interface StoredData<T> {
  data: T;
  version: number;
  updateTime: string;
}

/** Read/write settings by key across different backends. */
export interface SettingsStorage {
  get<T>(key: string): Promise<StoredData<T> | null>;
  set<T>(key: string, data: T, version?: number): Promise<StoredData<T>>;
}

const KEY_PATTERN = /^[a-z0-9-]+$/;

export function assertValidSettingsKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(
      `invalid settings key "${key}": must match /^[a-z0-9-]+$/`,
    );
  }
}

export function settingsKeyToFileName(key: string): string {
  assertValidSettingsKey(key);
  return `${key}.json`;
}

export function isStoredDataEnvelope(value: unknown): value is StoredData<unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    "data" in record &&
    typeof record.version === "number" &&
    Number.isFinite(record.version) &&
    typeof record.updateTime === "string"
  );
}

export function parseStoredData<T>(value: unknown): StoredData<T> {
  if (!isStoredDataEnvelope(value)) {
    throw new Error("invalid StoredData envelope");
  }

  return value as StoredData<T>;
}

export function wrapStoredData<T>(
  data: T,
  version: number,
  updateTime: string = new Date().toISOString(),
): StoredData<T> {
  return { data, version, updateTime };
}
