import { queryOptions, QueryClient } from "@tanstack/react-query";

import { makeRequest } from "../request";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetMealResponse, GetMealsResponse, Meal } from "./types";

export function buildMealsQuery() {
  return queryOptions({
    queryKey: ["meals"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/meals.json`);

      return ((await response.json()) as GetMealsResponse).meals;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

function serializeMeal(meal: Meal) {
  return JSON.stringify({
    name: meal.name,
    description: meal.description,
    mealFoods: meal.mealFoods.map((food) => ({
      foodId: food.foodId,
      amount: food.amount,
      unitId: food.unit!.id,
    })),
  });
}

export function buildCreateMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => {
      const response = await makeRequest(`/1/user/-/meals.json`, {
        method: "POST",
        body: serializeMeal(meal),
      });

      return ((await response.json()) as GetMealResponse).meal;
    },
    onSuccess: (data, variables) => {
      const meals = queryClient.getQueryData<Array<Meal>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(["meals"], [...meals, data]);
      }
    },
  });
}

export function buildUpdateMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => {
      const response = await makeRequest(`/1/user/-/meals/${meal.id}.json`, {
        method: "POST",
        body: serializeMeal(meal),
      });

      return ((await response.json()) as GetMealResponse).meal;
    },
    onSuccess: (updatedMeal) => {
      const meals = queryClient.getQueryData<Array<Meal>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(
          ["meals"],
          meals.map((meal) => (meal.id === updatedMeal.id ? updatedMeal : meal))
        );
      }
    },
  });
}

export function buildDeleteMealMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (mealId: string) => {
      await makeRequest(`/1/user/-/meals/${mealId}.json`, {
        method: "DELETE",
      });
    },
    onSuccess: (data, variables) => {
      const meals = queryClient.getQueryData<Array<Meal>>(["meals"]);

      if (meals) {
        queryClient.setQueryData(
          ["meals"],
          meals.filter((meal) => meal.id !== variables)
        );
      }
    },
  });
}
