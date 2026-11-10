import {
  getDataPointIdFromName,
  type FoodDataPoint,
} from "@/api/nutrition/helpers";

import { SETTINGS_STORAGE_KEYS } from "./keys";
import type { SettingsStorage, StoredData } from "./types";
import type {
  ClientOnlyFoodsData,
  ClientOnlyMealFood,
  MealsData,
} from "./schemas";

export function migrateClientOnlyFoodsData(stored: {
  data: unknown;
}): StoredData<ClientOnlyFoodsData> {
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
    const customFoodId =
      typeof food.customFoodId === "string"
        ? food.customFoodId
        : getDataPointIdFromName(
            typeof food.name === "string" ? food.name : "",
          );
    const templateId =
      typeof food.id === "string" ? food.id : crypto.randomUUID();

    if (customFoodId) {
      customFoodMap.set(customFoodId, templateId);
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
          if (foodId) {
            const templateId = customFoodMap.get(foodId);
            if (templateId) {
              delete record.foodId;
              return { ...record, foodTemplateId: templateId };
            }
            delete record.foodId;
            return {
              ...record,
              food: `users/me/dataTypes/food/dataPoints/${foodId}`,
            };
          }
          return record;
        }),
      })),
    },
    version: 2,
    updateTime: new Date().toISOString(),
  };
}

export async function migrateMealsStoredData(
  stored: StoredData<unknown>,
  storage: SettingsStorage,
): Promise<StoredData<MealsData>> {
  const customFoodsStored = await storage.get(
    SETTINGS_STORAGE_KEYS.clientOnlyFoods,
  );
  const customFoods =
    (
      customFoodsStored?.data as
        { clientOnlyFoods?: Array<Record<string, unknown>> } | undefined
    )?.clientOnlyFoods ?? [];

  const nextCustomFoods = customFoods.map((food) => {
    const customFoodId =
      typeof food.customFoodId === "string"
        ? food.customFoodId
        : getDataPointIdFromName(
            typeof food.name === "string" ? food.name : "",
          );
    const templateId =
      typeof food.id === "string" ? food.id : crypto.randomUUID();

    if (!customFoodId) {
      return food;
    }

    return {
      ...food,
      customFoodId,
      id: templateId,
    };
  });

  await storage.set(
    SETTINGS_STORAGE_KEYS.clientOnlyFoods,
    {
      clientOnlyFoods: nextCustomFoods,
    },
    2,
  );

  return migrateMealsData(stored, { clientOnlyFoods: nextCustomFoods });
}
