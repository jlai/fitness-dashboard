import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import dayjs from "dayjs";

import { buildTimeSeriesQuery, TimeSeriesResource } from "@/api/times-series";

import { TimeSeriesChartContext } from "./context";

export interface TimeSeriesDatum {
  dateTime: string | Date;
}

export interface StringValueDatum {
  dateTime: string | Date;
  value: string;
}

export function useTimeSeriesQuery<TEntry = StringValueDatum>(
  resource: TimeSeriesResource
) {
  const {
    range: { startDay, endDay },
  } = useContext(TimeSeriesChartContext);
  return buildTimeSeriesQuery<TEntry>(resource, startDay, endDay);
}

export function useTimeSeriesData<TEntry = StringValueDatum>(
  resource: TimeSeriesResource
) {
  const query = useTimeSeriesQuery<TEntry>(resource);
  const { data } = useQuery(query);

  return data;
}

export function useRangeInfo() {
  const {
    range: { startDay, endDay },
  } = useContext(TimeSeriesChartContext);

  const numDays = endDay.diff(startDay, "days");
  const isIntraday = numDays === 0;

  return {
    numDays,
    isIntraday,
    startDay: isIntraday ? startDay.startOf("day") : startDay,
    endDay: isIntraday ? startDay.endOf("day") : startDay,
  };
}

export function removeFutureDates<TDatum extends TimeSeriesDatum>(
  data?: Array<TDatum>
) {
  const today = dayjs().endOf("day");
  return data?.filter((data) => !dayjs(data.dateTime).isAfter(today));
}
