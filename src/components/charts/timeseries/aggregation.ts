import { useContext, useMemo } from "react";
import dayjs from "dayjs";
import { groupBy, sum, sumBy } from "lodash";

import { IntradayEntry } from "@/api/intraday";

import { TimeSeriesChartContext } from "./context";
import { ChartSeriesConfig } from "./series-config";
import { TimeSeriesDatum } from "./data";

interface MonthDatum extends TimeSeriesDatum {
  averageValues: Record<string, number | null>;
  totalValues: Record<string, number | null>;
}

export function useAggregation<TDatum extends TimeSeriesDatum>(
  data: Array<TDatum> | undefined,
  seriesConfigs: Array<ChartSeriesConfig<TDatum>>
): {
  data: Array<TimeSeriesDatum> | undefined;
  seriesConfigs: Array<ChartSeriesConfig<TimeSeriesDatum>>;
} {
  const context = useContext(TimeSeriesChartContext);

  return useMemo(() => {
    if (data && context.aggregation === "month") {
      const now = dayjs();

      // Exclude future data
      const filteredData = data.filter((entry) =>
        dayjs(entry.dateTime).isBefore(now)
      );

      const months = groupBy(filteredData, (entry) =>
        dayjs(entry.dateTime).format("YYYY-MM")
      );

      const monthData: Array<MonthDatum> = [];

      for (const [month, entries] of Object.entries(months)) {
        const monthDatum: MonthDatum = {
          dateTime: `${month}-01`,
          averageValues: {},
          totalValues: {},
        };

        for (const seriesConfig of seriesConfigs) {
          const values = entries
            .map((entry) => seriesConfig.yAccessor(entry))
            .filter((value) => value || value === 0);

          const total = sum(values);

          const average = values.length > 0 ? total / values.length : null;

          monthDatum.averageValues[seriesConfig.id] = average;
          monthDatum.totalValues[seriesConfig.id] = total;
        }

        monthData.push(monthDatum);
      }

      const monthSeriesConfigs = seriesConfigs.map(
        (config) =>
          ({
            ...config,
            label: `${config.label} (daily avg)`,
            yAccessor: (entry) => entry.averageValues[config.id],
          } as ChartSeriesConfig<MonthDatum>)
      );

      return {
        data: monthData,
        seriesConfigs: monthSeriesConfigs as Array<
          ChartSeriesConfig<TimeSeriesDatum>
        >,
        yAxisConfig: {},
      };
    }

    return {
      data,
      seriesConfigs: seriesConfigs as Array<ChartSeriesConfig<TimeSeriesDatum>>,
    };
  }, [context.aggregation, data, seriesConfigs]);
}

/** Aggregate intraday entries into hourly */
export function aggregateByHour(data: Array<IntradayEntry>) {
  const byHour = groupBy(data, (entry) =>
    dayjs(entry.dateTime).startOf("hour").toISOString()
  );

  return Object.entries(byHour).map(([timestamp, entries]) => ({
    dateTime: new Date(timestamp),
    value: sumBy(entries, (entry) => entry.value),
  }));
}
