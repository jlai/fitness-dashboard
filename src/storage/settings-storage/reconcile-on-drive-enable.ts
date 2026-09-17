"use client";

import { getDefaultStore } from "jotai";

import {
  getGoogleDriveSettingsStorage,
  getMemorySettingsStorage,
  settingsStorageEpochAtom,
} from "./backend";
import { SETTINGS_STORAGE_KEYS, type SettingsStorageKey } from "./keys";
import type { SettingsStorage } from "./types";

export type DriveEnableConflictChoice = "memory" | "drive";

export type KeyPresence = {
  key: SettingsStorageKey;
  inMemory: boolean;
  inDrive: boolean;
};

export type ReconcileOnDriveEnableResult = {
  memoryOnly: SettingsStorageKey[];
  driveOnly: SettingsStorageKey[];
  conflicts: SettingsStorageKey[];
  conflictChoice: DriveEnableConflictChoice | null;
};

const ALL_KEYS = Object.values(SETTINGS_STORAGE_KEYS);

async function readPresence(
  memory: SettingsStorage,
  drive: SettingsStorage,
): Promise<KeyPresence[]> {
  return Promise.all(
    ALL_KEYS.map(async (key) => {
      const [memoryValue, driveValue] = await Promise.all([
        memory.get(key),
        drive.get(key),
      ]);
      return {
        key,
        inMemory: memoryValue !== null,
        inDrive: driveValue !== null,
      };
    }),
  );
}

async function copyEnvelope(
  from: SettingsStorage,
  to: SettingsStorage,
  key: SettingsStorageKey,
): Promise<void> {
  const stored = await from.get(key);
  if (!stored) {
    return;
  }
  await to.set(key, stored.data, stored.version);
}

/**
 * After Drive scope is granted, merge session Memory settings with Drive.
 * - Memory only → copy to Drive
 * - Drive only → copy to Memory
 * - Both → ask once which side wins for every conflicting key
 *
 * Bumps {@link settingsStorageEpochAtom} so jotai blob atoms reload.
 */
export async function reconcileMemoryAndDriveOnEnable(options: {
  resolveConflicts: (
    conflictingKeys: SettingsStorageKey[],
  ) => Promise<DriveEnableConflictChoice>;
}): Promise<ReconcileOnDriveEnableResult> {
  const memory = getMemorySettingsStorage();
  const drive = getGoogleDriveSettingsStorage();
  const presence = await readPresence(memory, drive);

  const memoryOnly = presence
    .filter((entry) => entry.inMemory && !entry.inDrive)
    .map((entry) => entry.key);
  const driveOnly = presence
    .filter((entry) => entry.inDrive && !entry.inMemory)
    .map((entry) => entry.key);
  const conflicts = presence
    .filter((entry) => entry.inMemory && entry.inDrive)
    .map((entry) => entry.key);

  for (const key of memoryOnly) {
    await copyEnvelope(memory, drive, key);
  }

  for (const key of driveOnly) {
    await copyEnvelope(drive, memory, key);
  }

  let conflictChoice: DriveEnableConflictChoice | null = null;
  if (conflicts.length > 0) {
    conflictChoice = await options.resolveConflicts(conflicts);
    if (conflictChoice === "memory") {
      for (const key of conflicts) {
        await copyEnvelope(memory, drive, key);
      }
    } else {
      for (const key of conflicts) {
        await copyEnvelope(drive, memory, key);
      }
    }
  }

  // Debounced Drive writes must land before this flow returns.
  await drive.flush();

  getDefaultStore().set(settingsStorageEpochAtom, (epoch) => epoch + 1);

  return { memoryOnly, driveOnly, conflicts, conflictChoice };
}

/** Human-readable labels for conflict prompts. */
export function settingsStorageKeyLabel(key: SettingsStorageKey): string {
  switch (key) {
    case "dashboards":
      return "dashboards";
    case "goals":
      return "goals";
    case "meals":
      return "meals";
    case "custom-foods":
      return "custom foods";
    case "settings":
      return "settings";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
