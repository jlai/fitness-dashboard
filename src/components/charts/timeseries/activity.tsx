import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { kilometersFromDistanceGoal, useUnits } from "@/config/units";
import { NumberFormats } from "@/utils/number-formats";
import {
  distanceGoalAtom,
  floorsGoalAtom,
  stepsGoalAtom,
} from "@/storage/settings";

import { useAggregation } from "./aggregation";
import { useRangeInfo, useTimeSeriesData, useTimeSeriesQuery } from "./data";
import { SimpleBarChart } from "./mui-renderer";
import { singleSeriesConfig } from "./series-config";
import { GraphStats, AverageAndTotalStat } from "./stats";
import { IntradayStepsChart } from "./intraday";
import { useTimeSeriesChartConfig } from "./context";

const STEPS_SERIES_CONFIGS = singleSeriesConfig({
  label: "Steps",
  numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
  unit: "steps",
});

const FLOORS_SERIES_CONFIGS = singleSeriesConfig({
  label: "Floors",
  numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
  unit: "floors",
});

const CALORIES_BURNED_SERIES_CONFIGS = singleSeriesConfig({
  label: "Calories",
  numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
  unit: "Cal",
});

export function StepsChart() {
  const { isIntraday } = useRangeInfo();

  return isIntraday ? <IntradayStepsChart /> : <DailyStepsChart />;
}

export function DailyStepsChart() {
  const { showGoals } = useTimeSeriesChartConfig();
  const stepsGoal = useAtomValue(stepsGoalAtom);
  const { data } = useQuery(useTimeSeriesQuery("steps"));

  const props = useAggregation(data, STEPS_SERIES_CONFIGS);

  const stepGoal = showGoals && stepsGoal;

  return (
    <>
      <SimpleBarChart
        {...props}
        referenceLine={
          stepGoal
            ? {
                label: `Goal: ${NumberFormats.FRACTION_DIGITS_0.format(
                  stepGoal,
                )} steps`,
                value: stepGoal,
              }
            : undefined
        }
      />
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
  const { showGoals } = useTimeSeriesChartConfig();
  const distanceGoalValue = useAtomValue(distanceGoalAtom);
  const { data } = useQuery(useTimeSeriesQuery("distance"));

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Distance",
        numberFormat: (value) => NumberFormats.FRACTION_DIGITS_2.format(value),
        unit: localizedKilometersName,
        yAccessor: (datum) => localizedKilometers(Number(datum.value)),
      }),
    [localizedKilometers, localizedKilometersName],
  );

  const props = useAggregation(data, seriesConfigs);

  const distanceGoal =
    showGoals &&
    localizedKilometers(
      kilometersFromDistanceGoal(
        distanceGoalValue.value,
        distanceGoalValue.unit,
      ),
    );

  return (
    <>
      <SimpleBarChart
        {...props}
        referenceLine={
          distanceGoal
            ? {
                label: `Goal: ${NumberFormats.FRACTION_DIGITS_0.format(
                  distanceGoal,
                )} ${localizedKilometersName}`,
                value: distanceGoal,
              }
            : undefined
        }
      />
      <GraphStats>
        <AverageAndTotalStat
          data={data}
          yAccessor={(datum) => localizedKilometers(Number(datum.value))}
          valueFormatter={(value) =>
            `${NumberFormats.FRACTION_DIGITS_2.format(
              value,
            )} ${localizedKilometersName}`
          }
        />
      </GraphStats>
    </>
  );
}

export function FloorsChart() {
  const { showGoals } = useTimeSeriesChartConfig();
  const floorsGoalValue = useAtomValue(floorsGoalAtom);
  const { data } = useQuery(useTimeSeriesQuery("floors"));

  const props = useAggregation(data, FLOORS_SERIES_CONFIGS);

  const floorsGoal = showGoals && floorsGoalValue;

  return (
    <>
      <SimpleBarChart
        {...props}
        referenceLine={
          floorsGoal
            ? {
                label: `Goal: ${NumberFormats.FRACTION_DIGITS_0.format(
                  floorsGoal,
                )} floors`,
                value: floorsGoal,
              }
            : undefined
        }
      />
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
  const props = useAggregation(data, CALORIES_BURNED_SERIES_CONFIGS);

  return <SimpleBarChart {...props} />;
}
