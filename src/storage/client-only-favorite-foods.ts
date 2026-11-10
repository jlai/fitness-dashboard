"use client";

import {
  clientOnlyFavoriteFoodsStoredSchema,
  createDefaultClientOnlyFavoriteFoodsData,
  createSettingsBlobAtom,
  SETTINGS_STORAGE_KEYS,
} from "@/storage/settings-storage";
import { migrateClientOnlyFavoriteFoodsData } from "@/storage/settings-storage/migrations";

export const clientOnlyFavoriteFoodsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods,
  schema: clientOnlyFavoriteFoodsStoredSchema,
  defaultData: createDefaultClientOnlyFavoriteFoodsData,
  version: 2,
  migrate: migrateClientOnlyFavoriteFoodsData,
});
