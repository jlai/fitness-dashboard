import { Dexie, Table, type EntityTable } from "dexie";

import type { NutritionalValues } from "@/api/nutrition/types";

export type GoalPeriod = "daily" | "weekly" | "target";

export interface MigrationGoal {
  metric: string;
  period: GoalPeriod;
  value: number;
  units?: string;
}

/** Fitbit food unit as stored in the Fitbit Migration DB. */
export interface FitbitFoodUnit {
  id: number;
  name: string;
  plural: string;
}

export type FitbitServing = {
  multiplier: number;
  servingSize: number;
  unit: FitbitFoodUnit;
};

/**
 * Custom food as stored in FitbitMigrationDB.customFoods.
 * @see fitbit-api-migration commit 6cc890555cd5920d8f8a4a08770ef7161ccdc55b
 */
export interface MigrationFood {
  accessLevel: "PUBLIC" | "PRIVATE";
  foodId: number;
  name: string;
  brand?: string;
  locale?: string;
  calories: number;
  servings?: Array<FitbitServing>;
  defaultUnit?: FitbitFoodUnit;
  defaultServingSize?: number;
  unit?: FitbitFoodUnit;
  units: Array<FitbitFoodUnit>;
  nutritionalValues?: NutritionalValues;
}

export type MigrationMealFood = MigrationFood & {
  amount: number;
};

/**
 * Meal as stored in FitbitMigrationDB.meals.
 * @see fitbit-api-migration commit 6cc890555cd5920d8f8a4a08770ef7161ccdc55b
 */
export interface MigrationMeal {
  id: string;
  name: string;
  description: string;
  mealFoods: Array<MigrationMealFood>;
}

export const db = new Dexie("FitbitMigrationDB") as Dexie & {
  meals: EntityTable<MigrationMeal, "id">;
  customFoods: EntityTable<MigrationFood, "foodId">;
  goals: Table<MigrationGoal, [string, string]>;
};

db.version(1).stores({
  meals: "id",
  customFoods: "foodId",
  goals: "[metric+period]",
});
