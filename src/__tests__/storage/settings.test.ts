import { createStore, getDefaultStore, type Atom } from "jotai";
import { RESET } from "jotai/utils";

import {
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
} from "@/api/user";
import {
  distanceUnitAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterUnitAtom,
  weightUnitAtom,
  staySignedInAtom,
  getStaySignedIn,
  clearStaySignedIn,
  STAY_SIGNED_IN_STORAGE_KEY,
} from "@/storage/settings";

function readMounted<T>(atom: Atom<T>): T {
  const store = createStore();
  const unsub = store.sub(atom, () => {});
  try {
    return store.get(atom);
  } finally {
    unsub();
  }
}

describe("unit storage key migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("copies Fitbit locale values from unit:* to units:*", () => {
    localStorage.setItem("unit:weight", JSON.stringify("en_US"));
    localStorage.setItem("unit:water", JSON.stringify("METRIC"));
    localStorage.setItem("unit:distance", JSON.stringify("en_US"));
    localStorage.setItem("unit:swim", JSON.stringify("METRIC"));
    localStorage.setItem("unit:temperature", JSON.stringify("en_US"));

    expect(readMounted(weightUnitAtom)).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_POUNDS,
    );
    expect(readMounted(waterUnitAtom)).toBe(SettingsWaterUnit.WATER_UNIT_ML);
    expect(readMounted(distanceUnitAtom)).toBe(
      SettingsDistanceUnit.DISTANCE_UNIT_MILES,
    );
    expect(readMounted(swimUnitAtom)).toBe(SettingsSwimUnit.SWIM_UNIT_METERS);
    expect(readMounted(temperatureUnitAtom)).toBe(
      SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT,
    );

    expect(localStorage.getItem("units:weight")).toBe(
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_POUNDS),
    );
    expect(localStorage.getItem("units:water")).toBe(
      JSON.stringify(SettingsWaterUnit.WATER_UNIT_ML),
    );
    expect(localStorage.getItem("units:distance")).toBe(
      JSON.stringify(SettingsDistanceUnit.DISTANCE_UNIT_MILES),
    );
    expect(localStorage.getItem("units:swim")).toBe(
      JSON.stringify(SettingsSwimUnit.SWIM_UNIT_METERS),
    );
    expect(localStorage.getItem("units:temperature")).toBe(
      JSON.stringify(SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT),
    );

    expect(localStorage.getItem("unit:weight")).toBeNull();
    expect(localStorage.getItem("unit:water")).toBeNull();
    expect(localStorage.getItem("unit:distance")).toBeNull();
    expect(localStorage.getItem("unit:swim")).toBeNull();
    expect(localStorage.getItem("unit:temperature")).toBeNull();
  });

  it("copies already-canonical values from unit:* to units:*", () => {
    localStorage.setItem(
      "unit:weight",
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_STONE),
    );

    expect(readMounted(weightUnitAtom)).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_STONE,
    );
    expect(localStorage.getItem("units:weight")).toBe(
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_STONE),
    );
    expect(localStorage.getItem("unit:weight")).toBeNull();
  });

  it("prefers units:* when both keys exist", () => {
    localStorage.setItem(
      "units:weight",
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS),
    );
    localStorage.setItem(
      "unit:weight",
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_POUNDS),
    );

    expect(readMounted(weightUnitAtom)).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
    );
    expect(localStorage.getItem("unit:weight")).toBe(
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_POUNDS),
    );
  });
});

describe("stay signed in", () => {
  beforeEach(() => {
    localStorage.clear();
    getDefaultStore().set(staySignedInAtom, RESET);
  });

  it("defaults to false", () => {
    expect(getStaySignedIn()).toBe(false);
    expect(readMounted(staySignedInAtom)).toBe(false);
  });

  it("reads true from localStorage", () => {
    localStorage.setItem(STAY_SIGNED_IN_STORAGE_KEY, JSON.stringify(true));
    expect(getStaySignedIn()).toBe(true);
    expect(readMounted(staySignedInAtom)).toBe(true);
  });

  it("clears the stored preference", () => {
    getDefaultStore().set(staySignedInAtom, true);
    expect(localStorage.getItem(STAY_SIGNED_IN_STORAGE_KEY)).toBe(
      JSON.stringify(true),
    );

    clearStaySignedIn();

    expect(getStaySignedIn()).toBe(false);
    expect(getDefaultStore().get(staySignedInAtom)).toBe(false);
    expect(localStorage.getItem(STAY_SIGNED_IN_STORAGE_KEY)).toBeNull();
  });
});
