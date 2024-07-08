import { FoodLogEntry, MealType, MEAL_TYPE_NAMES } from "@/api/nutrition";

export interface MealTypeSummary {
  id: number;
  name: string;
  foods: FoodLogEntry[];
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
}

export function groupByMealType(foods: Array<FoodLogEntry>) {
  const mealTypeSummaries = new Map<number, MealTypeSummary>();

  const defaultNutrients = {
    calories: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    protein: 0,
    sodium: 0,
  };

  for (const mealType of [
    MealType.Breakfast,
    MealType.MorningSnack,
    MealType.Lunch,
    MealType.AfternoonSnack,
    MealType.Dinner,
    MealType.EveningSnack,
    MealType.Anytime,
  ]) {
    mealTypeSummaries.set(mealType, {
      id: mealType,
      name: MEAL_TYPE_NAMES[mealType]!,
      foods: [],
      ...defaultNutrients,
    });
  }

  const total = {
    id: -1,
    name: "Total",
    foods: [],
    ...defaultNutrients,
  };

  mealTypeSummaries.set(-1, total);

  for (const food of foods) {
    const summary = mealTypeSummaries.get(food.loggedFood.mealTypeId);
    if (summary) {
      summary.foods.push(food);

      const {
        loggedFood: { calories = 0 },
        nutritionalValues: {
          carbs = 0,
          fat = 0,
          fiber = 0,
          protein = 0,
          sodium = 0,
        } = {},
      } = food;

      summary.calories += calories;
      summary.carbs += carbs;
      summary.fat += fat;
      summary.fiber += fiber;
      summary.protein += protein;
      summary.sodium += sodium;

      total.calories += calories;
      total.carbs += carbs;
      total.fat += fat;
      total.fiber += fiber;
      total.protein += protein;
      total.sodium += sodium;
    }
  }

  return mealTypeSummaries;
}
