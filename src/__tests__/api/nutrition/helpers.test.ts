import {
  FoodAccessLevel,
  NutrientQuantityNutrient,
  NutritionLogMealType,
} from "@generated/orval/fetch/google-health-api/models";

import { MealType } from "@/api/nutrition/types";
import {
  mapFoodDataPoint,
  mapFoodMeasurementUnit,
  mapNutrientQuantities,
  getDataPointIdFromName,
  nutritionLogDay,
  nutritionLogMacros,
  nutritionLogServingUnit,
  summarizeNutritionLogs,
  toNutritionLogMealType,
} from "@/api/nutrition/helpers";

describe("getDataPointIdFromName", () => {
  it("parses the last path segment", () => {
    expect(
      getDataPointIdFromName("users/me/dataTypes/food/dataPoints/80850"),
    ).toBe("80850");
  });

  it("keeps non-numeric ids as strings", () => {
    expect(
      getDataPointIdFromName(
        "users/me/dataTypes/food/dataPoints/banana-split",
      ),
    ).toBe("banana-split");
  });
});

describe("mapFoodMeasurementUnit", () => {
  it("maps display names and the data point id", () => {
    expect(
      mapFoodMeasurementUnit({
        name: "users/me/dataTypes/food-measurement-unit/dataPoints/147",
        foodMeasurementUnit: {
          displayName: "gram",
          pluralDisplayName: "grams",
        },
      }),
    ).toEqual({
      id: "147",
      name: "gram",
      plural: "grams",
    });
  });
});

describe("mapNutrientQuantities", () => {
  it("converts gram quantities into Fitbit-style units", () => {
    expect(
      mapNutrientQuantities([
        {
          nutrient: NutrientQuantityNutrient.PROTEIN,
          quantity: { grams: 31 },
        },
        {
          nutrient: NutrientQuantityNutrient.SODIUM,
          quantity: { grams: 0.074 },
        },
        {
          nutrient: NutrientQuantityNutrient.CARBOHYDRATES,
          quantity: { grams: 12 },
        },
      ]),
    ).toEqual({
      protein: 31,
      sodium: 74,
      carbs: 12,
      totalCarbohydrate: 12,
    });
  });
});

describe("mapFoodDataPoint", () => {
  it("maps catalog food fields used by the existing UI", () => {
    expect(
      mapFoodDataPoint({
        name: "users/me/dataTypes/food/dataPoints/80850",
        food: {
          accessLevel: FoodAccessLevel.FOOD_ACCESS_LEVEL_PUBLIC,
          displayName: "Scrambled Eggs",
          brand: "Home",
          languageCode: "en-US",
          energyAvg: { kcal: 180 },
          energyFromFat: { kcal: 120 },
          totalCarbohydrate: { grams: 2 },
          totalFat: { grams: 13 },
          defaultServing: {
            amount: 1,
            multiplier: 1,
            foodMeasurementUnit:
              "users/me/dataTypes/food-measurement-unit/dataPoints/304",
            foodMeasurementUnitDisplayName: "serving",
            foodMeasurementUnitDisplayNamePlural: "servings",
          },
          servings: [
            {
              amount: 1,
              multiplier: 1,
              foodMeasurementUnit:
                "users/me/dataTypes/food-measurement-unit/dataPoints/304",
              foodMeasurementUnitDisplayName: "serving",
              foodMeasurementUnitDisplayNamePlural: "servings",
            },
          ],
          nutrients: [
            {
              nutrient: NutrientQuantityNutrient.PROTEIN,
              quantity: { grams: 12 },
            },
          ],
        },
      }),
    ).toEqual({
      accessLevel: "PUBLIC",
      foodId: "80850",
      name: "Scrambled Eggs",
      brand: "Home",
      locale: "en-US",
      calories: 180,
      defaultServingSize: 1,
      defaultUnit: {
        id: "304",
        name: "serving",
        plural: "servings",
      },
      unit: {
        id: "304",
        name: "serving",
        plural: "servings",
      },
      units: ["304"],
      servings: [
        {
          multiplier: 1,
          servingSize: 1,
          unit: {
            id: "304",
            name: "serving",
            plural: "servings",
          },
        },
      ],
      nutritionalValues: {
        protein: 12,
        calories: 180,
        caloriesFromFat: 120,
        totalCarbohydrate: 2,
        carbs: 2,
        totalFat: 13,
        fat: 13,
      },
    });
  });

  it("looks up serving units when display names are missing", () => {
    const unitName =
      "users/me/dataTypes/food-measurement-unit/dataPoints/304";

    expect(
      mapFoodDataPoint(
        {
          name: "users/me/dataTypes/food/dataPoints/80850",
          food: {
            accessLevel: FoodAccessLevel.FOOD_ACCESS_LEVEL_PUBLIC,
            displayName: "Scrambled Eggs",
            defaultServing: {
              amount: 1,
              multiplier: 1,
              foodMeasurementUnit: unitName,
            },
            servings: [
              {
                amount: 1,
                multiplier: 1,
                foodMeasurementUnit: unitName,
              },
            ],
          },
        },
        new Map([
          [unitName, { id: "304", name: "serving", plural: "servings" }],
        ]),
      ).servings,
    ).toEqual([
      {
        multiplier: 1,
        servingSize: 1,
        unit: { id: "304", name: "serving", plural: "servings" },
      },
    ]);
  });
});

describe("nutritionLogMacros", () => {
  it("converts nutrition log nutrients into Fitbit-style units", () => {
    expect(
      nutritionLogMacros({
        food: "users/me/dataTypes/food/dataPoints/80850",
        foodDisplayName: "Scrambled Eggs",
        mealType: NutritionLogMealType.BREAKFAST,
        energy: { kcal: 147 },
        totalCarbohydrate: { grams: 8.52 },
        totalFat: { grams: 9.21 },
        serving: {
          amount: 1,
          foodMeasurementUnit:
            "users/me/dataTypes/food-measurement-unit/dataPoints/304",
          foodMeasurementUnitDisplayName: "serving",
        },
        interval: {
          startTime: "2021-02-01T12:00:00Z",
          civilStartTime: {
            date: { year: 2021, month: 2, day: 1 },
          },
        },
        nutrients: [
          {
            nutrient: NutrientQuantityNutrient.PROTEIN,
            quantity: { grams: 10.55 },
          },
          {
            nutrient: NutrientQuantityNutrient.DIETARY_FIBER,
            quantity: { grams: 0.91 },
          },
          {
            nutrient: NutrientQuantityNutrient.SODIUM,
            quantity: { grams: 0.339 },
          },
        ],
      }),
    ).toEqual({
      protein: 10.55,
      fiber: 0.91,
      dietaryFiber: 0.91,
      sodium: 339,
      calories: 147,
      totalCarbohydrate: 8.52,
      carbs: 8.52,
      totalFat: 9.21,
      fat: 9.21,
    });
  });
});

describe("nutritionLogServingUnit", () => {
  it("uses the serving display name and data point id", () => {
    expect(
      nutritionLogServingUnit({
        serving: {
          amount: 1,
          foodMeasurementUnit:
            "users/me/dataTypes/food-measurement-unit/dataPoints/304",
          foodMeasurementUnitDisplayName: "serving",
        },
      }),
    ).toEqual({
      id: "304",
      name: "serving",
      plural: "serving",
    });
  });
});

describe("nutritionLogDay", () => {
  it("prefers civil start time when present", () => {
    expect(
      nutritionLogDay({
        interval: {
          startTime: "2021-02-01T12:00:00Z",
          civilStartTime: {
            date: { year: 2021, month: 2, day: 1 },
          },
        },
      }).format("YYYY-MM-DD"),
    ).toBe("2021-02-01");
  });
});

describe("toNutritionLogMealType", () => {
  it("maps Fitbit meal types onto nutrition-log meal types", () => {
    expect(toNutritionLogMealType(MealType.Breakfast)).toBe(
      NutritionLogMealType.BREAKFAST,
    );
    expect(toNutritionLogMealType(MealType.MorningSnack)).toBe(
      NutritionLogMealType.BEFORE_LUNCH,
    );
    expect(toNutritionLogMealType(MealType.Lunch)).toBe(
      NutritionLogMealType.LUNCH,
    );
    expect(toNutritionLogMealType(MealType.AfternoonSnack)).toBe(
      NutritionLogMealType.BEFORE_DINNER,
    );
    expect(toNutritionLogMealType(MealType.Dinner)).toBe(
      NutritionLogMealType.DINNER,
    );
    expect(toNutritionLogMealType(MealType.EveningSnack)).toBe(
      NutritionLogMealType.AFTER_DINNER,
    );
    expect(toNutritionLogMealType(MealType.Anytime)).toBe(
      NutritionLogMealType.ANYTIME,
    );
  });
});

describe("summarizeNutritionLogs", () => {
  it("sums calories and macros across nutrition logs", () => {
    expect(
      summarizeNutritionLogs([
        {
          name: "users/me/dataTypes/nutrition-log/dataPoints/1",
          nutritionLog: {
            energy: { kcal: 147 },
            totalCarbohydrate: { grams: 8.52 },
            totalFat: { grams: 9.21 },
            nutrients: [
              {
                nutrient: NutrientQuantityNutrient.DIETARY_FIBER,
                quantity: { grams: 0.91 },
              },
              {
                nutrient: NutrientQuantityNutrient.PROTEIN,
                quantity: { grams: 10.55 },
              },
              {
                nutrient: NutrientQuantityNutrient.SODIUM,
                quantity: { grams: 0.339 },
              },
            ],
          },
        },
        {
          name: "users/me/dataTypes/nutrition-log/dataPoints/2",
          nutritionLog: {
            energy: { kcal: 113 },
            totalCarbohydrate: { grams: 27.01 },
            totalFat: { grams: 0.68 },
            nutrients: [
              {
                nutrient: NutrientQuantityNutrient.DIETARY_FIBER,
                quantity: { grams: 0.58 },
              },
              {
                nutrient: NutrientQuantityNutrient.PROTEIN,
                quantity: { grams: 1.38 },
              },
              {
                nutrient: NutrientQuantityNutrient.SODIUM,
                quantity: { grams: 0.01503 },
              },
            ],
          },
        },
      ]),
    ).toEqual({
      calories: 260,
      carbs: 35.53,
      fat: 9.89,
      fiber: 1.49,
      protein: 11.93,
      sodium: 354.03,
      water: 0,
    });
  });
});
