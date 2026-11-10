"use client";

import { atom, type WritableAtom } from "jotai";
import { RESET } from "jotai/utils";

import { settingsStorageAtom, settingsStorageEpochAtom } from "./backend";
import {
  loadSettingsBlob,
  resolveDefault,
  type SettingsBlobOptions,
} from "./blob-storage";
import { wrapStoredData, type SettingsStorage } from "./types";

type Update<T> = T | ((prev: T) => T) | typeof RESET;

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

type CacheEntry<TData> = {
  backend: SettingsStorage;
  source: SettingsStorage | Promise<SettingsStorage>;
  value: TData | Promise<TData>;
  epoch: number;
};

/**
 * Async/Suspense-friendly atom backed by SettingsStorage.
 * Reads validate with Zod (fallback to defaults). Writes validate and throw.
 */
export function createSettingsBlobAtom<TData>(
  opts: SettingsBlobOptions<TData>,
): WritableAtom<TData | Promise<TData>, [Update<TData>], Promise<void>> {
  const version = opts.version ?? 1;
  const cacheAtom = atom<CacheEntry<TData> | null>(null);

  const loadFromStorage = (storage: SettingsStorage): Promise<TData> =>
    loadSettingsBlob(storage, opts);

  return atom(
    (get) => {
      const epoch = get(settingsStorageEpochAtom);
      const storageOrPromise = get(settingsStorageAtom);
      const cached = get(cacheAtom);

      // Prefer a warm sync cache so writes don't push dependents back into a
      // pending Promise (which remounts UI that holds local state, e.g. dialogs).
      // A new backend promise must resolve before we can reuse the old cache.
      if (
        cached &&
        cached.epoch === epoch &&
        cached.source === storageOrPromise &&
        !isPromiseLike(cached.value)
      ) {
        return cached.value;
      }

      if (isPromiseLike(storageOrPromise)) {
        return storageOrPromise.then(async (storage) => {
          const latest = get(cacheAtom);
          const latestEpoch = get(settingsStorageEpochAtom);
          if (
            latest &&
            latest.backend === storage &&
            latest.epoch === latestEpoch
          ) {
            return latest.value;
          }
          return loadFromStorage(storage);
        });
      }

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
      const source = get(settingsStorageAtom);
      const epoch = get(settingsStorageEpochAtom);
      const storage = await source;
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
        source,
        value: next,
        epoch,
      });
    },
  );
}
