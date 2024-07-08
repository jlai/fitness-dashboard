import { queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetActivityTypesResponse } from "./types";

export function getActivityTypesQuery() {
  return queryOptions({
    queryKey: ["activity-types"],
    queryFn: async () => {
      const response = await makeRequest(`/1/activities.json`);

      return (await response.json()) as GetActivityTypesResponse;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
