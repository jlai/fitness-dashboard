import { createStore, type Atom } from "jotai";

import {
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
} from "@/api/user";
import {
  distanceUnitAtom,
  DEFAULT_DISTANCE_GOAL,
  DEFAULT_WATER_GOAL,
  distanceGoalAtom,
  stepsGoalAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterGoalAtom,
  weeklyWaterGoalAtom,
  waterUnitAtom,
  weightUnitAtom,
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

describe("custom goal settings storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default values for individual goal atoms", () => {
    expect(readMounted(stepsGoalAtom)).toBe(10_000);
    expect(readMounted(distanceGoalAtom)).toEqual(DEFAULT_DISTANCE_GOAL);
    expect(readMounted(waterGoalAtom)).toEqual(DEFAULT_WATER_GOAL);
    expect(readMounted(weeklyWaterGoalAtom)).toEqual({
      value: 14_000,
      unit: SettingsWaterUnit.WATER_UNIT_ML,
    });
  });
});
