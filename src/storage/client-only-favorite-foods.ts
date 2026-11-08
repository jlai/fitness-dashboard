"use client";

import {
  clientOnlyFavoriteFoodsStoredSchema,
  createDefaultClientOnlyFavoriteFoodsData,
  createSettingsBlobAtom,
  SETTINGS_STORAGE_KEYS,
} from "@/storage/settings-storage";

export const clientOnlyFavoriteFoodsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods,
  schema: clientOnlyFavoriteFoodsStoredSchema,
  defaultData: createDefaultClientOnlyFavoriteFoodsData,
});
