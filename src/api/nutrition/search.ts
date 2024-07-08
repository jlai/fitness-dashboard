import { queryOptions } from "@tanstack/react-query";
import { queryClientAtom } from "jotai-tanstack-query";
import { atom } from "jotai";

import { makeRequest } from "../request";
import { ONE_HOUR_IN_MILLIS } from "../cache-settings";

import { Food, FoodUnit, SearchFoodsResponse } from "./types";

type FoodList = Array<Food>;

export function buildSearchFoodsQuery(query: string) {
  return queryOptions({
    queryKey: ["search-foods", query],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/foods/search.json?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Locale": "en_US",
          },
        }
      );

      return (await response.json()) as SearchFoodsResponse;
    },
  });
}

export function buildFavoriteFoodsQuery() {
  return queryOptions({
    queryKey: ["favorite-foods"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/foods/log/favorite.json`);

      return (await response.json()) as FoodList;
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildRecentFoodsQuery() {
  return queryOptions({
    queryKey: ["recent-foods"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/foods/log/recent.json`);

      return (await response.json()) as FoodList;
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildFrequentFoodsQuery() {
  return queryOptions({
    queryKey: ["frequent-foods"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/foods/log/frequent.json`);

      return (await response.json()) as FoodList;
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildFoodUnitsQuery() {
  return queryOptions({
    queryKey: ["food-units"],
    queryFn: async () => {
      const response = await makeRequest(`/1/foods/units.json`);

      return (await response.json()) as Array<FoodUnit>;
    },
    staleTime: Infinity,
  });
}

export const foodUnitsByIdAtom = atom(async (get) => {
  const queryClient = get(queryClientAtom);
  const foodUnits = await queryClient.fetchQuery(buildFoodUnitsQuery());

  const map = new Map<number, FoodUnit>();
  for (const foodUnit of foodUnits) {
    map.set(foodUnit.id, foodUnit);
  }

  return map;
});
