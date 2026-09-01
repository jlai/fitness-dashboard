import { queryOptions, QueryClient } from "@tanstack/react-query";

import mutationOptions from "../mutation-options";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { Meal } from "./types";

export function buildMealsQuery() {
  return queryOptions({
    queryKey: ["meals"],
    queryFn: async (): Promise<Meal[]> => {
      // Disabled: meals are not available on the Google Health API yet.
      return [];
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildCreateMealMutation(_queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => {
      // Disabled: meals are not available on the Google Health API yet.
      return meal;
    },
  });
}

export function buildUpdateMealMutation(_queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (meal: Meal) => {
      // Disabled: meals are not available on the Google Health API yet.
      return meal;
    },
  });
}

export function buildDeleteMealMutation(_queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (_mealId: string) => {
      // Disabled: meals are not available on the Google Health API yet.
    },
  });
}
