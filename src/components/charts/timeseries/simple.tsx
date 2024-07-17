import { useMemo } from "react";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";

import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";

import { SimpleBarChart, SimpleLineChart } from "./mui-renderer";
import { useTimeSeriesData } from "./data";
import { singleSeriesConfig } from "./series-config";
import { durationTickFormat, durationTooltipFormat } from "./formatters";

dayjs.extend(durationPlugin);

const STEPS_SERIES_CONFIGS = singleSeriesConfig({
  label: "Steps",
  numberFormat: FRACTION_DIGITS_0.format,
  unit: "steps",
});

const FLOORS_SERIES_CONFIGS = singleSeriesConfig({
  label: "Floors",
  numberFormat: FRACTION_DIGITS_0.format,
  unit: "floors",
});

const CALORIES_SERIES_CONFIGS = singleSeriesConfig({
  label: "Calories",
  numberFormat: FRACTION_DIGITS_0.format,
  unit: "Cal",
});

const FAT_SERIES_CONFIGS = singleSeriesConfig({
  label: "Fat %",
  numberFormat: FRACTION_DIGITS_1.format,
  unit: "%",
});

const BMI_SERIES_CONFIGS = singleSeriesConfig({
  label: "BMI",
  numberFormat: FRACTION_DIGITS_1.format,
  unit: "BMI",
});

const SLEEP_SERIES_CONFIGS = singleSeriesConfig({
  label: "Sleep duration",
  numberFormat: durationTooltipFormat,
  unit: "",
});

export function StepsChart() {
  const data = useTimeSeriesData("steps");

  return <SimpleBarChart data={data} seriesConfigs={STEPS_SERIES_CONFIGS} />;
}

export function DistanceChart() {
  const { localizedKilometersName } = useUnits();
  const data = useTimeSeriesData("distance");

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        numberFormat: FRACTION_DIGITS_1.format,
        unit: localizedKilometersName,
      }),
    [localizedKilometersName]
  );

  return <SimpleBarChart data={data} seriesConfigs={seriesConfigs} />;
}

export function FloorsChart() {
  const data = useTimeSeriesData("floors");
  return <SimpleBarChart data={data} seriesConfigs={FLOORS_SERIES_CONFIGS} />;
}

export function CaloriesBurnedChart() {
  const data = useTimeSeriesData("calories");

  return <SimpleBarChart data={data} seriesConfigs={CALORIES_SERIES_CONFIGS} />;
}

export function CaloriesConsumedChart() {
  const data = useTimeSeriesData("calories");

  return <SimpleBarChart data={data} seriesConfigs={CALORIES_SERIES_CONFIGS} />;
}

export function WaterChart() {
  const { localizedWaterVolume, localizedWaterVolumeName } = useUnits();
  const data = useTimeSeriesData("water");

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        yAccessor: (entry) => localizedWaterVolume(Number(entry.value)),
        numberFormat: FRACTION_DIGITS_0.format,
        unit: localizedWaterVolumeName,
      }),
    [localizedWaterVolume, localizedWaterVolumeName]
  );

  return <SimpleBarChart data={data} seriesConfigs={seriesConfigs} />;
}

export function WeightChart() {
  const { localizedKilograms, localizedKilogramsName } = useUnits();
  const data = useTimeSeriesData("weight");

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Weight",
        yAccessor: (entry) => localizedKilograms(Number(entry.value)),
        numberFormat: FRACTION_DIGITS_1.format,
        unit: localizedKilogramsName,
      }),
    [localizedKilograms, localizedKilogramsName]
  );

  return <SimpleLineChart data={data} seriesConfigs={seriesConfigs} />;
}

export function FatChart() {
  const data = useTimeSeriesData("fat");
  return <SimpleLineChart data={data} seriesConfigs={FAT_SERIES_CONFIGS} />;
}

export function BmiChart() {
  const data = useTimeSeriesData("bmi");
  return <SimpleLineChart data={data} seriesConfigs={BMI_SERIES_CONFIGS} />;
}

export function SleepChart() {
  const data = useTimeSeriesData("sleep");
  return (
    <SimpleBarChart
      data={data}
      seriesConfigs={SLEEP_SERIES_CONFIGS}
      yAxisOptions={{
        tickFormat: durationTickFormat,
        tooltipFormat: durationTooltipFormat,
      }}
    />
  );
}
