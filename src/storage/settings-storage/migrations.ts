import {
  foodIdFromReference,
  foodTemplateReference,
  isFoodResourceReference,
} from "@/api/nutrition/food-references";

import { SETTINGS_STORAGE_KEYS } from "./keys";
import { loadSettingsBlob, type SettingsBlobOptions } from "./blob-storage";
import { createDefaultClientOnlyFoodsData } from "./defaults";
import { clientOnlyFoodsStoredSchema } from "./schemas";
import type { SettingsStorage, StoredData } from "./types";
import type {
  ClientOnlyFoodsData,
  ClientOnlyMealFood,
  MealsData,
} from "./schemas";

export const clientOnlyFoodsBlobOptions: SettingsBlobOptions<ClientOnlyFoodsData> =
  {
    key: SETTINGS_STORAGE_KEYS.clientOnlyFoods,
    schema: clientOnlyFoodsStoredSchema,
    defaultData: createDefaultClientOnlyFoodsData,
    version: 3,
    migrate: migrateClientOnlyFoodsData,
  };

function isLegacyServerFoodReference(value: string): boolean {
  const foodId = foodIdFromReference(value);
  return (
    foodId !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      foodId,
    )
  );
}

export function migrateClientOnlyFoodsData(stored: {
  data: unknown;
}): StoredData<ClientOnlyFoodsData> {
  const rawData = (stored.data ?? { clientOnlyFoods: [] }) as {
    clientOnlyFoods?: Array<Record<string, unknown>>;
  };

  return {
    ...stored,
    data: {
      clientOnlyFoods: (rawData.clientOnlyFoods ?? []).flatMap((food) => {
        const record = { ...(food ?? {}) } as Record<string, unknown>;
        if (typeof record.food !== "object" || record.food === null) return [];
        const legacyCustomFood =
          typeof record.customFood === "string"
            ? record.customFood
            : typeof record.customFoodId === "string"
              ? isFoodResourceReference(record.customFoodId)
                ? record.customFoodId
                : `users/me/dataTypes/food/dataPoints/${record.customFoodId}`
              : typeof record.name === "string"
                ? record.name
                : undefined;
        delete record.name;
        delete record.customFoodId;
        delete record.customFood;

        return [
          {
            id:
              typeof record.id === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                record.id,
              )
                ? record.id
                : crypto.randomUUID(),
            food: record.food as ClientOnlyFoodsData["clientOnlyFoods"][number]["food"],
            ...(legacyCustomFood &&
            isLegacyServerFoodReference(legacyCustomFood)
              ? { customFood: legacyCustomFood }
              : {}),
          },
        ];
      }),
    },
    version: 3,
    updateTime: new Date().toISOString(),
  };
}

function migrateMealsData(
  stored: { data: unknown },
  customFoods: unknown,
): StoredData<MealsData> {
  const rawData = (stored.data ?? { meals: [] }) as {
    meals?: Array<{
      id: string;
      name: string;
      description: string;
      foods?: Array<ClientOnlyMealFood & Record<string, unknown>>;
    }>;
  };
  const customFoodMap = new Map<string, string>();
  const clientOnlyFoods =
    (
      customFoods as
        { clientOnlyFoods?: Array<Record<string, unknown>> } | undefined
    )?.clientOnlyFoods ?? [];

  for (const food of clientOnlyFoods) {
    const customFood =
      typeof food.customFood === "string" ? food.customFood : undefined;
    const templateId =
      typeof food.id === "string" ? food.id : crypto.randomUUID();

    const foodId = customFood ? foodIdFromReference(customFood) : undefined;
    if (foodId) {
      customFoodMap.set(foodId, templateId);
    }
  }

  return {
    ...stored,
    data: {
      meals: (rawData.meals ?? []).map((meal) => ({
        ...meal,
        foods: (meal.foods ?? []).map((item) => {
          const record = { ...item };
          const foodId =
            typeof record.foodId === "string" ? record.foodId : undefined;
          const templateId =
            typeof record.foodTemplateId === "string"
              ? record.foodTemplateId
              : foodId
                ? customFoodMap.get(foodId)
                : undefined;
          delete record.foodId;
          delete record.foodTemplateId;

          if (templateId) {
            return { ...record, food: foodTemplateReference(templateId) };
          }
          if (typeof record.food === "string") {
            return record;
          }
          return foodId
            ? {
                ...record,
                food: `users/me/dataTypes/food/dataPoints/${foodId}`,
              }
            : record;
        }),
      })),
    },
    version: 3,
    updateTime: new Date().toISOString(),
  };
}

export function migrateClientOnlyFavoriteFoodsData(
  stored: StoredData<unknown>,
): StoredData<{ clientOnlyFavoriteFoods: Array<{ food: string }> }> {
  const rawData = (stored.data ?? { clientOnlyFavoriteFoods: [] }) as {
    clientOnlyFavoriteFoods?: Array<Record<string, unknown>>;
  };

  return {
    ...stored,
    data: {
      clientOnlyFavoriteFoods: (rawData.clientOnlyFavoriteFoods ?? []).flatMap(
        (entry) => {
          const record = { ...entry };
          if (typeof record.food === "string") {
            delete record.foodId;
            return [record as { food: string }];
          }
          const foodId = record.foodId;
          delete record.foodId;

          if (
            typeof foodId === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              foodId,
            )
          ) {
            return [{ ...record, food: foodTemplateReference(foodId) }];
          }

          if (typeof foodId !== "number" || !Number.isInteger(foodId)) {
            return [];
          }

          return [
            {
              ...record,
              food: `users/me/dataTypes/food/dataPoints/${foodId}`,
            },
          ];
        },
      ),
    },
    version: 2,
    updateTime: new Date().toISOString(),
  };
}

export async function migrateMealsStoredData(
  stored: StoredData<unknown>,
  storage: SettingsStorage,
): Promise<StoredData<MealsData>> {
  const customFoods = await loadSettingsBlob(
    storage,
    clientOnlyFoodsBlobOptions,
  );
  return migrateMealsData(stored, customFoods);
}
