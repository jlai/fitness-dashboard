import { createStore } from "jotai";

import { SettingsDistanceUnit } from "@/api/user";
import { db as dashDb } from "@/storage/db/dashdb";
import { db as fitbitMigrationDb } from "@/storage/db/fitbitmigrationdb";
import {
  importFromFitbitMigrationDb,
  migrationGoalToClientGoal,
  resetImportFromFitbitMigrationDb,
} from "@/storage/db/import-from-fitbit-migration";
import { getGoalsAtom, goalsAtom } from "@/storage/goals";
import { resetSettingsStorageSingletonsForTests } from "@/storage/settings-storage";

async function resetDatabases() {
  resetImportFromFitbitMigrationDb();
  await dashDb.delete();
  await fitbitMigrationDb.delete();
  await dashDb.open();
  await fitbitMigrationDb.open();
}

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

describe("importFromFitbitMigrationDb goals", () => {
  beforeEach(async () => {
    await resetDatabases();
  });

  it("copies missing goals from FitbitMigrationDB", async () => {
    await fitbitMigrationDb.goals.bulkPut([
      {
        metric: "steps",
        period: "daily",
        value: 8000,
      },
      {
        metric: "distance",
        period: "weekly",
        value: 40,
        units: "kilometers",
      },
    ]);

    await importFromFitbitMigrationDb();

    expect(await dashDb.clientOnlyGoals.get(["steps", "daily"])).toEqual({
      metric: "steps",
      period: "daily",
      value: 8000,
      unit: "",
    });
    expect(await dashDb.clientOnlyGoals.get(["distance", "weekly"])).toEqual({
      metric: "distance",
      period: "weekly",
      value: 40,
      unit: "kilometers",
    });
  });

  it("does not overwrite goals already in dashdb", async () => {
    await dashDb.clientOnlyGoals.put({
      metric: "steps",
      period: "daily",
      value: 12000,
      unit: "steps",
    });
    await fitbitMigrationDb.goals.put({
      metric: "steps",
      period: "daily",
      value: 8000,
    });

    await importFromFitbitMigrationDb();

    expect(await dashDb.clientOnlyGoals.get(["steps", "daily"])).toEqual({
      metric: "steps",
      period: "daily",
      value: 12000,
      unit: "steps",
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

  it("reads and writes a ClientGoal through the goals blob", async () => {
    const store = createStore();
    const stepsAtom = getGoalsAtom("steps", "daily");

    await store.set(stepsAtom, { value: 7500, unit: "" });

    expect(await store.get(stepsAtom)).toEqual({
      metric: "steps",
      period: "daily",
      value: 7500,
      unit: "",
    });

    const blob = await store.get(goalsAtom);
    expect(blob.goals).toContainEqual({
      metric: "steps",
      period: "daily",
      value: 7500,
      unit: "",
    });
  });
});
