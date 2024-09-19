import { FRACTION_DIGITS_0 } from "@/utils/number-formats";

import { TimeSeriesDatum, useTimeSeriesData } from "../data";
import { SimpleLineChart } from "../mui-renderer";
import { ChartSeriesConfig } from "../series-config";

type CardioFitnessDatum = TimeSeriesDatum & {
  value: {
    vo2Max: string;
  };
};

function parseCardioScoreRange(value: string) {
  if (value.includes("-")) {
    return value.split("-").map((part) => parseInt(part, 10));
  } else {
    const singleValue = parseInt(value, 10);
    return [singleValue, singleValue];
  }
}

const SINGLE_CARDIO_FITNESS_CONFIGS: Array<
  ChartSeriesConfig<CardioFitnessDatum>
> = [
  {
    id: "cardio",
    label: "Cardio score (VO2 Max)",
    yAccessor: (entry) => parseCardioScoreRange(entry.value.vo2Max)[0] ?? null,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mL/kg/min",
    showMark: false,
  },
];

const RANGED_CARDIO_FITNESS_SERIES_CONFIGS: Array<
  ChartSeriesConfig<CardioFitnessDatum>
> = [
  {
    id: "lower",
    label: "Lower estimate",
    yAccessor: (entry) => parseCardioScoreRange(entry.value.vo2Max)[0] ?? null,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mL/kg/min",
    showMark: false,
  },
  {
    id: "upper",
    label: "Upper estimate",
    yAccessor: (entry) => parseCardioScoreRange(entry.value.vo2Max)[1] ?? null,
    numberFormat: FRACTION_DIGITS_0.format,
    unit: "mL/kg/min",
    showMark: false,
  },
];

export function CardioFitnessChart() {
  const data = useTimeSeriesData<CardioFitnessDatum>("cardio-score");

  let hasRange = false;
  let seriesMin = undefined;
  let seriesMax = undefined;

  for (const datum of data ?? []) {
    const range = parseCardioScoreRange(datum.value.vo2Max);
    const [min, max] = range;

    if (min !== max) {
      hasRange = true;
    }

    if (!seriesMin || min < seriesMin) {
      seriesMin = min;
    }

    if (!seriesMax || max > seriesMax) {
      seriesMax = max;
    }
  }

  return (
    <SimpleLineChart<CardioFitnessDatum>
      data={data}
      seriesConfigs={
        hasRange
          ? RANGED_CARDIO_FITNESS_SERIES_CONFIGS
          : SINGLE_CARDIO_FITNESS_CONFIGS
      }
      yAxisOptions={{
        min: seriesMin ? Math.floor(seriesMin / 10) * 10 : 0,
        max: seriesMax ? Math.ceil(seriesMax / 10) * 10 : 80,
      }}
    />
  );
}
