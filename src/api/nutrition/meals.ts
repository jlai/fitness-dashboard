import { queryOptions, QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import type { ClientOnlyMeal, ClientOnlyMealFood } from "@/storage/meals";
import {
  mealFoodFromResolvedFood,
  mealToClientOnlyMeal,
  servingFromMealFood,
} from "@/storage/db/fitbit-to-health";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";

import { isValidDataPointId, getDataPoint } from "../datapoints";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { foodResourceName } from "./food-log";
import {
  foodToDataPoint,
  getDataPointIdFromName,
  mapFoodDataPoint,
  mapFoodDataPoints,
  type FoodDataPoint,
} from "./helpers";
import { Meal, MealFood, MealSummary } from "./types";

function placeholderFood(foodId: string): MealFood {
  return {
    accessLevel: "PUBLIC",
    foodId,
    name: foodId,
    calories: 0,
    units: [],
    amount: 1,
  };
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

function findLocalFood(
  clientOnlyFoods: FoodDataPoint[],
  item: ClientOnlyMealFood,
): FoodDataPoint | undefined {
  if (item.foodTemplateId) {
    return clientOnlyFoods.find(
      (food) =>
        (food as FoodDataPoint & { id?: string; customFoodId?: string }).id ===
          item.foodTemplateId ||
        (food as FoodDataPoint & { id?: string; customFoodId?: string })
          .customFoodId === item.foodTemplateId,
    );
  }

  const foodId =
    item.foodId ?? (item.food ? getDataPointIdFromName(item.food) : undefined);
  if (!foodId) {
    return undefined;
  }

  return clientOnlyFoods.find((food) => {
    const customFoodId =
      (food as FoodDataPoint & { customFoodId?: string }).customFoodId ??
      getDataPointIdFromName(food.name);
    return customFoodId === foodId || food.name === foodResourceName(foodId);
  });
}

async function resolveMealFood(
  item: ClientOnlyMealFood,
  clientOnlyFoods: FoodDataPoint[],
): Promise<MealFood> {
  const foodId =
    item.foodId ??
    (item.food ? getDataPointIdFromName(item.food) : undefined) ??
    (item.foodTemplateId ? item.foodTemplateId : undefined);
  const local = findLocalFood(clientOnlyFoods, item);

  if (local) {
    return mealFoodFromResolvedFood(mapFoodDataPoint(local), item);
  }

  if (foodId && isValidDataPointId(foodId)) {
    try {
      const dataPoint = await getDataPoint("food", foodId);
      const [food] = await mapFoodDataPoints([dataPoint]);
      return mealFoodFromResolvedFood(food, item);
    } catch (error) {
      // Public catalog foods may be unavailable offline or after id changes.
      if (isNotFoundError(error)) {
        return {
          ...mealFoodFromResolvedFood(placeholderFood(foodId), item),
          foodNotFound: true,
        };
      }
    }
  }

  return mealFoodFromResolvedFood(placeholderFood(foodId ?? "unknown"), item);
}

async function hydrateMeal(
  meal: ClientOnlyMeal,
  clientOnlyFoods: FoodDataPoint[],
): Promise<Meal> {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description,
    mealFoods: await Promise.all(
      meal.foods.map((item) => resolveMealFood(item, clientOnlyFoods)),
    ),
  };
}

function mealSummaryFromStoredMeal(meal: ClientOnlyMeal): MealSummary {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description,
    foodNames: meal.foods.flatMap((food) =>
      food.cachedDisplayName ? [food.cachedDisplayName] : [],
    ),
  };
}

export function mealSummaryFromMeal(meal: Meal): MealSummary {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description,
    foodNames: meal.mealFoods.map(
      (food) => food.cachedDisplayName ?? food.name,
    ),
  };
}

async function listMeals(): Promise<MealSummary[]> {
  const store = getDefaultStore();
  const { meals } = await store.get(mealsAtom);
  return meals.map(mealSummaryFromStoredMeal);
}

async function getMealDetails(mealId: string): Promise<Meal> {
  const store = getDefaultStore();
  const [{ meals }, { clientOnlyFoods }] = await Promise.all([
    store.get(mealsAtom),
    store.get(clientOnlyFoodsAtom),
  ]);
  const meal = meals.find((item) => item.id === mealId);

  if (!meal) {
    throw new Error(`Meal not found: ${mealId}`);
  }

  return hydrateMeal(meal, clientOnlyFoods);
}

function privateFoodDataPoints(meal: Meal): FoodDataPoint[] {
  return meal.mealFoods
    .filter((food) => food.accessLevel === "PRIVATE")
    .map((food) => foodToDataPoint(food));
}

function mergeClientOnlyFoods(
  existing: FoodDataPoint[],
  additions: FoodDataPoint[],
): FoodDataPoint[] {
  if (additions.length === 0) {
    return existing;
  }

  const byName = new Map(existing.map((food) => [food.name, food]));
  for (const food of additions) {
    byName.set(food.name, food);
  }
  return [...byName.values()];
}

function newMealId() {
  return crypto.randomUUID();
}

async function saveMeal(meal: Meal): Promise<Meal> {
  const store = getDefaultStore();
  const id = meal.id || newMealId();
  const savedMeal = {
    ...meal,
    id,
    mealFoods: meal.mealFoods.map((food) => ({
      ...food,
      cachedDisplayName: food.name,
      ...(food.sourceNutritionLogName
        ? {
            foodId: crypto.randomUUID(),
            sourceNutritionLogName: undefined,
          }
        : {}),
    })),
  };

  const [{ meals }, { clientOnlyFoods }] = await Promise.all([
    store.get(mealsAtom),
    store.get(clientOnlyFoodsAtom),
  ]);

  const stored = {
    ...mealToClientOnlyMeal(savedMeal),
    foods: savedMeal.mealFoods.map((food) => {
      const customFood = clientOnlyFoods.find(
        (entry) =>
          getDataPointIdFromName(entry.name) === String(food.foodId) ||
          (entry as FoodDataPoint & { customFoodId?: string }).customFoodId ===
            String(food.foodId),
      );
      const serving = servingFromMealFood(food);

      if (customFood) {
        return {
          serving,
          foodTemplateId: (customFood as FoodDataPoint & { id?: string }).id,
          cachedDisplayName: food.cachedDisplayName,
        };
      }

      return {
        serving,
        food: foodResourceName(String(food.foodId)),
        cachedDisplayName: food.cachedDisplayName,
      };
    }),
  };
  const privateFoods = privateFoodDataPoints(savedMeal);

  const mealIndex = meals.findIndex((entry) => entry.id === id);
  const nextMeals =
    mealIndex >= 0
      ? meals.map((entry, index) => (index === mealIndex ? stored : entry))
      : [...meals, stored];

  await store.set(mealsAtom, { meals: nextMeals });
  if (privateFoods.length > 0) {
    await store.set(clientOnlyFoodsAtom, {
      clientOnlyFoods: mergeClientOnlyFoods(clientOnlyFoods, privateFoods),
    });
  }

  return savedMeal;
}

export function buildMealsQuery() {
  return queryOptions({
    queryKey: ["meals"],
    queryFn: listMeals,
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildMealDetailsQuery(mealId: string) {
  return queryOptions({
    queryKey: ["meals", "detail", mealId],
    queryFn: () => getMealDetails(mealId),
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

function invalidateMealQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["meals"] });
  queryClient.invalidateQueries({ queryKey: ["saved-foods"] });
  queryClient.invalidateQueries({ queryKey: ["client-only-foods"] });
}

export function buildCreateMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => saveMeal(meal),
    onSuccess: (data) => {
      const meals = queryClient.getQueryData<Array<MealSummary>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(
          ["meals"],
          [...meals, mealSummaryFromMeal(data)],
        );
      }

      queryClient.setQueryData(["meals", "detail", data.id], data);
      invalidateMealQueries(queryClient);
    },
  });
}

export function buildUpdateMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => saveMeal(meal),
    onSuccess: (updatedMeal) => {
      const meals = queryClient.getQueryData<Array<MealSummary>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(
          ["meals"],
          meals.map((meal) =>
            meal.id === updatedMeal.id
              ? mealSummaryFromMeal(updatedMeal)
              : meal,
          ),
        );
      }

      queryClient.setQueryData(
        ["meals", "detail", updatedMeal.id],
        updatedMeal,
      );
      invalidateMealQueries(queryClient);
    },
  });
}

export function buildDeleteMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (mealId: string) => {
      const store = getDefaultStore();
      const { meals } = await store.get(mealsAtom);
      await store.set(mealsAtom, {
        meals: meals.filter((meal) => meal.id !== mealId),
      });
    },
    onSuccess: (_data, mealId) => {
      const meals = queryClient.getQueryData<Array<MealSummary>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(
          ["meals"],
          meals.filter((meal) => meal.id !== mealId),
        );
      }

      invalidateMealQueries(queryClient);
    },
  });
}
