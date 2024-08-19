import { createContext, useContext } from "react";
import dayjs from "dayjs";

import { DayjsRange } from "@/components/calendar/period-navigator";

export type AggregationType = "day" | "month";

interface TimeSeriesChartConfig {
  range: DayjsRange;
  aggregation?: "hour" | "day" | "month";
  layout?: "horizontal" | "vertical";
  showGoals?: boolean;

  // Element to portal stats into
  statsEl?: HTMLElement;

  // Override date format for x-axis
  formatDate?: (date: Date) => string;
}

export const TimeSeriesChartContext = createContext<TimeSeriesChartConfig>({
  range: {
    startDay: dayjs(),
    endDay: dayjs(),
  },
});

export function useTimeSeriesChartConfig() {
  return useContext(TimeSeriesChartContext);
}
