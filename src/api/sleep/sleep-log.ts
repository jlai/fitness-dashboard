import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import { makeRequest } from "../request";

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

export function buildGetSleepLogListInfiniteQuery(initialDay: Dayjs) {
  return infiniteQueryOptions({
    queryKey: ["sleep-log-list", formatAsDate(initialDay)],
    queryFn: async ({ pageParam }) => {
      const queryString =
        pageParam ||
        `limit=10&offset=0&sort=desc&beforeDate=${encodeURIComponent(
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
