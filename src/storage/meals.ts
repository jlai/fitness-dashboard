"use client";

import {
  createDefaultMealsData,
  createSettingsBlobAtom,
  mealsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type ClientOnlyMeal,
  type ClientOnlyMealFood,
  type MealsData,
} from "@/storage/settings-storage";
import { migrateMealsStoredData } from "@/storage/settings-storage/migrations";

export type { ClientOnlyMeal, ClientOnlyMealFood, MealsData };

export function getMealsWithMissingFoodNames(meals: ClientOnlyMeal[]) {
  return meals.filter((meal) =>
    meal.foods.some((food) => !food.cachedDisplayName),
  );
}

export function countMealsWithMissingFoodNames(meals: ClientOnlyMeal[]) {
  return getMealsWithMissingFoodNames(meals).length;
}

export const mealsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.meals,
  schema: mealsStoredSchema,
  defaultData: createDefaultMealsData,
  version: 2,
  migrate: migrateMealsStoredData,
});
