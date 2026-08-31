import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";

import { buildDailySummaryQuery } from "@/api/exercise";

import { useSelectedDay } from "../state";

export function useDailySummary() {
  const day = useSelectedDay();
  const { data: dailySummary } = useSuspenseQuery(buildDailySummaryQuery(day));

  return dailySummary;
}
