import { createStore } from "jotai";

import { SettingsDistanceUnit } from "@/api/user";
import { migrationGoalToClientGoal } from "@/storage/db/import-from-fitbit-migration";
import { getGoalsAtom, clientOnlyGoalsAtom } from "@/storage/goals";
import { resetSettingsStorageSingletonsForTests } from "@/storage/settings-storage";

describe("migrationGoalToClientGoal", () => {
  it("copies metric, period, and value, using units as unit", () => {
    expect(
      migrationGoalToClientGoal({
        metric: "distance",
        period: "daily",
        value: 5,
        units: "kilometers",
      }),
    ).toEqual({
      metric: "distance",
      period: "daily",
      value: 5,
      unit: "kilometers",
    });
  });

  it("uses an empty unit when Fitbit stored none", () => {
    expect(
      migrationGoalToClientGoal({
        metric: "steps",
        period: "daily",
        value: 10000,
      }),
    ).toEqual({
      metric: "steps",
      period: "daily",
      value: 10000,
      unit: "",
    });
  });
});

describe("getGoalsAtom", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsStorageSingletonsForTests();
  });

  it("returns undefined when no goal is stored and ignores localStorage", async () => {
    localStorage.setItem("goals:steps", "99999");
    localStorage.setItem(
      "goals:distance",
      JSON.stringify({
        value: 1,
        unit: SettingsDistanceUnit.DISTANCE_UNIT_MILES,
      }),
    );

    const store = createStore();
    const stepsAtom = getGoalsAtom("steps", "daily");

    expect(await store.get(stepsAtom)).toBeUndefined();
    expect(await store.get(getGoalsAtom("distance", "daily"))).toBeUndefined();
    expect(
      await store.get(getGoalsAtom("waterVolume", "weekly")),
    ).toBeUndefined();
  });

  it("reads and writes a ClientGoal through the clientOnlyGoals blob", async () => {
    const store = createStore();
    const stepsAtom = getGoalsAtom("steps", "daily");

    await store.set(stepsAtom, { value: 7500, unit: "" });

    expect(await store.get(stepsAtom)).toEqual({
      metric: "steps",
      period: "daily",
      value: 7500,
      unit: "",
    });

    const blob = await store.get(clientOnlyGoalsAtom);
    expect(blob.clientOnlyGoals).toContainEqual({
      metric: "steps",
      period: "daily",
      value: 7500,
      unit: "",
    });
  });
});
