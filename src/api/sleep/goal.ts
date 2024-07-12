import { queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetSleepGoalResponse } from "./types";

export function buildGetSleepGoalQuery() {
  return queryOptions({
    queryKey: ["sleep-goal"],
    queryFn: async () => {
      const response = await makeRequest(`/1.2/user/-/sleep/goal.json`);

      return ((await response.json()) as GetSleepGoalResponse).goal;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
