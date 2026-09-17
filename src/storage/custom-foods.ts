"use client";

import type { FoodDataPoint } from "@/api/nutrition/helpers";
import {
  createDefaultCustomFoodsData,
  createSettingsBlobAtom,
  customFoodsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type CustomFoodsData,
} from "@/storage/settings-storage";

export type { CustomFoodsData, FoodDataPoint };

export const customFoodsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.customFoods,
  schema: customFoodsStoredSchema,
  defaultData: createDefaultCustomFoodsData,
});
