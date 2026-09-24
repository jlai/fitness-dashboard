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

export type { ClientOnlyMeal, ClientOnlyMealFood, MealsData };

export const mealsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.meals,
  schema: mealsStoredSchema,
  defaultData: createDefaultMealsData,
});
