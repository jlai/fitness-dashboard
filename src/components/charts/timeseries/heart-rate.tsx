import { HeartTimeSeriesValue } from "@/api/times-series";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";

import { TimeSeriesDatum, useTimeSeriesData } from "./data";
import { ChartSeriesConfig, singleSeriesConfig } from "./series-config";
import { SimpleLineChart, StackedBarChart } from "./mui-renderer";

type HeartDatum = TimeSeriesDatum & {
  value: HeartTimeSeriesValue;
};

type SimplifiedHeartDatum = TimeSeriesDatum & {
  fatBurnZoneMinutes: number;
  cardioZoneMinutes: number;
  peakZoneMinutes: number;
};

const RESTING_HEART_RATE_SERIES_CONFIGS = singleSeriesConfig<HeartDatum>({
  label: "Resting heart rate",
  yAccessor: (entry) => entry.value.restingHeartRate,
  numberFormat: FRACTION_DIGITS_0.format,
  unit: "bpm",
});

export function RestingHeartRateChart() {
  const data = useTimeSeriesData<HeartDatum>("resting-heart-rate");

  return (
    <SimpleLineChart<HeartDatum>
      data={data}
      seriesConfigs={RESTING_HEART_RATE_SERIES_CONFIGS}
    />
  );
}

const HEART_RATE_ZONES_SERIES_CONFIGS: Array<
  ChartSeriesConfig<SimplifiedHeartDatum>
> = [
  {
    id: "fat-burn",
    label: "Fat burn",
    yAccessor: (d) => d.fatBurnZoneMinutes,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f5e12f",
  },
  {
    id: "cardio",
    label: "Cardio",
    yAccessor: (d) => d.cardioZoneMinutes,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f59f2f",
  },
  {
    id: "peak",
    label: "Peak",
    yAccessor: (d) => d.peakZoneMinutes,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mins",
    color: "#f5492f",
  },
];

export function HeartRateZonesChart() {
  const rawData = useTimeSeriesData<HeartDatum>("heart-rate-zones");

  const data = rawData?.map((entry) => {
    const datum: SimplifiedHeartDatum = {
      dateTime: entry.dateTime,
      fatBurnZoneMinutes: 0,
      cardioZoneMinutes: 0,
      peakZoneMinutes: 0,
    };

    for (const zone of entry.value.heartRateZones) {
      switch (zone.name) {
        case "Fat Burn":
          datum.fatBurnZoneMinutes = zone.minutes;
          break;
        case "Cardio":
          datum.cardioZoneMinutes = zone.minutes;
          break;
        case "Peak":
          datum.peakZoneMinutes = zone.minutes;
          break;
      }
    }

    return datum;
  });

  return (
    <StackedBarChart<SimplifiedHeartDatum>
      data={data}
      seriesConfigs={HEART_RATE_ZONES_SERIES_CONFIGS}
    />
  );
}
