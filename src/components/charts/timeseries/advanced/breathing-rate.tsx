import { FRACTION_DIGITS_1 } from "@/utils/number-formats";

import { SimpleLineChart } from "../mui-renderer";
import { TimeSeriesDatum, useTimeSeriesData } from "../data";
import { singleSeriesConfig } from "../series-config";

type BreathingRateDatum = TimeSeriesDatum & {
  value: {
    breathingRate: number;
  };
};

const BREATHING_RATE_SERIES_CONFIGS = singleSeriesConfig<BreathingRateDatum>({
  label: "Breathing rate",
  numberFormat: FRACTION_DIGITS_1.format,
  unit: "breaths/min",
  showMark: true,
  yAccessor: (entry) => entry.value.breathingRate ?? null,
});

export function BreathingRateChart() {
  const rawData = useTimeSeriesData<BreathingRateDatum>("breathing-rate");

  // Some devices register HRV of 0 for some reason; filter them out
  const data = rawData?.filter((datum) => datum.value.breathingRate);

  return (
    <SimpleLineChart<BreathingRateDatum>
      data={data}
      seriesConfigs={BREATHING_RATE_SERIES_CONFIGS}
    />
  );
}
