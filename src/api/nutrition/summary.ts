import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

import { formatAsDate } from "../datetime";
import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS, graduallyStale } from "../cache-settings";

import type { GetFoodLogResponse, GetWaterGoalResponse } from "./types";

export function getFoodLogQuery(day: Dayjs) {
  const date = formatAsDate(day);

  return queryOptions({
    queryKey: ["food-log", date],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/foods/log/date/${date}.json`
      );

      return (await response.json()) as GetFoodLogResponse;
    },
    staleTime: graduallyStale(day),
  });
}

export function getWaterGoalQuery() {
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
