import { useSuspenseQuery } from "@tanstack/react-query";

import {
  buildTimeSeriesQuery,
  getTimeSeriesValueForDay,
  TimeSeriesEntry,
  TimeSeriesResource,
} from "@/api/times-series";

import { useSelectedDay } from "../state";

export function useSelectedDayTimeSeries<TValue = string>(
  resource: TimeSeriesResource,
) {
  const day = useSelectedDay();
  const { data } = useSuspenseQuery(
    buildTimeSeriesQuery<TimeSeriesEntry<TValue>>(resource, day, day),
  );

  return getTimeSeriesValueForDay(data, day);
}
