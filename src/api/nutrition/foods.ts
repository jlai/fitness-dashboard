import { QueryClient, queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetFoodResponse, NutritionalValues } from "./types";

async function invalidateFavoriteFoodQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: ["favorite-foods"],
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
      await invalidateFavoriteFoodQueries(queryClient);
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
      await invalidateFavoriteFoodQueries(queryClient);
    },
  });
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
