import { NutritionLogMealType } from "@generated/orval/fetch/google-health-api/models";

import { writableNutritionLog } from "@/api/nutrition/food-log";

const interval = {
  startTime: "2026-06-16T12:00:00.000Z",
  endTime: "2026-06-16T12:00:01.000Z",
};

describe("writableNutritionLog", () => {
  it("keeps only identified-food fields when a food resource is present", () => {
    expect(
      writableNutritionLog(
        {
          food: "users/me/dataTypes/food/dataPoints/80850",
          foodDisplayName: "Scrambled Eggs",
          mealType: NutritionLogMealType.BREAKFAST,
          energy: { kcal: 147 },
          energyFromFat: { kcal: 90 },
          totalCarbohydrate: { grams: 8.52 },
          totalFat: { grams: 9.21 },
          nutrients: [{ nutrient: "PROTEIN", quantity: { grams: 10 } }],
          serving: {
            amount: 1,
            foodMeasurementUnit:
              "users/me/dataTypes/food-measurement-unit/dataPoints/304",
            foodMeasurementUnitDisplayName: "serving",
          },
        },
        interval,
      ),
    ).toEqual({
      interval,
      food: "users/me/dataTypes/food/dataPoints/80850",
      mealType: NutritionLogMealType.BREAKFAST,
      serving: {
        amount: 1,
        foodMeasurementUnit:
          "users/me/dataTypes/food-measurement-unit/dataPoints/304",
      },
    });
  });

  it("keeps display name and nutrients for anonymous food", () => {
    expect(
      writableNutritionLog(
        {
          foodDisplayName: "Grilled Chicken Breast",
          mealType: NutritionLogMealType.DINNER,
          energy: { kcal: 165 },
          totalCarbohydrate: { grams: 0 },
          totalFat: { grams: 3.6 },
          nutrients: [{ nutrient: "PROTEIN", quantity: { grams: 31 } }],
          serving: { amount: 1, foodMeasurementUnitDisplayName: "serving" },
        },
        interval,
      ),
    ).toEqual({
      interval,
      mealType: NutritionLogMealType.DINNER,
      serving: { amount: 1 },
      foodDisplayName: "Grilled Chicken Breast",
      energy: { kcal: 165 },
      totalCarbohydrate: { grams: 0 },
      totalFat: { grams: 3.6 },
      nutrients: [{ nutrient: "PROTEIN", quantity: { grams: 31 } }],
    });
  });
});
