import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { buildTimeSeriesQuery } from "@/api/times-series";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";

import { selectedRangeAtom } from "../atoms";

import { ChartSeriesConfig } from "./series-config";
import { StackedBarChart } from "./mui-renderer";
import { TimeSeriesDatum } from "./data";

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
  const { startDay, endDay } = useAtomValue(selectedRangeAtom);
  const { data } = useQuery(
    buildTimeSeriesQuery<ActiveZoneMinutesDatum>(
      "active-zone-minutes",
      startDay,
      endDay
    )
  );

  return (
    <StackedBarChart<ActiveZoneMinutesDatum>
      data={data}
      seriesConfigs={AZM_SERIES_CONFIGS}
    />
  );
}
