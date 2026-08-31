import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { NumberFormats } from "@/utils/number-formats";
import { activeZoneMinutesGoalAtom } from "@/storage/settings";

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
    numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f5e12f",
  },
  {
    id: "cardio",
    label: "Cardio",
    yAccessor: (d) => d.value.cardioActiveZoneMinutes,
    numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f59f2f",
  },
  {
    id: "peak",
    label: "Peak",
    yAccessor: (d) => d.value.peakActiveZoneMinutes,
    numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f5492f",
  },
];

export function ActiveZoneMinutesChart() {
  const { showGoals } = useTimeSeriesChartConfig();
  const activeZoneMinutesGoal = useAtomValue(activeZoneMinutesGoalAtom);
  const { data } = useQuery(
    useTimeSeriesQuery<ActiveZoneMinutesDatum>("active-zone-minutes"),
  );

  const props = useAggregation(data, AZM_SERIES_CONFIGS);

  const azmGoal = showGoals && activeZoneMinutesGoal;

  return (
    <StackedBarChart
      {...props}
      referenceLine={
        azmGoal
          ? {
              label: `Goal: ${NumberFormats.FRACTION_DIGITS_0.format(
                azmGoal
              )} zone mins`,
              value: azmGoal,
            }
          : undefined
      }
    />
  );
}
