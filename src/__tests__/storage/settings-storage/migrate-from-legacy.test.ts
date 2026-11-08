import { getDefaultStore } from "jotai";

import { SettingsWeightUnit } from "@/api/user";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import {
  MIGRATION_BACKUP_STORAGE_KEY,
  type MigrationFood,
} from "@/storage/db/fitbitmigrationdb";
import { clientOnlyGoalsAtom } from "@/storage/goals";
import { mealsAtom } from "@/storage/meals";
import { settingsBlobAtom } from "@/storage/settings";
import {
  resetSettingsStorageSingletonsForTests,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";
import { importLegacySettings } from "@/storage/settings-storage/migrate-from-legacy";
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
    localStorage.setItem(
      "dashboard-tiles",
      JSON.stringify([{ id: "legacy-steps", type: "gaugeSteps", w: 2, h: 2 }]),
    );
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
    expect(dashboards.dashboards[0]?.tiles).toEqual([
      { id: "legacy-steps", type: "gaugeSteps", w: 2, h: 2 },
    ]);
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
            foodId: "9001",
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
    expect(foods.clientOnlyFoods.map((food) => food.name)).toEqual([
      "users/me/dataTypes/food/dataPoints/9001",
    ]);
  });
});
