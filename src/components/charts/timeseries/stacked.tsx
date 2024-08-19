import { useQueries } from "@tanstack/react-query";

import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { buildActivityGoalsQuery } from "@/api/activity/goals";

import { ChartSeriesConfig } from "./series-config";
import { StackedBarChart } from "./mui-renderer";
import { TimeSeriesDatum, useTimeSeriesQuery } from "./data";
import { useAggregation } from "./aggregation";
import { useTimeSeriesChartConfig } from "./context";

type ActiveZoneMinutesDatum = TimeSeriesDatum & {
  value: {
    fatBurnActiveZoneMinutes: number;
    cardioActiveZoneMinutes: number;
    peakActiveZoneMinutes: number;
  };
};

const AZM_SERIES_CONFIGS: Array<ChartSeriesConfig<ActiveZoneMinutesDatum>> = [
  {
    id: "fat-burn",
    label: "Fat burn",
    yAccessor: (d) => d.value.fatBurnActiveZoneMinutes,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f5e12f",
  },
  {
    id: "cardio",
    label: "Cardio",
    yAccessor: (d) => d.value.cardioActiveZoneMinutes,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f59f2f",
  },
  {
    id: "peak",
    label: "Peak",
    yAccessor: (d) => d.value.peakActiveZoneMinutes,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f5492f",
  },
];

export function ActiveZoneMinutesChart() {
  const { showGoals } = useTimeSeriesChartConfig();
  const query = useTimeSeriesQuery<ActiveZoneMinutesDatum>(
    "active-zone-minutes"
  );
  const [{ data }, { data: goals }] = useQueries({
    queries: [
      query,
      { ...buildActivityGoalsQuery("daily"), enabled: !!showGoals },
    ],
  });

  const props = useAggregation(data, AZM_SERIES_CONFIGS);

  const azmGoal = showGoals && goals?.activeZoneMinutes;

  return (
    <StackedBarChart
      {...props}
      referenceLine={
        azmGoal
          ? {
              label: `Goal: ${FRACTION_DIGITS_0.format(azmGoal)} zone mins`,
              value: azmGoal,
            }
          : undefined
      }
    />
  );
}
