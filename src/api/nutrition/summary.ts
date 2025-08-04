import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";
import camelcaseKeys from "camelcase-keys";

import { formatAsDate } from "../datetime";
import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS, graduallyStale } from "../cache-settings";

import type {
  GetFoodGoalResponse,
  GetFoodLogResponse,
  GetWaterGoalResponse,
} from "./types";

export function buildFoodLogQuery(day: Dayjs) {
  const date = formatAsDate(day);

  return queryOptions({
    queryKey: ["food-log", date],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/foods/log/date/${date}.json`
      );

      // Workaround: https://community.fitbit.com/t5/Web-API-Development/Nutrition-log-loggedFood-changed-unexpectedly-to-logged-food/m-p/5772376
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as GetFoodLogResponse;
    },
    staleTime: graduallyStale(day),
  });
}

export function buildWaterGoalQuery() {
  return queryOptions({
    queryKey: ["water-goal"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/foods/log/water/goal.json`);

      const waterGoalResponse = (await response.json()) as GetWaterGoalResponse;
      return waterGoalResponse.goal.goal;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildFoodGoalQuery() {
  return queryOptions({
    queryKey: ["food-goal"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/foods/log/goal.json`);

      const foodGoalResponse = (await response.json()) as GetFoodGoalResponse;
      return foodGoalResponse;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
