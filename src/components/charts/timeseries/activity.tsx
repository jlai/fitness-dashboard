import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_2 } from "@/utils/number-formats";
import { buildActivityGoalsQuery } from "@/api/activity/goals";

import { useAggregation } from "./aggregation";
import { useRangeInfo, useTimeSeriesData, useTimeSeriesQuery } from "./data";
import { SimpleBarChart } from "./mui-renderer";
import { singleSeriesConfig } from "./series-config";
import { GraphStats, AverageAndTotalStat } from "./stats";
import { IntradayStepsChart } from "./intraday";
import { useTimeSeriesChartConfig } from "./context";

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

const CALORIES_BURNED_SERIES_CONFIGS = singleSeriesConfig({
  label: "Calories",
  numberFormat: FRACTION_DIGITS_0.format,
  unit: "Cal",
});

export function StepsChart() {
  const { isIntraday } = useRangeInfo();

  return isIntraday ? <IntradayStepsChart /> : <DailyStepsChart />;
}

export function DailyStepsChart() {
  const { showGoals } = useTimeSeriesChartConfig();
  const query = useTimeSeriesQuery("steps");

  const [{ data }, { data: goals }] = useQueries({
    queries: [
      query,
      { ...buildActivityGoalsQuery("daily"), enabled: !!showGoals },
    ],
  });

  const props = useAggregation(data, STEPS_SERIES_CONFIGS);

  const stepGoal = showGoals && goals?.steps;

  return (
    <>
      <SimpleBarChart
        {...props}
        referenceLine={
          stepGoal
            ? {
                label: `Goal: ${FRACTION_DIGITS_0.format(stepGoal)} steps`,
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
  const query = useTimeSeriesQuery("distance");

  const [{ data }, { data: goals }] = useQueries({
    queries: [
      query,
      { ...buildActivityGoalsQuery("daily"), enabled: !!showGoals },
    ],
  });

  const seriesConfigs = useMemo(
    () =>
      singleSeriesConfig({
        label: "Distance",
        numberFormat: (value) => FRACTION_DIGITS_2.format(value),
        unit: localizedKilometersName,
        yAccessor: (datum) => localizedKilometers(Number(datum.value)),
      }),
    [localizedKilometers, localizedKilometersName]
  );

  const props = useAggregation(data, seriesConfigs);

  const distanceGoal = showGoals && goals?.distance;

  return (
    <>
      <SimpleBarChart
        {...props}
        referenceLine={
          distanceGoal
            ? {
                label: `Goal: ${FRACTION_DIGITS_0.format(
                  distanceGoal
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
            `${FRACTION_DIGITS_2.format(value)} ${localizedKilometersName}`
          }
        />
      </GraphStats>
    </>
  );
}

export function FloorsChart() {
  const { showGoals } = useTimeSeriesChartConfig();
  const query = useTimeSeriesQuery("floors");
  const [{ data }, { data: goals }] = useQueries({
    queries: [
      query,
      { ...buildActivityGoalsQuery("daily"), enabled: !!showGoals },
    ],
  });

  const props = useAggregation(data, FLOORS_SERIES_CONFIGS);

  const floorsGoal = showGoals && goals?.floors;

  return (
    <>
      <SimpleBarChart
        {...props}
        referenceLine={
          floorsGoal
            ? {
                label: `Goal: ${FRACTION_DIGITS_0.format(floorsGoal)} floors`,
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
