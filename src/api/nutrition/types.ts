export interface FoodUnit {
  id: number;
  name: string;
  plural: string;
}

export interface Serving {
  multiplier: number;
  servingSize: number;
  unit: FoodUnit;
}

export interface Food {
  foodId: number;
  name: string;
  brand?: string;
  calories: number;
  servings?: Array<Serving>;
  defaultUnit?: FoodUnit;
  defaultServingSize?: number;
  unit?: FoodUnit;
  units: Array<number>;
}

export type FoodLogEntry = Food & {
  logDate: string;
  logId: number;
  loggedFood: Food & {
    amount: number;
    mealTypeId: MealType;
  };
  nutritionalValues: {
    calories: number;
    carbs: number;
    fat: number;
    fiber: number;
    protein: number;
    sodium: number;
  };
};

export enum MealType {
  Breakfast = 1,
  MorningSnack = 2,
  Lunch = 3,
  AfternoonSnack = 4,
  Dinner = 5,
  Anytime = 7,
}

export const MEAL_TYPE_NAMES = {
  [MealType.Breakfast]: "Breakfast",
  [MealType.MorningSnack]: "Morning Snack",
  [MealType.Lunch]: "Lunch",
  [MealType.AfternoonSnack]: "Afternoon Snack",
  [MealType.Dinner]: "Dinner",
  [MealType.Anytime]: "Anytime",
};

// https://dev.fitbit.com/build/reference/web-api/nutrition/get-food-log/
export interface GetFoodLogResponse {
  foods: Array<FoodLogEntry>;
  goals?: {
    calories: number;
  };
  summary: {
    calories: number;
    carbs: number;
    fat: number;
    fiber: number;
    protein: number;
    sodium: number;
    water: number /** water in ml */;
  };
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/get-water-goal/
export interface GetWaterGoalResponse {
  goal: {
    goal: number;
    startDate: string;
  };
}

// https://dev.fitbit.com/build/reference/web-api/nutrition/search-foods/
export interface SearchFoodsResponse {
  foods: Array<Food>;
}

export type MealFood = Food & {
  amount: number;
};

export interface Meal {
  id: string;
  name: string;
  description: string;
  mealFoods: Array<MealFood>;
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
