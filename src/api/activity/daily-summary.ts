import { queryOptions } from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { makeRequest } from "../request";
import { formatAsDate } from "../datetime";
import { graduallyStale } from "../cache-settings";

import { DailyActivitySummaryResponse } from "./types";

export function getDailySummaryQuery(day: Dayjs) {
  const date = formatAsDate(day);

  return queryOptions({
    queryKey: ["activity-daily-summary", date],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/date/${date}.json`
      );

      return (await response.json()) as DailyActivitySummaryResponse;
    },
    staleTime: graduallyStale(day),
  });
}
