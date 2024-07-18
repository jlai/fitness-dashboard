import { createContext } from "react";
import dayjs from "dayjs";

import { DayjsRange } from "@/components/calendar/period-navigator";

export type AggregationType = "day" | "month";

interface TimeSeriesChartConfig {
  range: DayjsRange;
  aggregation?: "day" | "month";

  // Override date format for x-axis
  formatDate?: (date: Date) => string;
}

export const TimeSeriesChartContext = createContext<TimeSeriesChartConfig>({
  range: {
    startDay: dayjs(),
    endDay: dayjs(),
  },
});
