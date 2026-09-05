import { Dexie, type EntityTable } from "dexie";

import type { Food, Meal } from "@/api/nutrition/types";

export const db = new Dexie("FitbitMigrationDB") as Dexie & {
  meals: EntityTable<Meal, "id">;
  customFoods: EntityTable<Food, "foodId">;
};

db.version(1).stores({
  meals: "id",
  customFoods: "foodId"
});

export async function saveMeals(meals: Array<Meal>) {
  await db.transaction("rw", db.meals, async () => {
    await db.meals.clear();
    await db.meals.bulkPut(meals);
  });
}

export async function saveCustomFoods(customFoods: Array<Food>) {
  await db.transaction("rw", db.customFoods, async () => {
    await db.customFoods.clear();
    await db.customFoods.bulkPut(customFoods);
  });
}
