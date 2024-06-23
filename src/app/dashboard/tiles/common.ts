import { useSuspenseQuery } from "@tanstack/react-query";

import { getDailySummaryQuery } from "@/api/activity";

import { useSelectedDay } from "../state";

export function useDailySummary() {
  const day = useSelectedDay();
  const { data: dailySummary } = useSuspenseQuery(getDailySummaryQuery(day));

  return dailySummary;
}
