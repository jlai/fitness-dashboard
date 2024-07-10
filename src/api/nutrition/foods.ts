import { QueryClient } from "@tanstack/react-query";

import { makeRequest } from "../request";
import mutationOptions from "../mutation-options";

export function buildAddFavoriteFoodsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (foodIds: Array<number>) => {
      for (const foodId of foodIds) {
        await makeRequest(`/1/user/-/foods/log/favorite/${foodId}.json`, {
          method: "POST",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-foods"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-foods"] });
    },
  });
}
