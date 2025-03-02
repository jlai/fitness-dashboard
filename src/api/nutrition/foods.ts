import { QueryClient, queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetFoodResponse, NutritionalValues } from "./types";

async function invalidateCustomFoodQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: ["custom-foods"],
    refetchType: "all",
  });
  await queryClient.invalidateQueries({
    queryKey: ["saved-foods"],
    refetchType: "all",
  });
}

export function buildAddFavoriteFoodsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (foodIds: Array<number>) => {
      for (const foodId of foodIds) {
        await makeRequest(`/1/user/-/foods/log/favorite/${foodId}.json`, {
          method: "POST",
        });
      }
    },
    onSuccess: async () => {
      await invalidateCustomFoodQueries(queryClient);
    },
  });
}

export function buildDeleteFavoritesFoodMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (foodIds: Array<number>) => {
      for (const foodId of foodIds) {
        await makeRequest(`/1/user/-/foods/log/favorite/${foodId}.json`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: async () => {
      await invalidateCustomFoodQueries(queryClient);
    },
  });
}

export interface CreateCustomFoodOptions {
  foodId?: number; // undefined for new food
  name: string;
  brand?: string;
  formType: "DRY" | "LIQUID";
  defaultFoodMeasurementUnitId: number;
  defaultServingSize: number;
  calories: number;
  nutritionalValues?: NutritionalValues;
}

export function buildGetFoodQuery(foodId: number) {
  return queryOptions({
    queryKey: ["food", foodId],
    queryFn: async () => {
      const response = await makeRequest(`/1/foods/${foodId}.json`);

      return ((await response.json()) as GetFoodResponse).food;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildDeleteCustomFoodsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (foodIds: Array<number>) => {
      for (const foodId of foodIds) {
        await makeRequest(`/1/user/-/foods/${foodId}.json`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: async () => {
      await invalidateCustomFoodQueries(queryClient);
    },
  });
}

export function buildCreateCustomFoodMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (customFood: CreateCustomFoodOptions) => {
      const queryParams = new URLSearchParams();
      queryParams.set("name", customFood.name);
      queryParams.set("brand", customFood.brand ?? "");
      queryParams.set(
        "defaultFoodMeasurementUnitId",
        `${customFood.defaultFoodMeasurementUnitId}`
      );
      queryParams.set(
        "defaultServingSize",
        `${customFood.defaultServingSize ?? 1}`
      );
      queryParams.set("calories", `${customFood.calories}`);

      for (const [key, value] of Object.entries(
        customFood.nutritionalValues ?? {}
      )) {
        if (value !== undefined) {
          queryParams.set(key, `${value}`);
        }
      }

      const { foodId } = customFood;

      const url = foodId
        ? `/1/user/-/foods/${foodId}.json`
        : `/1/user/-/foods.json`;

      await makeRequest(`${url}?${queryParams.toString()}`, {
        method: "POST",
      });
    },
    onSuccess: async (data, variables) => {
      if (variables.foodId) {
        await queryClient.invalidateQueries({
          queryKey: ["food", variables.foodId],
        });
      }

      await invalidateCustomFoodQueries(queryClient);
    },
  });
}
