import { getDefaultStore } from "jotai";

import { foodTemplateIdFromReference } from "@/api/nutrition/food-references";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";

function mealFoodCustomFoodId(
  mealFood: { food: string },
  clientOnlyFoods: Array<{
    id?: string;
    customFood?: string;
  }>,
): string | undefined {
  const templateId = foodTemplateIdFromReference(mealFood.food);
  if (templateId) {
    const template = clientOnlyFoods.find((food) => food.id === templateId);
    if (!template) {
      return undefined;
    }
    return template.id;
  }

  return clientOnlyFoods.find(
    (template) => template.customFood === mealFood.food,
  )?.id;
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
      (favorite) =>
        !ids.has(mealFoodCustomFoodId(favorite, clientOnlyFoods) ?? ""),
    ),
  }));
  try {
    await store.set(clientOnlyFoodsAtom, (previous) => ({
      clientOnlyFoods: previous.clientOnlyFoods.filter(
        (food) => !ids.has(food.id),
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
