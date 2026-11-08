import {
  NutrientQuantityNutrient,
  NutritionLogMealType,
  type DataPoint,
} from "@generated/orval/fetch/google-health-api/models";

import { Food } from "@/api/nutrition";

export const SCRAMBLED_EGGS: Food = {
  accessLevel: "PUBLIC" as const,
  brand: "",
  calories: 147,
  foodId: "80850",
  locale: "en_US",
  name: "Scrambled Eggs",
  unit: {
    id: "304",
    name: "serving",
    plural: "servings",
  },
  units: ["304", "226", "180", "147", "389"],
};

export const BREAKFAST_NUTRITION_LOGS: DataPoint[] = [
  {
    name: "users/me/dataTypes/nutrition-log/dataPoints/1",
    nutritionLog: {
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
    },
  },
  {
    name: "users/me/dataTypes/nutrition-log/dataPoints/2",
    nutritionLog: {
      food: "users/me/dataTypes/food/dataPoints/82782",
      foodDisplayName: "Orange Juice",
      mealType: NutritionLogMealType.BREAKFAST,
      energy: { kcal: 113 },
      totalCarbohydrate: { grams: 27.01 },
      totalFat: { grams: 0.68 },
      serving: {
        amount: 8,
        foodMeasurementUnit:
          "users/me/dataTypes/food-measurement-unit/dataPoints/128",
        foodMeasurementUnitDisplayName: "fl oz",
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
          quantity: { grams: 1.38 },
        },
        {
          nutrient: NutrientQuantityNutrient.DIETARY_FIBER,
          quantity: { grams: 0.58 },
        },
        {
          nutrient: NutrientQuantityNutrient.SODIUM,
          quantity: { grams: 0.01503 },
        },
      ],
    },
  },
];
