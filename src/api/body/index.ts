import dayjs, { Dayjs } from "dayjs";
import { QueryClient, queryOptions } from "@tanstack/react-query";

import { formatAsDate } from "../datetime";
import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";
import mutationOptions from "../mutation-options";
import { WeightUnitSystem } from "../user";

import {
  GetBodyWeightGoalResponse,
  GetWeightTimeSeriesResponse,
} from "./types";

interface CreateWeightLogOptions {
  weight: number;
  weightUnitSystem: WeightUnitSystem;
  day: Dayjs;
  percentFat?: number;
}

// Invalid weight logs and weight trend series
async function invalidateAllWeightTimeSeries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["weight-logs"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["timeseries", "weight"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["timeseries", "fat"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["timeseries", "bmi"],
    }),
  ]);
}

export function buildCreateWeightLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newWeightLog: CreateWeightLogOptions) => {
      const today = dayjs();
      const { day, weight, weightUnitSystem, percentFat } = newWeightLog;

      const params = new URLSearchParams();
      params.set("weight", `${weight}`);
      params.set("date", formatAsDate(day));
      if (day.isSame(today, "day")) {
        // use current (browser) time
        params.set("time", today.format("HH:mm:ss"));
      }

      await makeRequest(`/1/user/-/body/log/weight.json?${params.toString()}`, {
        method: "POST",
        headers: {
          "Accept-Language": weightUnitSystem,
        },
      });

      if (percentFat) {
        const fatParams = new URLSearchParams();
        fatParams.set("fat", `${percentFat}`);
        fatParams.set("date", formatAsDate(day));
        // API doesn't seem to work correctly if time is passed

        await makeRequest(
          `/1/user/-/body/log/fat.json?${fatParams.toString()}`,
          {
            method: "POST",
          }
        );
      }
    },
    onSuccess: async () => {
      await invalidateAllWeightTimeSeries(queryClient);
    },
  });
}

export function buildDeleteWeightLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (weightLogId: number) => {
      await makeRequest(`/1/user/-/body/log/weight/${weightLogId}.json?`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      await invalidateAllWeightTimeSeries(queryClient);
    },
  });
}

export function buildGetBodyWeightGoalQuery() {
  return queryOptions({
    queryKey: ["body-goal-weight"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/body/log/weight/goal.json`);

      return ((await response.json()) as GetBodyWeightGoalResponse).goal;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildGetWeightLogsQuery(
  startDay: Dayjs,
  endDay: Dayjs,
  weightUnitSystem: WeightUnitSystem
) {
  return queryOptions({
    queryKey: ["weight-logs", formatAsDate(startDay), formatAsDate(endDay)],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/body/log/weight/date/${formatAsDate(
          startDay
        )}/${formatAsDate(endDay)}.json`,
        {
          headers: {
            "Accept-Language": weightUnitSystem,
          },
        }
      );

      return ((await response.json()) as GetWeightTimeSeriesResponse).weight;
    },
  });
}
