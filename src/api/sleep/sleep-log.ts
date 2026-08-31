import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { SleepType } from "@generated/orval/fetch/google-health-api/models";
import { healthUsersDataTypesDataPointsCreate } from "@generated/orval/fetch/google-health-api/users/users";

import {
  buildOneDayDatapointsQuery,
  listDataPointsPage,
} from "../datapoints";
import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";

import type { SleepDataPoint, SleepListResponse } from "./types";

interface CreateSleepLogOptions {
  startTime: Dayjs;
  endTime: Dayjs;
}

const MAX_SLEEP_PAGE_SIZE = 25;

function utcOffsetDuration(day: Dayjs) {
  return `${day.utcOffset() * 60}s`;
}

function sleepLogsEndingBeforeFilter(before: Dayjs) {
  return `sleep.interval.end_time < "${before.toISOString()}"`;
}

export function buildCreateSleepLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newSleepLog: CreateSleepLogOptions) => {
      const { startTime, endTime } = newSleepLog;
      const startUtcOffset = utcOffsetDuration(startTime);
      const endUtcOffset = utcOffsetDuration(endTime);

      const response = await healthUsersDataTypesDataPointsCreate(
        "me",
        "sleep",
        {
          sleep: {
            interval: {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              startUtcOffset,
              endUtcOffset,
            },
            type: SleepType.CLASSIC,
          },
        }
      );

      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "datapoints",
          "sleep",
          formatAsDate(variables.startTime),
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "datapoints",
          "sleep",
          formatAsDate(variables.endTime),
        ],
      });
      queryClient.resetQueries({
        queryKey: ["sleep-log-list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeseries", "sleep"],
      });
    },
  });
}

export function buildGetSleepLogByDateQuery(day: Dayjs) {
  return queryOptions({
    ...buildOneDayDatapointsQuery("sleep", day),
    select: ({ dataPoints }) => dataPoints,
  });
}

export function buildGetSleepLogListInfiniteQuery(
  initialDay: Dayjs,
  pageSize: number
) {
  return infiniteQueryOptions({
    queryKey: ["sleep-log-list", formatAsDate(initialDay), pageSize],
    queryFn: async ({ pageParam }: { pageParam: string }) => {
      const dataPoints: Array<SleepDataPoint> = [];
      let pageToken: string | undefined = pageParam || undefined;

      while (dataPoints.length < pageSize) {
        const page = await listDataPointsPage(
          "sleep",
          sleepLogsEndingBeforeFilter(initialDay.endOf("day")),
          pageToken,
          Math.min(pageSize - dataPoints.length, MAX_SLEEP_PAGE_SIZE)
        );

        dataPoints.push(...page.dataPoints);
        pageToken = page.nextPageToken;

        if (!pageToken || page.dataPoints.length === 0) {
          break;
        }
      }

      const response: SleepListResponse = {
        sleep: dataPoints,
        pagination: {
          afterDate: "",
          limit: pageSize,
          next: pageToken ?? "",
          previous: "",
          sort: "desc",
        },
      };

      return response;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.next || null,
    initialPageParam: "",
  });
}
