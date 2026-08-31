import { queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import { ONE_HOUR_IN_MILLIS } from "../cache-settings";

import { GetLifetimeStatsResponse } from "./types";

export function buildLifetimeStatsQuery() {
  return queryOptions({
    queryKey: ["lifetime-stats"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/activities.json`);

      return (await response.json()) as GetLifetimeStatsResponse;
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}
