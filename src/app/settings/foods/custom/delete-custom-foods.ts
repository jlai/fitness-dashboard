import { getDefaultStore } from "jotai";

import { getDataPointIdFromName } from "@/api/nutrition/helpers";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";

function mealFoodCustomFoodId(
  mealFood: { food?: string; foodId?: string; foodTemplateId?: string },
  clientOnlyFoods: Array<{
    id?: string;
    name?: string;
    customFoodId?: string;
  }>,
): string | undefined {
  if (mealFood.foodTemplateId) {
    const template = clientOnlyFoods.find(
      (food) =>
        food.id === mealFood.foodTemplateId ||
        food.customFoodId === mealFood.foodTemplateId,
    );
    if (!template) {
      return undefined;
    }
    return template.customFoodId ?? getDataPointIdFromName(template.name);
  }

  if (mealFood.food) {
    return getDataPointIdFromName(mealFood.food);
  }

  if (mealFood.foodId) {
    return mealFood.foodId;
  }

  return undefined;
}

export async function deleteCustomFoods(foodIds: string[]): Promise<string[]> {
  const ids = new Set(foodIds);
  const store = getDefaultStore();
  const [{ meals }, { clientOnlyFoods }] = await Promise.all([
    store.get(mealsAtom),
    store.get(clientOnlyFoodsAtom),
  ]);
  const usedBy = meals.filter((meal) =>
    meal.foods.some((mealFood) => {
      const customFoodId = mealFoodCustomFoodId(mealFood, clientOnlyFoods);
      return customFoodId !== undefined && ids.has(customFoodId);
    }),
  );
  if (usedBy.length) return usedBy.map((meal) => meal.name);

  await store.set(clientOnlyFavoriteFoodsAtom, (previous) => ({
    clientOnlyFavoriteFoods: previous.clientOnlyFavoriteFoods.filter(
      ({ foodId }) => !ids.has(foodId),
    ),
  }));
  try {
    await store.set(clientOnlyFoodsAtom, (previous) => ({
      clientOnlyFoods: previous.clientOnlyFoods.filter(
        (food) => !ids.has(getDataPointIdFromName(food.name)),
      ),
    }));
  } catch (error) {
    throw new Error(
      "Favorite removal completed, but the foods could not be deleted. Try again.",
      { cause: error },
    );
  }
  return [];
}
