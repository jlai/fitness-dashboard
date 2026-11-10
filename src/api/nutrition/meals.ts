import { queryOptions, QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import type { ClientOnlyMeal, ClientOnlyMealFood } from "@/storage/meals";
import {
  foodTemplateToFood,
  type FoodTemplate,
} from "@/api/nutrition/food-templates";
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
  foodIdFromReference,
  isFoodReference,
  foodTemplateIdFromReference,
  foodTemplateReference,
} from "./food-references";
import {
  foodToDataPoint,
  mapFoodDataPoint,
  mapFoodDataPoints,
} from "./helpers";
import { Meal, MealFood, MealSummary } from "./types";
import { logError } from "@/utils/log-error";

const MEAL_DESCRIPTION_REFRESH_LIMIT = 50;

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
  clientOnlyFoods: FoodTemplate[],
  item: ClientOnlyMealFood,
): FoodTemplate | undefined {
  const templateId = foodTemplateIdFromReference(item.food);
  if (templateId) {
    return clientOnlyFoods.find((food) => food.id === templateId);
  }
  return undefined;
}

async function resolveMealFood(
  item: ClientOnlyMealFood,
  clientOnlyFoods: FoodTemplate[],
): Promise<MealFood> {
  const local = findLocalFood(clientOnlyFoods, item);

  if (local) {
    return mealFoodFromResolvedFood(foodTemplateToFood(local), item);
  }

  // Local templates are never requested from Google Health. A deleted template
  // remains replaceable in the meal editor.
  const templateId = foodTemplateIdFromReference(item.food);
  if (templateId) {
    return {
      ...mealFoodFromResolvedFood(placeholderFood(templateId), item),
      foodNotFound: true,
    };
  }

  const foodId = foodIdFromReference(item.food);

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
  clientOnlyFoods: FoodTemplate[],
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

function storedMealFoodId(food: ClientOnlyMealFood): string {
  return food.food;
}

export async function refreshMealDescriptions() {
  const store = getDefaultStore();
  const queryClient = store.get(queryClientAtom);
  const [{ meals }, { clientOnlyFoods }] = await Promise.all([
    store.get(mealsAtom),
    store.get(clientOnlyFoodsAtom),
  ]);
  const missingFoods = meals.flatMap((meal) =>
    meal.foods.filter((food) => !food.cachedDisplayName),
  );
  const foodReferences = [
    ...new Set(missingFoods.map(storedMealFoodId).filter(isFoodReference)),
  ];
  const requestedFoodReferences = foodReferences.slice(
    0,
    MEAL_DESCRIPTION_REFRESH_LIMIT,
  );
  let updated = 0;
  let failed = 0;

  try {
    for (const foodReference of requestedFoodReferences) {
      const food = missingFoods.find(
        (item) => storedMealFoodId(item) === foodReference,
      );
      if (!food) {
        continue;
      }

      let displayName: string;
      const localFood = findLocalFood(clientOnlyFoods, food);
      if (localFood) {
        displayName = foodTemplateToFood(localFood).name;
        if (!displayName.trim()) {
          failed++;
          logError(`Food template "${foodReference}" has no display name`);
          continue;
        }
      } else if (foodTemplateIdFromReference(food.food)) {
        continue;
      } else {
        const foodId = foodIdFromReference(food.food);
        if (!foodId) continue;
        try {
          const dataPoint = await getDataPoint("food", foodId);
          displayName = mapFoodDataPoint(dataPoint).name;
          if (!displayName.trim()) {
            throw new Error(`Food ${foodReference} has no display name`);
          }
        } catch (error) {
          if (isNotFoundError(error)) {
            displayName = "[missing]";
          } else {
            failed++;
            logError(`Failed to refresh meal food "${foodReference}"`, error);
            continue;
          }
        }
      }

      const latest = await store.get(mealsAtom);
      if (
        !latest.meals.some((meal) =>
          meal.foods.some(
            (item) =>
              storedMealFoodId(item) === foodReference &&
              !item.cachedDisplayName,
          ),
        )
      ) {
        continue;
      }

      let updatedCount = 0;
      await store.set(mealsAtom, (current) => ({
        meals: current.meals.map((meal) => {
          let mealUpdated = false;
          const foods = meal.foods.map((item) => {
            if (
              storedMealFoodId(item) !== foodReference ||
              item.cachedDisplayName
            ) {
              return item;
            }
            mealUpdated = true;
            updatedCount++;
            return { ...item, cachedDisplayName: displayName };
          });
          return mealUpdated ? { ...meal, foods } : meal;
        }),
      }));
      updated += updatedCount;
    }
  } finally {
    await queryClient.invalidateQueries({ queryKey: ["meals"] });
  }

  return {
    updated,
    failed,
    remaining: foodReferences.length - requestedFoodReferences.length,
  };
}

async function getMealDetails(mealId: string): Promise<Meal> {
  const store = getDefaultStore();
  const { meals } = await store.get(mealsAtom);
  const { clientOnlyFoods } = await store.get(clientOnlyFoodsAtom);
  const meal = meals.find((item) => item.id === mealId);

  if (!meal) {
    throw new Error(`Meal not found: ${mealId}`);
  }

  return hydrateMeal(meal, clientOnlyFoods);
}

function privateFoodTemplates(meal: Meal): FoodTemplate[] {
  return meal.mealFoods
    .filter((food) => food.accessLevel === "PRIVATE")
    .map((food) => ({
      id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(food.foodId),
      )
        ? String(food.foodId)
        : crypto.randomUUID(),
      food: foodToDataPoint(food).food!,
    }));
}

function mergeClientOnlyFoods(
  existing: FoodTemplate[],
  additions: FoodTemplate[],
): FoodTemplate[] {
  if (additions.length === 0) {
    return existing;
  }

  const byId = new Map(existing.map((food) => [food.id, food]));
  for (const food of additions) {
    byId.set(food.id, food);
  }
  return [...byId.values()];
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
  const privateFoods = privateFoodTemplates(savedMeal);
  const availableLocalFoods = mergeClientOnlyFoods(
    clientOnlyFoods,
    privateFoods,
  );

  const stored = {
    ...mealToClientOnlyMeal(savedMeal),
    foods: savedMeal.mealFoods.map((food) => {
      const customFood = availableLocalFoods.find(
        (entry) =>
          entry.id === String(food.foodId) ||
          entry.customFood === foodResourceName(String(food.foodId)),
      );
      const serving = servingFromMealFood(food);

      if (customFood) {
        return {
          serving,
          food: foodTemplateReference(customFood.id),
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
  const mealIndex = meals.findIndex((entry) => entry.id === id);
  const nextMeals =
    mealIndex >= 0
      ? meals.map((entry, index) => (index === mealIndex ? stored : entry))
      : [...meals, stored];

  await store.set(mealsAtom, { meals: nextMeals });
  if (privateFoods.length > 0) {
    await store.set(clientOnlyFoodsAtom, {
      clientOnlyFoods: availableLocalFoods,
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
