import { queryOptions } from "@tanstack/react-query";
import { queryClientAtom } from "jotai-tanstack-query";
import { atom } from "jotai";

import { ONE_HOUR_IN_MILLIS } from "../cache-settings";
import { listDataPoints, listDataPointsPage } from "../datapoints";

import { mapFoodDataPoints, mapFoodMeasurementUnit } from "./helpers";
import { Food, FoodUnit, SearchFoodsResponse } from "./types";

type FoodList = Array<Food>;

const ENABLE_FOOD_SEARCH = true;
const ENABLE_LIST_AVAILABLE_FOODS = false;
const FOOD_SEARCH_PAGE_SIZE = 50;

async function listAvailableFoods() {
  if (!ENABLE_LIST_AVAILABLE_FOODS) {
    return [];
  }

  const { dataPoints } = await listDataPoints("food");
  return mapFoodDataPoints(dataPoints);
}

function escapeFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function foodDisplayNameFilter(query: string) {
  return `food.display_name = "${escapeFilterValue(query.trim())}"`;
}

async function searchAvailableFoods(
  query: string,
): Promise<SearchFoodsResponse> {
  const needle = query.trim();
  if (!ENABLE_FOOD_SEARCH || !needle) {
    return { foods: [] };
  }

  const { dataPoints } = await listDataPointsPage(
    "food",
    foodDisplayNameFilter(needle),
    undefined,
    FOOD_SEARCH_PAGE_SIZE,
  );

  return {
    foods: await mapFoodDataPoints(dataPoints),
  };
}

export function buildSearchFoodsQuery(query: string) {
  return queryOptions({
    queryKey: ["search-foods", query],
    queryFn: () => searchAvailableFoods(query),
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildCustomFoodsQuery() {
  return queryOptions({
    queryKey: ["custom-foods"],
    queryFn: async () => {
      const foods = await listAvailableFoods();
      return foods.filter((food) => food.accessLevel === "PRIVATE");
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildFavoriteFoodsQuery() {
  return queryOptions({
    queryKey: ["favorite-foods"],
    queryFn: async (): Promise<FoodList> => [],
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildRecentFoodsQuery() {
  return queryOptions({
    queryKey: ["recent-foods"],
    queryFn: async (): Promise<FoodList> => [],
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildFrequentFoodsQuery() {
  return queryOptions({
    queryKey: ["frequent-foods"],
    queryFn: async (): Promise<FoodList> => [],
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

const ENABLE_FOOD_UNITS = false;

async function listFoodUnits() {
  const { dataPoints } = await listDataPoints("food-measurement-unit");
  return dataPoints.map(mapFoodMeasurementUnit);
}

export function buildFoodUnitsQuery() {
  return queryOptions({
    queryKey: ["food-units"],
    queryFn: async () => {
      if (!ENABLE_FOOD_UNITS) {
        return [];
      }

      return listFoodUnits();
    },
    staleTime: Infinity,
  });
}

export const foodUnitsByIdAtom = atom(async (get) => {
  const queryClient = get(queryClientAtom);
  const foodUnits = await queryClient.fetchQuery(buildFoodUnitsQuery());

  const map = new Map<string, FoodUnit>();
  for (const foodUnit of foodUnits) {
    map.set(foodUnit.id, foodUnit);
  }

  return map;
});
