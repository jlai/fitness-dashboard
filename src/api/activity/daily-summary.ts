import { queryOptions } from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { getJSON, makeRequest } from "../request";
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

      return await getJSON<GetDailyActivitySummaryResponse>(response);
    },
    staleTime: graduallyStale(day),
  });
}
