import { useMemo } from "react";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";

import { useUnits } from "@/config/units";
import {
  FRACTION_DIGITS_0,
  FRACTION_DIGITS_1,
  FRACTION_DIGITS_2,
} from "@/utils/number-formats";

import { SimpleBarChart, SimpleLineChart } from "./mui-renderer";
import { removeFutureDates, useTimeSeriesData } from "./data";
import { singleSeriesConfig } from "./series-config";
import { durationTickFormat, durationTooltipFormat } from "./formatters";
import { useAggregation } from "./aggregation";
import { AverageAndTotalStat, GraphStats } from "./stats";

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
  showMark: false,
});

const BMI_SERIES_CONFIGS = singleSeriesConfig({
  label: "BMI",
  numberFormat: FRACTION_DIGITS_1.format,
  unit: "BMI",
  showMark: false,
});

const SLEEP_SERIES_CONFIGS = singleSeriesConfig({
  label: "Sleep duration",
  numberFormat: durationTooltipFormat,
  unit: "",
});

export function StepsChart() {
  const data = useTimeSeriesData("steps");
  const props = useAggregation(data, STEPS_SERIES_CONFIGS);

  return (
    <>
      <SimpleBarChart {...props} />
      <GraphStats>
        <AverageAndTotalStat
          data={data}
          yAccessor={(datum) => Number(datum.value)}
        />
      </GraphStats>
    </>
  );
}

export function DistanceChart() {
  const { localizedKilometers, localizedKilometersName } = useUnits();
  const data = useTimeSeriesData("distance");

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Distance",
        numberFormat: (value) =>
          FRACTION_DIGITS_2.format(localizedKilometers(value)),
        unit: localizedKilometersName,
      }),
    [localizedKilometers, localizedKilometersName]
  );

  const props = useAggregation(data, seriesConfigs);

  return (
    <>
      <SimpleBarChart {...props} />
      <GraphStats>
        <AverageAndTotalStat
          data={data}
          yAccessor={(datum) => Number(datum.value)}
          valueFormatter={(value) =>
            `${FRACTION_DIGITS_2.format(
              localizedKilometers(value)
            )} ${localizedKilometersName}`
          }
        />
      </GraphStats>
    </>
  );
}

export function FloorsChart() {
  const data = useTimeSeriesData("floors");
  const props = useAggregation(data, FLOORS_SERIES_CONFIGS);

  return (
    <>
      <SimpleBarChart {...props} />
      <GraphStats>
        <AverageAndTotalStat
          data={data}
          yAccessor={(datum) => Number(datum.value)}
        />
      </GraphStats>
    </>
  );
}

export function CaloriesBurnedChart() {
  const data = useTimeSeriesData("calories");
  const props = useAggregation(data, CALORIES_SERIES_CONFIGS);

  return <SimpleBarChart {...props} />;
}

export function CaloriesConsumedChart() {
  const data = useTimeSeriesData("calories-in");
  const props = useAggregation(data, CALORIES_SERIES_CONFIGS);

  return <SimpleBarChart {...props} />;
}

export function WaterChart() {
  const { localizedWaterVolume, localizedWaterVolumeName } = useUnits();
  const data = useTimeSeriesData("water");

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Water consumed",
        yAccessor: (entry) => localizedWaterVolume(Number(entry.value)),
        numberFormat: FRACTION_DIGITS_0.format,
        unit: localizedWaterVolumeName,
      }),
    [localizedWaterVolume, localizedWaterVolumeName]
  );

  const props = useAggregation(data, seriesConfigs);
  return <SimpleBarChart {...props} />;
}

export function WeightChart() {
  const { localizedKilograms, localizedKilogramsName } = useUnits();
  const data = removeFutureDates(useTimeSeriesData("weight"));

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Weight",
        yAccessor: (entry) => localizedKilograms(Number(entry.value)),
        numberFormat: FRACTION_DIGITS_1.format,
        unit: localizedKilogramsName,
        showMark: false,
      }),
    [localizedKilograms, localizedKilogramsName]
  );

  const props = useAggregation(data, seriesConfigs);
  return (
    <SimpleLineChart
      {...props}
      yAxisOptions={{ tickFormat: FRACTION_DIGITS_1.format }}
    />
  );
}

export function FatChart() {
  const data = removeFutureDates(useTimeSeriesData("fat"));
  const props = useAggregation(data, FAT_SERIES_CONFIGS);
  return (
    <SimpleLineChart
      {...props}
      yAxisOptions={{ tickFormat: FRACTION_DIGITS_1.format }}
    />
  );
}

export function BmiChart() {
  const data = removeFutureDates(useTimeSeriesData("bmi"));
  const props = useAggregation(data, BMI_SERIES_CONFIGS);
  return (
    <SimpleLineChart
      {...props}
      yAxisOptions={{ tickFormat: FRACTION_DIGITS_1.format }}
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
