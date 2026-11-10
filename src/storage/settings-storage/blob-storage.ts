import type { ZodType } from "zod";

import { logError } from "@/utils/log-error";

import type { SettingsStorage, StoredData } from "./types";

type DefaultData<T> = T | (() => T);

export type SettingsBlobOptions<TData> = {
  key: string;
  schema: ZodType<StoredData<TData>>;
  defaultData: DefaultData<TData>;
  version?: number;
  migrate?: (
    stored: StoredData<unknown>,
    storage: SettingsStorage,
  ) => Promise<StoredData<TData>> | StoredData<TData>;
};

export function resolveDefault<T>(defaultData: DefaultData<T>): T {
  return typeof defaultData === "function"
    ? (defaultData as () => T)()
    : structuredClone(defaultData);
}

const inflightLoads = new WeakMap<
  SettingsStorage,
  Map<string, Promise<unknown>>
>();

/** Share the entire read/migrate/validate/persist operation with dependent blobs. */
export function loadSettingsBlob<TData>(
  storage: SettingsStorage,
  opts: SettingsBlobOptions<TData>,
): Promise<TData> {
  let byKey = inflightLoads.get(storage);
  if (!byKey) {
    byKey = new Map();
    inflightLoads.set(storage, byKey);
  }

  const existing = byKey.get(opts.key);
  if (existing) {
    return existing as Promise<TData>;
  }

  const promise = (async () => {
    try {
      const stored = await storage.get(opts.key);
      if (!stored) {
        return resolveDefault(opts.defaultData);
      }

      const version = opts.version ?? 1;
      if (stored.version > version) {
        throw new Error(`Unsupported settings version ${stored.version}`);
      }
      const needsMigration = stored.version < version;
      if (needsMigration && !opts.migrate) {
        throw new Error(`No migration from settings version ${stored.version}`);
      }
      const migrated = needsMigration
        ? await opts.migrate!(stored, storage)
        : stored;
      const parsed = opts.schema.safeParse(migrated);
      if (!parsed.success) {
        logError(`Invalid settings data for key "${opts.key}"`, parsed.error);
        return resolveDefault(opts.defaultData);
      }

      if (needsMigration) {
        await storage.set(opts.key, parsed.data.data, version);
      }
      return parsed.data.data;
    } catch (error) {
      logError(`Failed to load settings key "${opts.key}"`, error);
      return resolveDefault(opts.defaultData);
    }
  })().finally(() => {
    byKey.delete(opts.key);
  });
  byKey.set(opts.key, promise);
  return promise;
}
