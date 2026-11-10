"use client";

import type { FoodTemplate } from "@/api/nutrition/food-templates";
import {
  createDefaultClientOnlyFoodsData,
  createSettingsBlobAtom,
  clientOnlyFoodsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type ClientOnlyFoodsData,
} from "@/storage/settings-storage";
import { migrateClientOnlyFoodsData } from "@/storage/settings-storage/migrations";

export type { ClientOnlyFoodsData, FoodTemplate };

export const clientOnlyFoodsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.clientOnlyFoods,
  schema: clientOnlyFoodsStoredSchema,
  defaultData: createDefaultClientOnlyFoodsData,
  version: 3,
  migrate: migrateClientOnlyFoodsData,
});
