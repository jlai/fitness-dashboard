import { getDefaultStore } from "jotai";

import { getDataPointIdFromName } from "@/api/nutrition/helpers";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";

export async function deleteCustomFoods(foodIds: string[]): Promise<string[]> {
  const ids = new Set(foodIds);
  const store = getDefaultStore();
  const { meals } = await store.get(mealsAtom);
  const usedBy = meals.filter((meal) =>
    meal.foods.some(({ foodId }) => ids.has(foodId)),
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
