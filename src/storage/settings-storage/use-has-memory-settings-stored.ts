"use client";

import { useSyncExternalStore } from "react";

import { getMemorySettingsStorage } from "./backend";

function subscribe(onStoreChange: () => void) {
  return getMemorySettingsStorage().subscribe(onStoreChange);
}

function getSnapshot() {
  return getMemorySettingsStorage().hasStoredData();
}

function getServerSnapshot() {
  return false;
}

/** True when MemorySettingsStorage has any keys written this session. */
export function useHasMemorySettingsStored() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
