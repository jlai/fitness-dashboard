import { queryOptions, QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import type { ClientOnlyMeal, ClientOnlyMealFood } from "@/storage/db/dashdb";
import {
  mealFoodFromResolvedFood,
  mealToClientOnlyMeal,
} from "@/storage/db/fitbit-to-health";
import { customFoodsAtom } from "@/storage/custom-foods";
import { mealsAtom } from "@/storage/meals";

import { isValidDataPointId, getDataPoint } from "../datapoints";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { foodResourceName } from "./food-log";
import {
  foodToDataPoint,
  mapFoodDataPoint,
  mapFoodDataPoints,
  type FoodDataPoint,
} from "./helpers";
import { Meal, MealFood } from "./types";

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

function findLocalFood(
  customFoods: FoodDataPoint[],
  foodName: string,
): FoodDataPoint | undefined {
  return customFoods.find((food) => food.name === foodName);
}

async function resolveMealFood(
  item: ClientOnlyMealFood,
  customFoods: FoodDataPoint[],
): Promise<MealFood> {
  const foodId = item.foodId;
  const foodName = foodResourceName(foodId);
  const local = findLocalFood(customFoods, foodName);

  if (local) {
    return mealFoodFromResolvedFood(mapFoodDataPoint(local), item);
  }

  if (isValidDataPointId(foodId)) {
    try {
      const dataPoint = await getDataPoint("food", foodId);
      const [food] = await mapFoodDataPoints([dataPoint]);
      return mealFoodFromResolvedFood(food, item);
    } catch {
      // Public catalog foods may be unavailable offline or after id changes.
    }
  }

  return mealFoodFromResolvedFood(placeholderFood(foodId), item);
}

async function hydrateMeal(
  meal: ClientOnlyMeal,
  customFoods: FoodDataPoint[],
): Promise<Meal> {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description,
    mealFoods: await Promise.all(
      meal.foods.map((item) => resolveMealFood(item, customFoods)),
    ),
  };
}

async function listMeals(): Promise<Meal[]> {
  const store = getDefaultStore();
  const [{ meals }, { customFoods }] = await Promise.all([
    store.get(mealsAtom),
    store.get(customFoodsAtom),
  ]);
  return Promise.all(meals.map((meal) => hydrateMeal(meal, customFoods)));
}

function privateFoodDataPoints(meal: Meal): FoodDataPoint[] {
  return meal.mealFoods
    .filter((food) => food.accessLevel === "PRIVATE")
    .map((food) => foodToDataPoint(food));
}

function mergeCustomFoods(
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
  const stored = mealToClientOnlyMeal({ ...meal, id });
  const privateFoods = privateFoodDataPoints({ ...meal, id });

  const [{ meals }, { customFoods }] = await Promise.all([
    store.get(mealsAtom),
    store.get(customFoodsAtom),
  ]);

  const mealIndex = meals.findIndex((entry) => entry.id === id);
  const nextMeals =
    mealIndex >= 0
      ? meals.map((entry, index) => (index === mealIndex ? stored : entry))
      : [...meals, stored];

  await store.set(mealsAtom, { meals: nextMeals });
  if (privateFoods.length > 0) {
    await store.set(customFoodsAtom, {
      customFoods: mergeCustomFoods(customFoods, privateFoods),
    });
  }

  return { ...meal, id };
}

export function buildMealsQuery() {
  return queryOptions({
    queryKey: ["meals"],
    queryFn: listMeals,
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

function invalidateMealQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["meals"] });
  queryClient.invalidateQueries({ queryKey: ["saved-foods"] });
  queryClient.invalidateQueries({ queryKey: ["custom-foods"] });
  queryClient.invalidateQueries({ queryKey: ["client-only-foods"] });
}

export function buildCreateMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => saveMeal(meal),
    onSuccess: (data) => {
      const meals = queryClient.getQueryData<Array<Meal>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(["meals"], [...meals, data]);
      }

      invalidateMealQueries(queryClient);
    },
  });
}

export function buildUpdateMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => saveMeal(meal),
    onSuccess: (updatedMeal) => {
      const meals = queryClient.getQueryData<Array<Meal>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(
          ["meals"],
          meals.map((meal) =>
            meal.id === updatedMeal.id ? updatedMeal : meal,
          ),
        );
      }

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
      const meals = queryClient.getQueryData<Array<Meal>>(["meals"]);

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
