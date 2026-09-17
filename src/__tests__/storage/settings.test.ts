import { createStore, type Atom } from "jotai";

import {
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
} from "@/api/user";
import {
  clearUnitSettingsAtom,
  distanceUnitAtom,
  settingsBlobAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterUnitAtom,
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

  it("clears all unit overrides in a single write", async () => {
    const store = createStore();

    await store.set(distanceUnitAtom, SettingsDistanceUnit.DISTANCE_UNIT_MILES);
    await store.set(swimUnitAtom, SettingsSwimUnit.SWIM_UNIT_YARDS);
    await store.set(
      temperatureUnitAtom,
      SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT,
    );
    await store.set(weightUnitAtom, SettingsWeightUnit.WEIGHT_UNIT_POUNDS);
    await store.set(waterUnitAtom, SettingsWaterUnit.WATER_UNIT_FL_OZ);

    await store.set(clearUnitSettingsAtom);

    const blob = await store.get(settingsBlobAtom);
    expect(blob.settings.distanceUnit).toBeUndefined();
    expect(blob.settings.swimUnit).toBeUndefined();
    expect(blob.settings.temperatureUnit).toBeUndefined();
    expect(blob.settings.weightUnit).toBeUndefined();
    expect(blob.settings.waterUnit).toBeUndefined();
  });
});
