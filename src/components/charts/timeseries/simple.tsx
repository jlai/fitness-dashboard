import { useMemo } from "react";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";
import { useQueries } from "@tanstack/react-query";

import { useUnits } from "@/config/units";
import { NumberFormats } from "@/utils/number-formats";
import { buildWaterGoalQuery } from "@/api/nutrition";

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

  const { showGoals } = useTimeSeriesChartConfig();
  const query = useTimeSeriesQuery("water");
  const [{ data }, { data: waterGoalRaw }] = useQueries({
    queries: [query, { ...buildWaterGoalQuery(), enabled: !!showGoals }],
  });

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
  const waterGoal =
    showGoals && waterGoalRaw && localizedWaterVolume(waterGoalRaw);

  return (
    <SimpleBarChart
      {...props}
      referenceLine={
        waterGoal
          ? {
              label: `Goal: ${NumberFormats.FRACTION_DIGITS_0.format(
                waterGoal
              )} ${localizedWaterVolumeName}`,
              value: waterGoal,
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
