import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

import { buildOneDayDatapointsQuery } from "../datapoints";
import { graduallyStale, ONE_DAY_IN_MILLIS } from "../cache-settings";
import { formatAsDate } from "../datetime";
import { makeRequest } from "../request";

import {
  resolveNutritionLogServingUnits,
  summarizeNutritionLogs,
  type NutritionLogDataPoint,
} from "./helpers";
import type {
  FoodLogSummary,
  GetFoodGoalResponse,
  GetWaterGoalResponse,
} from "./types";

export type NutritionLogsResult = {
  dataPoints: NutritionLogDataPoint[];
  summary: FoodLogSummary;
};

export function buildFoodLogQuery(day: Dayjs) {
  const datapointsQuery = buildOneDayDatapointsQuery("nutrition-log", day);

  return queryOptions({
    queryKey: ["datapoints", "nutrition-log", formatAsDate(day)],
    staleTime: graduallyStale(day),
    queryFn: async (context) => {
      const queryFn = datapointsQuery.queryFn;
      if (typeof queryFn !== "function") {
        throw new Error("nutrition-log query is missing a queryFn");
      }

      const { dataPoints } = await queryFn(context);
      const resolved = await resolveNutritionLogServingUnits(dataPoints);

      return {
        dataPoints: resolved,
        summary: summarizeNutritionLogs(resolved),
      } satisfies NutritionLogsResult;
    },
  });
}
