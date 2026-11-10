"use client";

import {
  getDataPointIdFromName,
  type FoodDataPoint,
} from "@/api/nutrition/helpers";
import {
  createDefaultClientOnlyFoodsData,
  createSettingsBlobAtom,
  clientOnlyFoodsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type ClientOnlyFoodsData,
} from "@/storage/settings-storage";

export type { ClientOnlyFoodsData, FoodDataPoint };

function migrateClientOnlyFoodsData(stored: { data: unknown }): {
  data: ClientOnlyFoodsData;
  version: number;
  updateTime: string;
} {
  const rawData = (stored.data ?? { clientOnlyFoods: [] }) as {
    clientOnlyFoods?: Array<Record<string, unknown>>;
  };

  return {
    ...stored,
    data: {
      clientOnlyFoods: (rawData.clientOnlyFoods ?? []).map((food) => {
        const record = { ...(food ?? {}) } as Record<string, unknown>;
        const existingId =
          typeof record.id === "string" ? record.id : undefined;
        const customFoodId =
          typeof record.customFoodId === "string"
            ? record.customFoodId
            : getDataPointIdFromName(
                typeof record.name === "string" ? record.name : "",
              );

        return {
          ...record,
          ...(customFoodId ? { customFoodId } : {}),
          id: existingId ?? crypto.randomUUID(),
        } as FoodDataPoint & { id: string; customFoodId: string };
      }),
    },
    version: 2,
    updateTime: new Date().toISOString(),
  };
}

export const clientOnlyFoodsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.clientOnlyFoods,
  schema: clientOnlyFoodsStoredSchema,
  defaultData: createDefaultClientOnlyFoodsData,
  version: 2,
  migrate: async (stored) => migrateClientOnlyFoodsData(stored),
});
