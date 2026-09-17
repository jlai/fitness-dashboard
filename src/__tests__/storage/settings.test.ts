import { createStore, type Atom } from "jotai";

import { SettingsWeightUnit } from "@/api/user";
import {
  settingsBlobAtom,
  weightUnitAtom,
} from "@/storage/settings";
import { resetSettingsStorageSingletonsForTests } from "@/storage/settings-storage";

async function readAsync<T>(atom: Atom<T | Promise<T>>): Promise<T> {
  const store = createStore();
  const unsub = store.sub(atom, () => {});
  try {
    return await store.get(atom);
  } finally {
    unsub();
  }
}

describe("settings field atoms", () => {
  beforeEach(() => {
    resetSettingsStorageSingletonsForTests();
    localStorage.clear();
  });

  it("defaults unit prefs to undefined (no localStorage migration)", async () => {
    localStorage.setItem("unit:weight", JSON.stringify("en_US"));
    localStorage.setItem(
      "units:weight",
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_POUNDS),
    );

    expect(await readAsync(weightUnitAtom)).toBeUndefined();
  });

  it("reads and writes weight unit through the settings blob", async () => {
    const store = createStore();
    await store.set(weightUnitAtom, SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS);

    expect(await store.get(weightUnitAtom)).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
    );

    const blob = await store.get(settingsBlobAtom);
    expect(blob.settings.weightUnit).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
    );
  });
});
