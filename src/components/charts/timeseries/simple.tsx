import { useMemo } from "react";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { millilitersFromWaterGoal, useUnits } from "@/config/units";
import { NumberFormats } from "@/utils/number-formats";
import { waterGoalAtom } from "@/storage/settings";

import { SimpleBarChart, SimpleLineChart } from "./mui-renderer";
import {
  removeFutureDates,
  useTimeSeriesData,
  useTimeSeriesQuery,
} from "./data";
import { singleSeriesConfig } from "./series-config";
import { durationTickFormat, durationTooltipFormat } from "./formatters";
import { useAggregation } from "./aggregation";
import { useTimeSeriesChartConfig } from "./context";

dayjs.extend(durationPlugin);

const CALORIES_SERIES_CONFIGS = singleSeriesConfig({
  label: "Calories",
  numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
  unit: "Cal",
});

const FAT_SERIES_CONFIGS = singleSeriesConfig({
  label: "Fat %",
  numberFormat: NumberFormats.FRACTION_DIGITS_1.format,
  unit: "%",
  showMark: false,
});

const BMI_SERIES_CONFIGS = singleSeriesConfig({
  label: "BMI",
  numberFormat: NumberFormats.FRACTION_DIGITS_1.format,
  unit: "BMI",
  showMark: false,
});

const SLEEP_SERIES_CONFIGS = singleSeriesConfig({
  label: "Sleep duration",
  numberFormat: durationTooltipFormat,
  unit: "",
});

export function CaloriesConsumedChart() {
  const data = useTimeSeriesData("calories-in");
  const props = useAggregation(data, CALORIES_SERIES_CONFIGS);

  return <SimpleBarChart {...props} />;
}

export function WaterChart() {
  const { localizedWaterVolume, localizedWaterVolumeName } = useUnits();
  const waterGoal = useAtomValue(waterGoalAtom);

  const { showGoals } = useTimeSeriesChartConfig();
  const { data } = useQuery(useTimeSeriesQuery("water"));

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Water consumed",
        yAccessor: (entry) => localizedWaterVolume(Number(entry.value)),
        numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
        unit: localizedWaterVolumeName,
      }),
    [localizedWaterVolume, localizedWaterVolumeName]
  );

  const props = useAggregation(data, seriesConfigs);
  const waterGoalLine =
    showGoals &&
    localizedWaterVolume(
      millilitersFromWaterGoal(waterGoal.value, waterGoal.unit),
    );

  return (
    <SimpleBarChart
      {...props}
      referenceLine={
        waterGoalLine
          ? {
              label: `Goal: ${NumberFormats.FRACTION_DIGITS_0.format(
                waterGoalLine
              )} ${localizedWaterVolumeName}`,
              value: waterGoalLine,
            }
          : undefined
      }
    />
  );
}

export function WeightChart() {
  const { localizedKilograms, localizedKilogramsName } = useUnits();
  const data = removeFutureDates(useTimeSeriesData("weight"));

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Weight",
        yAccessor: (entry) => localizedKilograms(Number(entry.value)),
        numberFormat: NumberFormats.FRACTION_DIGITS_1.format,
        unit: localizedKilogramsName,
        showMark: false,
      }),
    [localizedKilograms, localizedKilogramsName]
  );

  const props = useAggregation(data, seriesConfigs);
  return (
    <SimpleLineChart
      {...props}
      yAxisOptions={{ tickFormat: NumberFormats.FRACTION_DIGITS_1.format }}
    />
  );
}

export function FatChart() {
  const data = removeFutureDates(useTimeSeriesData("fat"));
  const props = useAggregation(data, FAT_SERIES_CONFIGS);
  return (
    <SimpleLineChart
      {...props}
      yAxisOptions={{ tickFormat: NumberFormats.FRACTION_DIGITS_1.format }}
    />
  );
}

export function BmiChart() {
  const data = removeFutureDates(useTimeSeriesData("bmi"));
  const props = useAggregation(data, BMI_SERIES_CONFIGS);
  return (
    <SimpleLineChart
      {...props}
      yAxisOptions={{ tickFormat: NumberFormats.FRACTION_DIGITS_1.format }}
    />
  );
}

export function SleepChart() {
  const data = useTimeSeriesData("sleep");
  const props = useAggregation(data, SLEEP_SERIES_CONFIGS);

  return (
    <SimpleBarChart
      {...props}
      yAxisOptions={{
        tickFormat: durationTickFormat,
        tooltipFormat: durationTooltipFormat,
      }}
    />
  );
}
