"use client";

import type { FoodDataPoint } from "@/api/nutrition/helpers";
import {
  createDefaultClientOnlyFoodsData,
  createSettingsBlobAtom,
  clientOnlyFoodsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type ClientOnlyFoodsData,
} from "@/storage/settings-storage";

export type { ClientOnlyFoodsData, FoodDataPoint };

export const clientOnlyFoodsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.clientOnlyFoods,
  schema: clientOnlyFoodsStoredSchema,
  defaultData: createDefaultClientOnlyFoodsData,
});
