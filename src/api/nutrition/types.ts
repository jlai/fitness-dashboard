import { NutritionLogMealType } from "@generated/orval/fetch/google-health-api/models";

export { NutritionLogMealType };

export interface FoodUnit {
  id: string;
  name: string;
  plural: string;
}

export interface Serving {
  multiplier?: number;
  servingSize: number;
  unit: FoodUnit;
}

export type FoodAccessLevel = "PUBLIC" | "PRIVATE";

export interface NutritionMacroGoals {
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
}

export type NutritionalValues = Partial<{
  // common public
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;

  // detailed
  biotin: number;
  calcium: number;
  caloriesFromFat: number;
  cholesterol: number;
  copper: number;
  dietaryFiber: number;
  folicAcid: number;
  iodine: number;
  iron: number;
  magnesium: number;
  niacin: number;
  pantothenicAcid: number;
  phosphorus: number;
  potassium: number;
  protein: number;
  riboflavin: number;
  saturatedFat: number;
  sodium: number;
  sugars: number;
  thiamin: number;
  totalCarbohydrate: number;
  totalFat: number;
  transFat: number;
  vitaminA: number;
  vitaminB12: number;
  vitaminB6: number;
  vitaminC: number;
  vitaminD: number;
  vitaminE: number;
  zinc: number;
  caffeine: number;
  chloride: number;
  chromium: number;
  folate: number;
  manganese: number;
  molybdenum: number;
  monounsaturatedFat: number;
  polyunsaturatedFat: number;
  selenium: number;
  unsaturatedFat: number;
  vitaminK: number;
}>;

export interface Food {
  accessLevel: FoodAccessLevel;
  foodId: string;
  name: string;
  brand?: string;
  locale?: string;
  calories: number;
  servings?: Array<Serving>;
  defaultUnit?: FoodUnit;
  defaultServingSize?: number;
  unit?: FoodUnit;
  units: Array<string>;

  // Only available on custom (private) foods
  nutritionalValues?: NutritionalValues;
  sourceNutritionLogName?: string;
}

export type MealFood = Food & {
  amount: number;
  cachedDisplayName?: string;
  foodNotFound?: boolean;
};

export const MEAL_TYPE_NAMES: Record<NutritionLogMealType, string> = {
  [NutritionLogMealType.MEAL_TYPE_UNSPECIFIED]: "Unspecified",
  [NutritionLogMealType.BEFORE_BREAKFAST]: "Before breakfast",
  [NutritionLogMealType.BREAKFAST]: "Breakfast",
  [NutritionLogMealType.BEFORE_LUNCH]: "Morning Snack",
  [NutritionLogMealType.LUNCH]: "Lunch",
  [NutritionLogMealType.BEFORE_DINNER]: "Afternoon Snack",
  [NutritionLogMealType.DINNER]: "Dinner",
  [NutritionLogMealType.AFTER_DINNER]: "Evening Snack",
  [NutritionLogMealType.SNACK]: "Snack",
  [NutritionLogMealType.ANYTIME]: "Anytime",
};

export interface GetFoodResponse {
  food: Food;
}

export interface FoodLogSummary {
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
  water: number /** water in ml */;
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/get-water-goal/
export interface GetWaterGoalResponse {
  goal: {
    goal: number;
    startDate: string;
  };
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/get-food-goals/
export interface GetFoodGoalResponse {
  goals: {
    calories: number;
  };
  foodPlan: {
    estimatedDate: string;
    intensity: "MAINTAIN" | "EASIER" | "MEDIUM" | "HARDER" | "KINDAHARD";
    personalized: boolean;
  };
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/search-foods/
export interface SearchFoodsResponse {
  foods: Array<Food>;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  mealFoods: Array<MealFood>;
}

export interface MealSummary {
  id: string;
  name: string;
  description: string;
  foodNames: Array<string>;
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/get-meals/
export interface GetMealsResponse {
  meals: Array<Meal>;
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/get-meal/
export interface GetMealResponse {
  meal: Meal;
}

export function getDefaultServingSize(food: Food | MealFood) {
  return {
    amount: (food as MealFood).amount ?? food.defaultServingSize ?? 1,
    unit: food.unit ?? food.defaultUnit!,
  };
}
