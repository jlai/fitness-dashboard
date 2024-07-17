import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { buildTimeSeriesQuery, TimeSeriesResource } from "@/api/times-series";

import { TimeSeriesChartContext } from "./context";

export interface TimeSeriesDatum {
  dateTime: string | Date;
}

export interface StringValueDatum {
  dateTime: string | Date;
  value: string;
}

export function useTimeSeriesData<TEntry = StringValueDatum>(
  resource: TimeSeriesResource
) {
  const {
    range: { startDay, endDay },
  } = useContext(TimeSeriesChartContext);
  const { data } = useQuery(
    buildTimeSeriesQuery<TEntry>(resource, startDay, endDay)
  );

  return data;
}
