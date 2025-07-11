import { NumberFormats } from "@/utils/number-formats";

import { TimeSeriesDatum, useTimeSeriesData } from "../data";
import { SimpleLineChart } from "../mui-renderer";
import { singleSeriesConfig } from "../series-config";

type Spo2Datum = TimeSeriesDatum & {
  value: {
    avg: number;
    min: number;
    max: number;
  };
};

const SPO2_SERIES_CONFIGS = singleSeriesConfig<Spo2Datum>({
  label: "Oxygen saturation (SpO2)",
  numberFormat: NumberFormats.FRACTION_DIGITS_1.format,
  unit: "%",
  showMark: true,
  yAccessor: (entry) => entry.value.avg ?? null,
});

export function Spo2Chart() {
  const data = useTimeSeriesData<Spo2Datum>("spo2");

  return (
    <SimpleLineChart<Spo2Datum>
      data={data}
      seriesConfigs={SPO2_SERIES_CONFIGS}
    />
  );
}
