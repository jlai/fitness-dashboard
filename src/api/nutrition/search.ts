import { queryOptions } from "@tanstack/react-query";
import { queryClientAtom } from "jotai-tanstack-query";
import { atom, getDefaultStore } from "jotai";
import dayjs from "dayjs";

import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { foodTemplateToFood } from "@/api/nutrition/food-templates";
import type { FoodTemplate } from "@/api/nutrition/food-templates";
import { logError } from "@/utils/log-error";

import { ONE_HOUR_IN_MILLIS } from "../cache-settings";
import { formatAsCivilDateTime } from "../datetime";
import { buildUserSettingsQuery } from "../user";
import {
  getDataPoint,
  isValidDataPointId,
  listDataPoints,
  listDataPointsPage,
  timeRangeFilter,
} from "../datapoints";

import {
  mapFoodDataPoints,
  mapFoodMeasurementUnit,
  foodFromNutritionLog,
  getDataPointIdFromName,
  resolveNutritionLogServingUnits,
  type NutritionLogDataPoint,
} from "./helpers";
import {
  foodIdFromReference,
  foodTemplateIdFromReference,
} from "./food-references";
import { Food, FoodUnit, SearchFoodsResponse } from "./types";

type FoodList = Array<Food>;
export type FavoriteFood = Food & {
  unavailable?: boolean;
  foodReference: string;
};

const ENABLE_FOOD_SEARCH = true;
const ENABLE_LIST_AVAILABLE_FOODS = false;
const FOOD_SEARCH_PAGE_SIZE = 50;
const RECENT_FOODS_PAGE_SIZE = 20;
const DEFAULT_FOOD_LANGUAGE = "en_US";

function normalizeFoodLanguage(language?: string) {
  return (language || DEFAULT_FOOD_LANGUAGE).replaceAll("-", "_");
}

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

  const queryClient = getDefaultStore().get(queryClientAtom);
  const [settings, { dataPoints }] = await Promise.all([
    queryClient.fetchQuery(buildUserSettingsQuery()),
    listDataPointsPage(
      "food",
      foodDisplayNameFilter(needle),
      undefined,
      FOOD_SEARCH_PAGE_SIZE,
    ),
  ]);
  const foodLanguage = normalizeFoodLanguage(settings.foodLanguageCode);
  const foods = await mapFoodDataPoints(dataPoints);

  return {
    foods: foods.filter(
      (food) =>
        Boolean(food.locale) &&
        normalizeFoodLanguage(food.locale) === foodLanguage,
    ),
  };
}

export function buildSearchFoodsQuery(query: string) {
  return queryOptions({
    queryKey: ["search-foods", query],
    queryFn: () => searchAvailableFoods(query),
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildClientOnlyFoodsQuery() {
  return queryOptions({
    queryKey: ["client-only-foods"],
    queryFn: async () => {
      const store = getDefaultStore();
      const { clientOnlyFoods } = await store.get(clientOnlyFoodsAtom);
      const fromStorage = clientOnlyFoods.map(foodTemplateToFood);

      if (!ENABLE_LIST_AVAILABLE_FOODS) {
        return fromStorage;
      }

      const remote = await listAvailableFoods();
      const privateRemote = remote.filter(
        (food) => food.accessLevel === "PRIVATE",
      );
      return [...fromStorage, ...privateRemote];
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildFavoriteFoodsQuery(
  foodReferences: string[],
  clientOnlyFoods: FoodTemplate[],
  storageEpoch: number,
) {
  return queryOptions({
    queryKey: ["favorite-foods", foodReferences, clientOnlyFoods, storageEpoch],
    queryFn: async (): Promise<FavoriteFood[]> => {
      const localFoods = new Map(
        clientOnlyFoods.flatMap((food) => {
          return [[food.id, food] as const];
        }),
      );
      return Promise.all(
        foodReferences.map(async (foodReference): Promise<FavoriteFood> => {
          const templateId = foodTemplateIdFromReference(foodReference);
          const foodId = foodIdFromReference(foodReference);
          if (!templateId && !foodId) {
            throw new Error(
              `Invalid favorite food reference: ${foodReference}`,
            );
          }
          try {
            const template = templateId
              ? localFoods.get(templateId)
              : undefined;
            if (templateId && !template) {
              throw new Error("Favorite food template not found");
            }
            const food = template
              ? foodTemplateToFood(template)
              : (
                  await mapFoodDataPoints([await getDataPoint("food", foodId!)])
                )[0];
            return { ...food, foodReference };
          } catch (error) {
            logError("Failed to load a favorite food", error);
            return {
              foodId: foodId ?? templateId!,
              name: `Unavailable food (${foodReference})`,
              accessLevel: "PUBLIC",
              calories: 0,
              units: [],
              unavailable: true,
              foodReference,
            };
          }
        }),
      );
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}

export function buildRecentFoodsQuery() {
  return queryOptions({
    queryKey: ["recent-foods"],
    queryFn: async (): Promise<FoodList> => {
      const end = dayjs();
      const filter = timeRangeFilter(
        "nutrition-log",
        formatAsCivilDateTime(end.subtract(7, "day")),
        formatAsCivilDateTime(end),
        "civil",
      );
      const dataPoints: NutritionLogDataPoint[] = [];
      let pageToken: string | undefined;
      do {
        const page = await listDataPointsPage(
          "nutrition-log",
          filter,
          pageToken,
          RECENT_FOODS_PAGE_SIZE,
        );
        dataPoints.push(...page.dataPoints);
        pageToken = page.nextPageToken;
      } while (pageToken);
      const logs = await resolveNutritionLogServingUnits(dataPoints);
      logs.sort(
        (a, b) =>
          dayjs(b.nutritionLog.interval?.startTime).valueOf() -
          dayjs(a.nutritionLog.interval?.startTime).valueOf(),
      );

      const seen = new Set<string>();
      const foods = await Promise.all(
        logs.map(async ({ name, nutritionLog }) => {
          if (nutritionLog.food) {
            const foodId = getDataPointIdFromName(nutritionLog.food);
            if (
              !isValidDataPointId(foodId) ||
              !/^users\/[a-zA-Z0-9_-]+\/dataTypes\/food\/dataPoints\/[a-z0-9-]+$/.test(
                nutritionLog.food,
              )
            ) {
              throw new Error("Invalid food resource in nutrition log");
            }
            if (seen.has(foodId)) return null;
            seen.add(foodId);
            const dataPoint = await getDataPoint("food", foodId);
            const [food] = await mapFoodDataPoints([dataPoint]);
            return food;
          }

          if (!name || !nutritionLog.foodDisplayName) {
            throw new Error("Anonymous nutrition log is missing a name or ID");
          }
          const foodId = `recent-log:${name}`;
          if (seen.has(foodId)) return null;
          seen.add(foodId);
          const food = foodFromNutritionLog(nutritionLog);
          const unit = food.defaultUnit ?? {
            id: "",
            name: "serving",
            plural: "servings",
          };
          return {
            ...food,
            foodId,
            accessLevel: "PRIVATE" as const,
            sourceNutritionLogName: name,
            defaultUnit: unit,
            unit,
            units: [unit.id],
            servings: [
              {
                multiplier: 1,
                servingSize: food.defaultServingSize ?? 1,
                unit,
              },
            ],
          };
        }),
      );
      return foods.filter((food): food is Food => food !== null);
    },
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
