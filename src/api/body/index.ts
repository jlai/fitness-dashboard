import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

import { formatAsDate } from "../datetime";
import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import {
  GetBodyWeightGoalResponse,
  GetWeightTimeSeriesResponse,
} from "./types";

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

export function buildGetWeightTimeSeriesQuery(startDay: Dayjs, endDay: Dayjs) {
  return queryOptions({
    queryKey: [
      "weight-time-series",
      formatAsDate(startDay),
      formatAsDate(endDay),
    ],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/body/log/weight/date/${formatAsDate(
          startDay
        )}/${formatAsDate(endDay)}.json`
      );

      return ((await response.json()) as GetWeightTimeSeriesResponse).weight;
    },
  });
}
