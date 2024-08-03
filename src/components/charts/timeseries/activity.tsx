import { useMemo } from "react";

import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_2 } from "@/utils/number-formats";

import { useAggregation } from "./aggregation";
import { useRangeInfo, useTimeSeriesData } from "./data";
import { SimpleBarChart } from "./mui-renderer";
import { singleSeriesConfig } from "./series-config";
import { GraphStats, AverageAndTotalStat } from "./stats";
import { IntradayStepsChart } from "./intraday";

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
  const props = useAggregation(data, CALORIES_BURNED_SERIES_CONFIGS);

  return <SimpleBarChart {...props} />;
}
