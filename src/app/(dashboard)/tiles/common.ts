import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";

import {
  buildDailySummaryQuery,
  GetDailyActivitySummaryResponse,
} from "@/api/activity";
import { buildActivityGoalsQuery } from "@/api/activity/goals";

import { useSelectedDay } from "../state";

export function useDailySummary() {
  const day = useSelectedDay();
  const { data: dailySummary } = useSuspenseQuery(buildDailySummaryQuery(day));

  // Older daily summaries seem to be missing goal information, so conditionally
  // fetch it if needed
  const [goalsResult] = useSuspenseQueries({
    queries: !dailySummary.goals
      ? [buildActivityGoalsQuery("daily")]
      : ([] as any),
  });

  if (!dailySummary.goals && goalsResult) {
    dailySummary.goals =
      goalsResult.data as GetDailyActivitySummaryResponse["goals"];
  }

  return dailySummary;
}
