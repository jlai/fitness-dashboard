import { queryOptions } from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { makeRequest } from "../request";
import { formatAsDate } from "../datetime";
import { graduallyStale } from "../cache-settings";

import { GetDailyActivitySummaryResponse } from "./types";

export function buildDailySummaryQuery(day: Dayjs) {
  const date = formatAsDate(day);

  return queryOptions({
    queryKey: ["activity-daily-summary", date],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/date/${date}.json`
      );

      return (await response.json()) as GetDailyActivitySummaryResponse;
    },
    staleTime: graduallyStale(day),
  });
}
