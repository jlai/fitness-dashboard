import {
  infiniteQueryOptions,
  QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";
import mutationOptions from "../mutation-options";
import { formatAsDate } from "../datetime";

import {
  ActivityLog,
  GetActivityLogListResponse,
  GetActivityLogResponse,
} from "./types";

export function buildGetActivityLogQuery(id: number) {
  return queryOptions({
    queryKey: ["activity-log", id],
    queryFn: async () => {
      const response = await makeRequest(`/1.1/user/-/activities/${id}.json`);

      return ((await response.json()) as GetActivityLogResponse).activityLog;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildActivityTcxQuery(id: number) {
  return queryOptions({
    queryKey: ["activity-tcx", id],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/${id}.tcx?includePartialTCX=true`
      );

      return await response.text();
    },
    staleTime: Infinity,
  });
}

// Yes the pluralization is inconsistent, yes it has to be this way
export type CreateActivityLogDistanceUnit =
  | "mile"
  | "steps"
  | "yards"
  | "meter"
  | "kilometer";

export interface CreateActivityLogOptions {
  activityId: number;
  startTime: Dayjs;
  durationMinutes: number;
  distance?: number;
  distanceUnit?: CreateActivityLogDistanceUnit;
  manualCalories?: number;
}

export function buildCreateActivityLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newActivityLog: CreateActivityLogOptions) => {
      const {
        activityId,
        startTime,
        durationMinutes,
        manualCalories,
        distance,
        distanceUnit,
      } = newActivityLog;

      const params = new URLSearchParams();
      params.set("activityId", `${activityId}`);
      params.set("date", formatAsDate(startTime));
      params.set("startTime", startTime.format("HH:mm"));
      params.set("durationMillis", `${durationMinutes * 60 * 1000}`);

      // Currently required, 0 for unknown
      params.set("manualCalories", `${newActivityLog.manualCalories ?? 0}`);

      if ((distance || distance === 0) && distanceUnit) {
        params.set("distance", `${distance}`);
        params.set("distanceUnit", `${distanceUnit}`);
      }

      const response = await makeRequest(
        `/1/user/-/activities.json?${params.toString()}`,
        {
          method: "POST",
        }
      );

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.resetQueries({
        queryKey: ["activity-log-list"],
      });

      queryClient.invalidateQueries({
        queryKey: ["activity-daily-summary", formatAsDate(variables.startTime)],
      });
    },
  });
}

export function isPossiblyTracked(activity: ActivityLog) {
  return (
    (activity.logType === "mobile_run" || activity.logType === "tracker") &&
    activity.distance
  );
}

export function buildGetActivityListInfiniteQuery(
  initialDay: Dayjs,
  pageSize: number
) {
  return infiniteQueryOptions({
    queryKey: ["activity-log-list", formatAsDate(initialDay), pageSize],
    queryFn: async ({ pageParam }) => {
      const queryString =
        pageParam ||
        `limit=${pageSize}&offset=0&sort=desc&beforeDate=${encodeURIComponent(
          initialDay.toISOString().replace("Z", "")
        )}`;

      const response = await makeRequest(
        `/1/user/-/activities/list.json?${queryString}`
      );
      return (await response.json()) as GetActivityLogListResponse;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.next
        ? new URL(lastPage.pagination.next).search.replace(/^\?/, "")
        : null,
    initialPageParam: "",
  });
}

export function buildDeleteActivityLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (activityLogId: number) => {
      // FIXME workaround for server 502 issue
      try {
        await makeRequest(`/1/user/-/activities/${activityLogId}.json`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error("ignoring error", e);
      }
    },
    onSuccess: () => {
      queryClient.resetQueries({
        queryKey: ["activity-log-list"],
      });
    },
  });
}
