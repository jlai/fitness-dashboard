import { Dexie, type EntityTable, type Table } from "dexie";

import type { Food, FoodUnit } from "@/api/nutrition/types";

export type GoalPeriod = "daily" | "weekly" | "target";

export interface MigrationGoal {
  metric: string;
  period: GoalPeriod;
  value: number;
  units?: string;
}

export type MigrationFood = Omit<Food, "units"> & {
  units: Array<FoodUnit>;
};

export type MigrationMealFood = MigrationFood & {
  amount: number;
};

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

export async function saveMeals(meals: Array<MigrationMeal>) {
  await db.transaction("rw", db.meals, async () => {
    await db.meals.clear();
    await db.meals.bulkPut(meals);
  });
}

export async function saveCustomFoods(customFoods: Array<MigrationFood>) {
  await db.transaction("rw", db.customFoods, async () => {
    await db.customFoods.clear();
    await db.customFoods.bulkPut(customFoods);
  });
}

export async function saveGoals(goals: Array<MigrationGoal>) {
  await db.transaction("rw", db.goals, async () => {
    await db.goals.clear();
    await db.goals.bulkPut(goals);
  });
}
