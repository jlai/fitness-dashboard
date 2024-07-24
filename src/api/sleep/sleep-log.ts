import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import { makeRequest } from "../request";
import { graduallyStale } from "../cache-settings";

import { GetSleepLogListResponse } from "./types";

interface CreateSleepLogOptions {
  startTime: Dayjs;
  endTime: Dayjs;
}

export function buildCreateSleepLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newSleepLog: CreateSleepLogOptions) => {
      const { startTime, endTime } = newSleepLog;

      const params = new URLSearchParams();
      params.set("date", formatAsDate(startTime));
      params.set("startTime", startTime.format("HH:mm"));
      params.set("duration", `${endTime.diff(startTime)}`);

      const response = await makeRequest(
        `/1.1/user/-/sleep.json?${params.toString()}`,
        {
          method: "POST",
        }
      );

      return response;
    },
    onSuccess: () => {
      queryClient.resetQueries({
        queryKey: ["sleep-log-list"],
      });
    },
  });
}

export function buildGetSleepLogByDateQuery(day: Dayjs) {
  const date = formatAsDate(day);

  return queryOptions({
    queryKey: ["sleep-log", date],
    queryFn: async () => {
      const response = await makeRequest(`/1.2/user/-/sleep/date/${date}.json`);

      return ((await response.json()) as GetSleepLogListResponse).sleep;
    },
    staleTime: graduallyStale(day),
  });
}

export function buildGetSleepLogListInfiniteQuery(
  initialDay: Dayjs,
  pageSize: number
) {
  return infiniteQueryOptions({
    queryKey: ["sleep-log-list", formatAsDate(initialDay), pageSize],
    queryFn: async ({ pageParam }) => {
      const queryString =
        pageParam ||
        `limit=${pageSize}&offset=0&sort=desc&beforeDate=${encodeURIComponent(
          initialDay.toISOString().replace("Z", "")
        )}`;

      const response = await makeRequest(
        `/1.2/user/-/sleep/list.json?${queryString}`
      );
      return (await response.json()) as GetSleepLogListResponse;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.next
        ? new URL(lastPage.pagination.next).search.replace(/^\?/, "")
        : null,
    initialPageParam: "",
  });
}
