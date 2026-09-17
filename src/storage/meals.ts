"use client";

import {
  createDefaultMealsData,
  createSettingsBlobAtom,
  mealsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type MealsData,
} from "@/storage/settings-storage";
import type { ClientOnlyMeal } from "@/storage/db/dashdb";

export type { ClientOnlyMeal, MealsData };

export const mealsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.meals,
  schema: mealsStoredSchema,
  defaultData: createDefaultMealsData,
});
