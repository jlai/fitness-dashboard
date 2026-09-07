import type {
  MigrationFood,
  MigrationMeal,
} from "@/storage/db/fitbitmigrationdb";
import {
  migrationFoodToDataPoint,
  migrationMealToClientOnlyMeal,
  privateMigrationFoodsFromMeal,
} from "@/storage/db/fitbit-to-health";

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
  nutritionalValues: {
    calories: 147,
    protein: 10.55,
    sodium: 339,
  },
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

describe("migrationFoodToDataPoint", () => {
  it("keeps Fitbit food and unit ids as Health datapoint ids", () => {
    const dataPoint = migrationFoodToDataPoint(PRIVATE_FOOD);

    expect(dataPoint.name).toBe("users/me/dataTypes/food/dataPoints/9001");
    expect(dataPoint.food.displayName).toBe("Homemade Scramble");
    expect(dataPoint.food.defaultServing?.foodMeasurementUnit).toBe(
      "users/me/dataTypes/food-measurement-unit/dataPoints/304",
    );
    expect(dataPoint.food.energyAvg).toEqual({ kcal: 147 });
  });
});

describe("migrationMealToClientOnlyMeal", () => {
  it("stores food ids with nutrition-log servings", () => {
    expect(migrationMealToClientOnlyMeal(MEAL)).toEqual({
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
    });
  });
});

describe("privateMigrationFoodsFromMeal", () => {
  it("returns private foods that should be copied into clientOnlyFoods", () => {
    expect(privateMigrationFoodsFromMeal(MEAL)).toEqual([
      { ...PRIVATE_FOOD, amount: 2 },
    ]);
  });
});
