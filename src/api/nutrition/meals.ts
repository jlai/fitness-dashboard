import { queryOptions, QueryClient } from "@tanstack/react-query";

import { db as dashDb } from "@/storage/db/dashdb";
import type { ClientOnlyMeal, ClientOnlyMealFood } from "@/storage/db/dashdb";
import {
  mealFoodFromResolvedFood,
  mealToClientOnlyMeal,
} from "@/storage/db/fitbit-to-health";
import { importFromFitbitMigrationDb } from "@/storage/db/import-from-fitbit-migration";

import { isValidDataPointId, getDataPoint } from "../datapoints";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { foodResourceName } from "./food-log";
import {
  foodToDataPoint,
  mapFoodDataPoint,
  mapFoodDataPoints,
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

async function resolveMealFood(item: ClientOnlyMealFood): Promise<MealFood> {
  const foodId = item.foodId;
  const foodName = foodResourceName(foodId);
  const local = await dashDb.clientOnlyFoods.get(foodName);

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

async function hydrateMeal(meal: ClientOnlyMeal): Promise<Meal> {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description,
    mealFoods: await Promise.all(meal.foods.map(resolveMealFood)),
  };
}

async function listMeals(): Promise<Meal[]> {
  await importFromFitbitMigrationDb();
  const meals = await dashDb.clientOnlyMeals.toArray();
  return Promise.all(meals.map(hydrateMeal));
}

async function savePrivateMealFoods(meal: Meal) {
  const privateFoods = meal.mealFoods.filter(
    (food) => food.accessLevel === "PRIVATE",
  );

  if (privateFoods.length === 0) {
    return;
  }

  await dashDb.clientOnlyFoods.bulkPut(
    privateFoods.map((food) => foodToDataPoint(food)),
  );
}

function newMealId() {
  return crypto.randomUUID();
}

async function saveMeal(meal: Meal): Promise<Meal> {
  await importFromFitbitMigrationDb();

  const id = meal.id || newMealId();
  const stored = mealToClientOnlyMeal({ ...meal, id });

  await dashDb.transaction(
    "rw",
    dashDb.clientOnlyMeals,
    dashDb.clientOnlyFoods,
    async () => {
      await dashDb.clientOnlyMeals.put(stored);
      await savePrivateMealFoods({ ...meal, id });
    },
  );

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
      await dashDb.clientOnlyMeals.delete(mealId);
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
