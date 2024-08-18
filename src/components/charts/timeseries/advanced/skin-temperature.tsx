import { useMemo } from "react";

import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { useUnits } from "@/config/units";

import { TimeSeriesDatum, useTimeSeriesData } from "../data";
import { SimpleLineChart } from "../mui-renderer";
import { singleSeriesConfig } from "../series-config";

type SkinTemperatureDatum = TimeSeriesDatum & {
  value: {
    nightlyRelative: number;
  };
};

export function SkinTemperatureChart() {
  const { localizedDegreesCelsius, localizedDegreesName } = useUnits();
  const data = useTimeSeriesData<SkinTemperatureDatum>("skin-temperature");

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig<SkinTemperatureDatum>({
        label: "Relative skin temp",
        numberFormat: FRACTION_DIGITS_1.format,
        unit: localizedDegreesName,
        showMark: true,
        yAccessor: (entry) =>
          localizedDegreesCelsius(entry.value.nightlyRelative) ?? null,
      }),
    [localizedDegreesCelsius, localizedDegreesName]
  );

  return (
    <SimpleLineChart<SkinTemperatureDatum>
      data={data}
      seriesConfigs={seriesConfigs}
    />
  );
}
