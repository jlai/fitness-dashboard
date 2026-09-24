import {
  MIGRATION_BACKUP_STORAGE_KEY,
  type MigrationFood,
  type MigrationMeal,
} from "@/storage/db/fitbitmigrationdb";
import { readFitbitMigrationSettings } from "@/storage/db/import-from-fitbit-migration";

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

const PUBLIC_FOOD: MigrationFood = {
  accessLevel: "PUBLIC",
  foodId: 80850,
  name: "Scrambled Eggs",
  calories: 147,
  defaultServingSize: 1,
  defaultUnit: SERVING_UNIT,
  unit: SERVING_UNIT,
  units: [SERVING_UNIT],
};

const MEAL: MigrationMeal = {
  id: "1001",
  name: "Breakfast Plate",
  description: "Eggs",
  mealFoods: [
    { ...PUBLIC_FOOD, amount: 1 },
    { ...PRIVATE_FOOD, amount: 2 },
  ],
};

function seedBackup(
  backup: Partial<{
    meals: Array<MigrationMeal>;
    customFoods: Array<MigrationFood>;
    goals: Array<{
      metric: string;
      period: "daily" | "weekly" | "target";
      value: number;
      units?: string;
    }>;
  }>,
) {
  localStorage.setItem(
    MIGRATION_BACKUP_STORAGE_KEY,
    JSON.stringify({
      meals: [],
      customFoods: [],
      goals: [],
      ...backup,
    }),
  );
}

describe("readFitbitMigrationSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty blobs when the backup key is missing", () => {
    expect(readFitbitMigrationSettings()).toEqual({
      clientOnlyGoals: { clientOnlyGoals: [] },
      meals: { meals: [] },
      clientOnlyFoods: { clientOnlyFoods: [] },
    });
  });

  it("returns empty blobs when the backup JSON is invalid", () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, "{not-json");

    expect(readFitbitMigrationSettings()).toEqual({
      clientOnlyGoals: { clientOnlyGoals: [] },
      meals: { meals: [] },
      clientOnlyFoods: { clientOnlyFoods: [] },
    });
  });

  it("converts goals, using units as unit", () => {
    seedBackup({
      goals: [
        { metric: "steps", period: "daily", value: 8000 },
        {
          metric: "distance",
          period: "weekly",
          value: 40,
          units: "kilometers",
        },
      ],
    });

    expect(readFitbitMigrationSettings().clientOnlyGoals).toEqual({
      clientOnlyGoals: [
        { metric: "steps", period: "daily", value: 8000, unit: "" },
        {
          metric: "distance",
          period: "weekly",
          value: 40,
          unit: "kilometers",
        },
      ],
    });
  });

  it("converts custom foods and meals, and includes private meal foods", () => {
    seedBackup({
      customFoods: [PRIVATE_FOOD],
      meals: [MEAL],
    });

    const result = readFitbitMigrationSettings();

    expect(result.meals.meals).toEqual([
      {
        id: "1001",
        name: "Breakfast Plate",
        description: "Eggs",
        foods: [
          {
            foodId: "80850",
            serving: {
              amount: 1,
              foodMeasurementUnit:
                "users/me/dataTypes/food-measurement-unit/dataPoints/304",
              foodMeasurementUnitDisplayName: "serving",
            },
          },
          {
            foodId: "9001",
            serving: {
              amount: 2,
              foodMeasurementUnit:
                "users/me/dataTypes/food-measurement-unit/dataPoints/304",
              foodMeasurementUnitDisplayName: "serving",
            },
          },
        ],
      },
    ]);

    const names = result.clientOnlyFoods.clientOnlyFoods.map((food) => food.name);
    expect(names).toContain("users/me/dataTypes/food/dataPoints/9001");
    expect(names).toHaveLength(1);
  });
});
