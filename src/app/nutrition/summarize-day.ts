import {
  MealType,
  MEAL_TYPE_NAMES,
  mapNutritionLogMealType,
  nutritionLogMacros,
  NutritionLogDataPoint,
} from "@/api/nutrition";

export interface MealTypeSummary {
  id: number;
  name: string;
  foods: NutritionLogDataPoint[];
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
}

export function groupByMealType(dataPoints: Array<NutritionLogDataPoint>) {
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

  for (const dataPoint of dataPoints) {
    const log = dataPoint.nutritionLog;
    if (!log) {
      continue;
    }

    const mealType = mapNutritionLogMealType(log.mealType);
    const summary = mealTypeSummaries.get(mealType);
    if (summary) {
      summary.foods.push(dataPoint);

      const {
        calories = 0,
        carbs = 0,
        fat = 0,
        fiber = 0,
        protein = 0,
        sodium = 0,
      } = nutritionLogMacros(log);

      summary.calories += calories;
      summary.carbs += carbs;
      summary.fat += fat;
      summary.fiber += fiber;
      summary.protein += protein;
      summary.sodium += sodium;
    }
  }

  return mealTypeSummaries;
}
