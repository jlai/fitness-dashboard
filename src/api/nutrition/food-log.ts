import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";

import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import { makeRequest } from "../request";

import { MealType } from "./types";

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

export interface UpdateFoodLogOptions {
  foodLogId: number;
  mealTypeId: MealType;
  unitId: number;
  amount: number;

  // Used for cache invalidation only
  day: Dayjs;
}

export interface DeleteFoodLogOptions {
  foodLogId: number;

  // Used for cache invalidation only
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

async function updateFood(updatedFood: UpdateFoodLogOptions) {
  const params = new URLSearchParams();
  params.set("mealTypeId", `${updatedFood.mealTypeId}`);
  params.set("amount", AMOUNT_FORMAT.format(updatedFood.amount));
  params.set("unitId", `${updatedFood.unitId}`);

  const response = await makeRequest(
    `/1/user/-/foods/log/${updatedFood.foodLogId}.json?${params.toString()}`,
    {
      method: "POST",
    }
  );

  return response;
}

export function buildCreateFoodLogMutation(queryClient: QueryClient) {
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

export function buildCreateMultipleFoodLogsMutation(queryClient: QueryClient) {
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

export function buildUpdateFoodLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: updateFood,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["food-log", formatAsDate(variables.day)],
      });
    },
  });
}

export function buildDeleteFoodLogsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (deletedFoods: Array<DeleteFoodLogOptions>) => {
      for (const food of deletedFoods)
        await makeRequest(`/1/user/-/foods/log/${food.foodLogId}.json`, {
          method: "DELETE",
        });
    },
    onSuccess: (data, variables) => {
      const days = new Set(
        variables.map((foodLog) => formatAsDate(foodLog.day))
      );

      for (const date of days) {
        queryClient.invalidateQueries({
          queryKey: ["food-log", date],
        });
      }
    },
  });
}
