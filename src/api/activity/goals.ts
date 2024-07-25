import { queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetActivityGoalsResponse } from "./types";

export function buildActivityGoalsQuery(period: "daily" | "weekly") {
  return queryOptions({
    queryKey: ["activity-goals", period],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/goals/${period}.json`
      );

      return ((await response.json()) as GetActivityGoalsResponse).goals;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
