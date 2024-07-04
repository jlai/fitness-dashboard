import { queryOptions } from "@tanstack/react-query";

import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";

import { GetActivityLogResponse } from "./types";

export function getActivityQuery(id: string) {
  return queryOptions({
    queryKey: ["activity", id],
    queryFn: async () => {
      const response = await makeRequest(`/1.1/user/-/activities/${id}.json`);

      return ((await response.json()) as GetActivityLogResponse).activityLog;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function getActivityTcxQuery(id: string) {
  return queryOptions({
    queryKey: ["activity-tcx", id],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/activities/${id}.tcx`);

      return await response.text();
    },
    staleTime: Infinity,
  });
}
