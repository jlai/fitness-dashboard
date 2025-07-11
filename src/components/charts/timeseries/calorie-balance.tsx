import { useQueries } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import { keyBy, uniq } from "es-toolkit";

import { buildTimeSeriesQuery } from "@/api/times-series";
import { NumberFormats } from "@/utils/number-formats";

import { useAggregation } from "./aggregation";
import { TimeSeriesChartContext } from "./context";
import { SimpleBarChart } from "./mui-renderer";
import { ChartSeriesConfig } from "./series-config";
import { TimeSeriesDatum } from "./data";

interface CalorieBalanceDatum extends TimeSeriesDatum {
  caloriesIn: number | null;
  caloriesBurned: number | null;
}

export function CalorieBalanceChart() {
  const {
    range: { startDay, endDay },
  } = useContext(TimeSeriesChartContext);

  const [{ data: caloriesInData }, { data: caloriesBurnedData }] = useQueries({
    queries: [
      buildTimeSeriesQuery("calories-in", startDay, endDay),
      buildTimeSeriesQuery("calories", startDay, endDay),
    ],
  });

  const data = useMemo(() => {
    if (!caloriesBurnedData || !caloriesInData) {
      return [];
    }

    const data: Array<CalorieBalanceDatum> = [];

    const inByDate = keyBy(caloriesInData, ({ dateTime }) => dateTime);
    const burnedByDate = keyBy(caloriesBurnedData, ({ dateTime }) => dateTime);

    const dates = uniq(
      [...Object.keys(inByDate), ...Object.keys(burnedByDate)].toSorted()
    );

    for (const date of dates) {
      data.push({
        dateTime: date,
        caloriesIn: Number(inByDate[date]?.value) ?? null,
        caloriesBurned: Number(burnedByDate[date]?.value) ?? null,
      });
    }

    return data;
  }, [caloriesBurnedData, caloriesInData]);

  const seriesConfigs: Array<ChartSeriesConfig<CalorieBalanceDatum>> = useMemo(
    () => [
      {
        id: "calories-in",
        label: "Calories in",
        yAccessor: (entry) => entry.caloriesIn,
        numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
        color: "#60bd40",
      },
      {
        id: "calories-burned",
        label: "Calories burned",
        yAccessor: (entry) => entry.caloriesBurned,
        numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
        color: "#ff9e22",
      },
    ],
    []
  );

  const props = useAggregation(data, seriesConfigs);

  return <SimpleBarChart {...props} />;
}
