"use client";

import { getDataPointIdFromName } from "@/api/nutrition/helpers";
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

function migrateMealsData(
  stored: { data: unknown },
  customFoods: unknown,
): {
  data: MealsData;
  version: number;
  updateTime: string;
} {
  const rawData = (stored.data ?? { meals: [] }) as {
    meals?: Array<{
      id?: string;
      name?: string;
      description?: string;
      foods?: Array<Record<string, unknown>>;
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
          const record = { ...(item ?? {}) } as Record<string, unknown>;
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

export const mealsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.meals,
  schema: mealsStoredSchema,
  defaultData: createDefaultMealsData,
  version: 2,
  migrate: async (stored, storage) => {
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
  },
});
