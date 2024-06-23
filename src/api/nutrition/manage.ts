import { queryOptions, QueryClient } from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { makeRequest } from "../request";
import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetMealResponse, GetMealsResponse, Meal, MealType } from "./types";

export function getMealsQuery() {
  return queryOptions({
    queryKey: ["meals"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/meals.json`);

      return ((await response.json()) as GetMealsResponse).meals;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

const AMOUNT_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export interface CreateFoodLogOptions {
  foodId: number;
  mealTypeId: MealType;
  unitId: number;
  amount: number;
  day: Dayjs;
}

async function logFood(newFood: CreateFoodLogOptions) {
  const params = new URLSearchParams();
  params.set("foodId", `${newFood.foodId}`);
  params.set("mealTypeId", `${newFood.mealTypeId}`);
  params.set("amount", AMOUNT_FORMAT.format(newFood.amount));
  params.set("unitId", `${newFood.unitId}`);
  params.set("date", formatAsDate(newFood.day));

  const response = await makeRequest(
    `/1/user/-/foods/log.json?${params.toString()}`,
    {
      method: "POST",
    }
  );

  return response;
}

export function getCreateFoodLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: logFood,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["food-log", formatAsDate(variables.day)],
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-foods"],
      });
    },
  });
}

export function getCreateMultipleFoodLogsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (foods: CreateFoodLogOptions[]) => {
      for (const food of foods) {
        await logFood(food);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["food-log", formatAsDate(variables[0]?.day)],
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-foods"],
      });
    },
  });
}

export interface CreateWaterLogOptions {
  amount: number;
  unit: "ml" | "fl oz" | "cup";
  day: Dayjs;
}

export function getCreateWaterLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newWaterLog: CreateWaterLogOptions) => {
      const params = new URLSearchParams();
      params.set("amount", AMOUNT_FORMAT.format(newWaterLog.amount));
      params.set("unit", `${newWaterLog.unit}`);
      params.set("date", formatAsDate(newWaterLog.day));

      const response = await makeRequest(
        `/1/user/-/foods/log/water.json?${params.toString()}`,
        {
          method: "POST",
        }
      );

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["food-log", formatAsDate(variables.day)],
      });
    },
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

export function getCreateMealMutation(queryClient: QueryClient) {
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

export function getUpdateMealMutation(queryClient: QueryClient) {
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

export function getDeleteMealMutation(queryClient: QueryClient) {
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
