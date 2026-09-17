"use client";

import { atom, type WritableAtom } from "jotai";
import { RESET } from "jotai/utils";
import type { ZodType } from "zod";

import { settingsStorageAtom, settingsStorageEpochAtom } from "./backend";
import {
  wrapStoredData,
  type SettingsStorage,
  type StoredData,
} from "./types";

type DefaultData<T> = T | (() => T);

type Update<T> = T | ((prev: T) => T) | typeof RESET;

function resolveDefault<T>(defaultData: DefaultData<T>): T {
  return typeof defaultData === "function"
    ? (defaultData as () => T)()
    : structuredClone(defaultData);
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

function validateOrDefault<TData>(
  stored: StoredData<unknown> | null,
  schema: ZodType<StoredData<TData>>,
  defaultData: DefaultData<TData>,
  key: string,
): TData {
  if (!stored) {
    return resolveDefault(defaultData);
  }

  const parsed = schema.safeParse(stored);
  if (!parsed.success) {
    console.error(`Invalid settings data for key "${key}"`, parsed.error);
    return resolveDefault(defaultData);
  }

  return parsed.data.data;
}

type CacheEntry<TData> = {
  backend: SettingsStorage;
  value: TData | Promise<TData>;
  epoch: number;
};

const inflightLoads = new WeakMap<
  SettingsStorage,
  Map<string, Promise<unknown>>
>();

function dedupedLoad<T>(
  storage: SettingsStorage,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  let byKey = inflightLoads.get(storage);
  if (!byKey) {
    byKey = new Map();
    inflightLoads.set(storage, byKey);
  }

  const existing = byKey.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = loader().finally(() => {
    byKey!.delete(key);
  });
  byKey.set(key, promise);
  return promise;
}

/**
 * Async/Suspense-friendly atom backed by SettingsStorage.
 * Reads validate with Zod (fallback to defaults). Writes validate and throw.
 */
export function createSettingsBlobAtom<TData>(opts: {
  key: string;
  schema: ZodType<StoredData<TData>>;
  defaultData: DefaultData<TData>;
  version?: number;
}): WritableAtom<TData | Promise<TData>, [Update<TData>], Promise<void>> {
  const version = opts.version ?? 1;
  const cacheAtom = atom<CacheEntry<TData> | null>(null);

  const loadFromStorage = (
    storage: SettingsStorage,
  ): Promise<TData> =>
    dedupedLoad(storage, opts.key, async () => {
      try {
        const stored = await storage.get(opts.key);
        return validateOrDefault(
          stored,
          opts.schema,
          opts.defaultData,
          opts.key,
        );
      } catch (error) {
        console.error(`Failed to load settings key "${opts.key}"`, error);
        return resolveDefault(opts.defaultData);
      }
    });

  return atom(
    (get) => {
      get(settingsStorageEpochAtom);
      const storageOrPromise = get(settingsStorageAtom);
      const cached = get(cacheAtom);

      if (isPromiseLike(storageOrPromise)) {
        return storageOrPromise.then(async (storage) => {
          const latest = get(cacheAtom);
          const epoch = get(settingsStorageEpochAtom);
          if (
            latest &&
            latest.backend === storage &&
            latest.epoch === epoch
          ) {
            return latest.value;
          }
          return loadFromStorage(storage);
        });
      }

      const epoch = get(settingsStorageEpochAtom);
      if (
        cached &&
        cached.backend === storageOrPromise &&
        cached.epoch === epoch
      ) {
        return cached.value;
      }

      return loadFromStorage(storageOrPromise);
    },
    async (get, set, update: Update<TData>) => {
      const storage = await get(settingsStorageAtom);
      const epoch = get(settingsStorageEpochAtom);
      const cached = get(cacheAtom);

      let prev: TData;
      if (cached && cached.backend === storage && cached.epoch === epoch) {
        prev = await cached.value;
      } else {
        prev = await loadFromStorage(storage);
      }

      const next =
        update === RESET
          ? resolveDefault(opts.defaultData)
          : typeof update === "function"
            ? (update as (prev: TData) => TData)(prev)
            : update;

      const envelope = wrapStoredData(next, version);
      opts.schema.parse(envelope);
      await storage.set(opts.key, next, version);
      set(cacheAtom, {
        backend: storage,
        value: next,
        epoch: get(settingsStorageEpochAtom),
      });
    },
  );
}
