import { getDefaultStore } from "jotai";

import { SettingsWeightUnit } from "@/api/user";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import {
  MIGRATION_BACKUP_STORAGE_KEY,
  parseMigrationBackupFile,
  type MigrationFood,
} from "@/storage/db/fitbitmigrationdb";
import { clientOnlyGoalsAtom } from "@/storage/goals";
import { mealsAtom } from "@/storage/meals";
import { settingsBlobAtom } from "@/storage/settings";
import {
  resetSettingsStorageSingletonsForTests,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";
import {
  importFitbitMigrationFile,
  importLegacySettings,
} from "@/storage/settings-storage/migrate-from-legacy";
import { dashboardsAtom } from "@/storage/tiles";

const SERVING_UNIT = { id: 304, name: "serving", plural: "servings" };

const PRIVATE_FOOD: MigrationFood = {
  accessLevel: "PRIVATE",
  foodId: 9001,
  name: "Homemade Scramble",
  calories: 147,
  defaultServingSize: 1,
  defaultUnit: SERVING_UNIT,
  unit: SERVING_UNIT,
  units: [SERVING_UNIT],
};

const LEGACY_TILES = [
  {
    id: "legacy-graph",
    type: "graph",
    x: 2,
    y: 1,
    w: 3,
    h: 2,
    settings: { defaultTab: "week" },
  },
];

const EMPTY_BACKUP = { customFoods: [], meals: [], goals: [] };

describe("importLegacySettings", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsStorageSingletonsForTests();
    const store = getDefaultStore();
    store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  });

  it("imports prefs, dashboard tiles, and the Fitbit localStorage backup", async () => {
    localStorage.setItem(
      "units:weight",
      JSON.stringify(SettingsWeightUnit.WEIGHT_UNIT_POUNDS),
    );
    localStorage.setItem("dashboard-tiles", JSON.stringify(LEGACY_TILES));
    localStorage.setItem(
      MIGRATION_BACKUP_STORAGE_KEY,
      JSON.stringify({
        customFoods: [PRIVATE_FOOD],
        meals: [
          {
            id: "1001",
            name: "Breakfast Plate",
            description: "Eggs",
            mealFoods: [{ ...PRIVATE_FOOD, amount: 1 }],
          },
        ],
        goals: [{ metric: "steps", period: "daily", value: 8000 }],
      }),
    );

    await importLegacySettings();

    const store = getDefaultStore();
    const settings = await store.get(settingsBlobAtom);
    const dashboards = await store.get(dashboardsAtom);
    const goals = await store.get(clientOnlyGoalsAtom);
    const meals = await store.get(mealsAtom);
    const foods = await store.get(clientOnlyFoodsAtom);

    expect(settings.settings.weightUnit).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_POUNDS,
    );
    expect(dashboards.dashboards[0]?.tiles).toEqual(LEGACY_TILES);
    expect(goals.clientOnlyGoals).toEqual([
      { metric: "steps", period: "daily", value: 8000, unit: "" },
    ]);
    expect(meals.meals).toEqual([
      {
        id: "1001",
        name: "Breakfast Plate",
        description: "Eggs",
        foods: [
          {
            food: "users/me/dataTypes/food/dataPoints/9001",
            serving: {
              amount: 1,
              foodMeasurementUnit:
                "users/me/dataTypes/food-measurement-unit/dataPoints/304",
              foodMeasurementUnitDisplayName: "serving",
            },
          },
        ],
      },
    ]);
    expect(foods.clientOnlyFoods.map((food) => food.customFood)).toEqual([
      "users/me/dataTypes/food/dataPoints/9001",
    ]);
  });

  it("imports locally saved dashboard tiles with a JSON backup", async () => {
    const store = getDefaultStore();
    const otherDashboard = {
      id: "other",
      name: "Other",
      tiles: [{ id: "water", type: "water", w: 1, h: 1 }],
    };
    await store.set(dashboardsAtom, {
      dashboards: [{ id: "main", name: "Main", tiles: [] }, otherDashboard],
    });
    localStorage.setItem("dashboard-tiles", JSON.stringify(LEGACY_TILES));

    await importFitbitMigrationFile(EMPTY_BACKUP);

    expect((await store.get(dashboardsAtom)).dashboards).toEqual([
      { id: "main", name: "Main", tiles: LEGACY_TILES },
      otherDashboard,
    ]);
  });

  it.each([
    ["browser", () => importLegacySettings()],
    ["file", () => importFitbitMigrationFile(EMPTY_BACKUP)],
  ])(
    "imports an intentionally empty dashboard from a %s backup",
    async (_, importBackup) => {
      localStorage.setItem("dashboard-tiles", "[]");

      await importBackup();

      expect(
        (await getDefaultStore().get(dashboardsAtom)).dashboards[0]?.tiles,
      ).toEqual([]);
    },
  );

  it.each([
    ["browser", () => importLegacySettings()],
    ["file", () => importFitbitMigrationFile(EMPTY_BACKUP)],
  ])(
    "rejects malformed local tiles before importing a %s backup",
    async (_, importBackup) => {
      const store = getDefaultStore();
      const dashboardsBefore = await store.get(dashboardsAtom);
      const goalsBefore = await store.get(clientOnlyGoalsAtom);
      localStorage.setItem("dashboard-tiles", JSON.stringify([{ id: "bad" }]));

      await expect(importBackup()).rejects.toThrow(
        "The dashboard tiles saved in this browser are invalid.",
      );
      expect(await store.get(dashboardsAtom)).toEqual(dashboardsBefore);
      expect(await store.get(clientOnlyGoalsAtom)).toEqual(goalsBefore);
    },
  );

  it("imports a file's foods, numeric meal IDs and goals without changing settings or dashboards", async () => {
    const store = getDefaultStore();
    const settingsBefore = await store.get(settingsBlobAtom);
    const dashboardsBefore = await store.get(dashboardsAtom);
    const backup = parseMigrationBackupFile(
      JSON.stringify({
        customFoods: [PRIVATE_FOOD],
        meals: [
          {
            id: 123,
            name: "Sample meal",
            description: "",
            mealFoods: [{ ...PRIVATE_FOOD, amount: 2 }],
          },
        ],
        goals: [{ metric: "steps", period: "daily", value: 5000 }],
      }),
    );

    await importFitbitMigrationFile(backup);

    expect(await store.get(settingsBlobAtom)).toEqual(settingsBefore);
    expect(await store.get(dashboardsAtom)).toEqual(dashboardsBefore);
    expect((await store.get(mealsAtom)).meals[0]).toMatchObject({
      id: "123",
      foods: [
        {
          food: "users/me/dataTypes/food/dataPoints/9001",
          serving: { amount: 2 },
        },
      ],
    });
    expect((await store.get(clientOnlyFoodsAtom)).clientOnlyFoods).toHaveLength(
      1,
    );
    expect((await store.get(clientOnlyGoalsAtom)).clientOnlyGoals).toEqual([
      { metric: "steps", period: "daily", value: 5000, unit: "" },
    ]);
  });
});
