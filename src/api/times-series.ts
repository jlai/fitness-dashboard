import dayjs, { Dayjs } from "dayjs";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { groupBy, sumBy } from "es-toolkit";

import { ActiveMinutesRollupByActivityLevelActivityLevel } from "@generated/orval/fetch/google-health-api/models";

import {
  ACTIVITY_AND_FITNESS_READONLY,
  HEALTH_METRICS_AND_MEASUREMENTS_READONLY,
  NUTRITION_READONLY,
  SLEEP_READONLY,
  type GoogleHealthScope,
} from "@/config/google-health-scopes";
import { isAfterToday } from "@/utils/date-utils";

import type {
  DailyRollupDataPointFor,
  DailyRollupDataType,
  DataPointFor,
  DataType,
} from "./datapoints";
import {
  DAILY_ROLLUP_PROPERTIES,
  buildDailyRollupQuery,
  buildDatapointsQuery,
  getDailyRollupValue,
  getDataPointValue,
} from "./datapoints";
import { formatAsDate } from "./datetime";
import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";

const MILLIMETERS_PER_KILOMETER = 1_000_000;
const GRAMS_PER_KILOGRAM = 1000;

const PERSONAL_RANGE_ROLLUP_TYPES = new Set<DailyRollupDataType>([
  "daily-heart-rate-variability",
  "daily-resting-heart-rate",
]);

export type TimeSeriesResource =
  | "calories"
  | "distance"
  | "steps"
  | "floors"
  | "heart"
  | "hrv"
  | "weight"
  | "fat"
  | "bmi"
  | "water"
  | "calories-in"
  | "sleep"
  | "active-minutes"
  | "active-zone-minutes"
  | "breathing-rate"
  | "spo2"
  | "skin-temperature"
  | "cardio-score";

export interface HeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: string;
}

export interface ActiveMinutesTimeSeriesValue {
  lightlyActiveMinutes: number;
  fairlyActiveMinutes: number;
  veryActiveMinutes: number;
  activeMinutes: number;
}

export interface ActiveZoneMinutesTimeSeriesValue {
  activeZoneMinutes: number;
  fatBurnActiveZoneMinutes: number;
  cardioActiveZoneMinutes: number;
  peakActiveZoneMinutes: number;
}

export interface HeartTimeSeriesValue {
  restingHeartRate?: number;
  heartRateZones: Array<HeartRateZone>;
}

interface TimeSeriesResourceConfig {
  dataType: DataType | DailyRollupDataType;
  requiredScopes: Array<GoogleHealthScope>;
  maxDays: number;
  noFuture?: boolean;
  mergeByDate?: "sum";
  mapValue: (dataPoint: never) => unknown;
}

export const TIME_SERIES_CONFIGS: Record<
  TimeSeriesResource,
  TimeSeriesResourceConfig
> = {
  calories: {
    dataType: "total-calories",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"total-calories">) =>
      String(getDailyRollupValue("total-calories", dataPoint).kcalSum ?? 0),
  },
  distance: {
    dataType: "distance",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"distance">) =>
      String(
        Number(getDailyRollupValue("distance", dataPoint).millimetersSum ?? 0) /
          MILLIMETERS_PER_KILOMETER,
      ),
  },
  steps: {
    dataType: "steps",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"steps">) =>
      getDailyRollupValue("steps", dataPoint).countSum ?? "0",
  },
  floors: {
    dataType: "floors",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"floors">) =>
      getDailyRollupValue("floors", dataPoint).countSum ?? "0",
  },
  weight: {
    dataType: "weight",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"weight">) => {
      const grams = getDailyRollupValue("weight", dataPoint).weightGramsAvg;
      return String((grams ?? 0) / GRAMS_PER_KILOGRAM);
    },
  },
  fat: {
    dataType: "body-fat",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"body-fat">) =>
      String(
        getDailyRollupValue("body-fat", dataPoint).bodyFatPercentageAvg ?? 0,
      ),
  },
  bmi: {
    dataType: "weight",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"weight">) =>
      getDailyRollupValue("weight", dataPoint).weightGramsAvg ?? 0,
  },
  ["calories-in"]: {
    dataType: "nutrition-log",
    requiredScopes: [NUTRITION_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"nutrition-log">) =>
      String(
        getDailyRollupValue("nutrition-log", dataPoint).energy?.kcalSum ?? 0,
      ),
  },
  water: {
    dataType: "hydration-log",
    requiredScopes: [NUTRITION_READONLY],
    maxDays: 1095,
    mapValue: (dataPoint: DailyRollupDataPointFor<"hydration-log">) =>
      String(
        getDailyRollupValue("hydration-log", dataPoint).amountConsumed
          ?.millilitersSum ?? 0,
      ),
  },
  heart: {
    dataType: "daily-resting-heart-rate",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 366,
    mapValue: (
      dataPoint: DataPointFor<"daily-resting-heart-rate">,
    ): HeartTimeSeriesValue => {
      const beatsPerMinute = Number(
        getDataPointValue("daily-resting-heart-rate", dataPoint).beatsPerMinute,
      );
      return {
        restingHeartRate: Number.isFinite(beatsPerMinute)
          ? beatsPerMinute
          : undefined,
        heartRateZones: [],
      };
    },
  },
  hrv: {
    dataType: "daily-heart-rate-variability",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 31,
    mapValue: (dataPoint: DataPointFor<"daily-heart-rate-variability">) => {
      const value = getDataPointValue(
        "daily-heart-rate-variability",
        dataPoint,
      );
      return {
        dailyRmssd: value.averageHeartRateVariabilityMilliseconds ?? 0,
        deepRmssd:
          value.deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds ?? 0,
      };
    },
  },
  ["active-minutes"]: {
    dataType: "active-minutes",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: 1095,
    mapValue: (
      dataPoint: DailyRollupDataPointFor<"active-minutes">,
    ): ActiveMinutesTimeSeriesValue => {
      const value = getDailyRollupValue("active-minutes", dataPoint);
      let lightlyActiveMinutes = 0;
      let fairlyActiveMinutes = 0;
      let veryActiveMinutes = 0;

      for (const entry of value.activeMinutesRollupByActivityLevel ?? []) {
        const minutes = Number(entry.activeMinutesSum ?? 0);

        switch (entry.activityLevel) {
          case ActiveMinutesRollupByActivityLevelActivityLevel.LIGHT:
            lightlyActiveMinutes = minutes;
            break;
          case ActiveMinutesRollupByActivityLevelActivityLevel.MODERATE:
            fairlyActiveMinutes = minutes;
            break;
          case ActiveMinutesRollupByActivityLevelActivityLevel.VIGOROUS:
            veryActiveMinutes = minutes;
            break;
        }
      }

      return {
        lightlyActiveMinutes,
        fairlyActiveMinutes,
        veryActiveMinutes,
        activeMinutes: fairlyActiveMinutes + veryActiveMinutes,
      };
    },
  },
  ["active-zone-minutes"]: {
    dataType: "active-zone-minutes",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: Infinity,
    mapValue: (
      dataPoint: DailyRollupDataPointFor<"active-zone-minutes">,
    ): ActiveZoneMinutesTimeSeriesValue => {
      const value = getDailyRollupValue("active-zone-minutes", dataPoint);
      const fatBurnActiveZoneMinutes = Number(value.sumInFatBurnHeartZone ?? 0);
      const cardioActiveZoneMinutes = Number(value.sumInCardioHeartZone ?? 0);
      const peakActiveZoneMinutes = Number(value.sumInPeakHeartZone ?? 0);
      return {
        fatBurnActiveZoneMinutes,
        cardioActiveZoneMinutes,
        peakActiveZoneMinutes,
        activeZoneMinutes:
          fatBurnActiveZoneMinutes +
          cardioActiveZoneMinutes +
          peakActiveZoneMinutes,
      };
    },
  },
  sleep: {
    dataType: "sleep",
    requiredScopes: [SLEEP_READONLY],
    maxDays: 100,
    mergeByDate: "sum",
    mapValue: (dataPoint: DataPointFor<"sleep">) =>
      Number(getDataPointValue("sleep", dataPoint).summary?.minutesAsleep ?? 0),
  },
  ["breathing-rate"]: {
    dataType: "daily-respiratory-rate",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 31,
    mapValue: (dataPoint: DataPointFor<"daily-respiratory-rate">) => ({
      breathingRate:
        getDataPointValue("daily-respiratory-rate", dataPoint)
          .breathsPerMinute ?? 0,
    }),
  },
  ["spo2"]: {
    dataType: "daily-oxygen-saturation",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: Infinity,
    mapValue: (dataPoint: DataPointFor<"daily-oxygen-saturation">) => {
      const value = getDataPointValue("daily-oxygen-saturation", dataPoint);
      return {
        avg: value.averagePercentage ?? 0,
        min: value.lowerBoundPercentage ?? 0,
        max: value.upperBoundPercentage ?? 0,
      };
    },
  },
  ["cardio-score"]: {
    dataType: "daily-vo2-max",
    requiredScopes: [ACTIVITY_AND_FITNESS_READONLY],
    maxDays: 31,
    noFuture: true,
    mapValue: (dataPoint: DataPointFor<"daily-vo2-max">) => ({
      vo2Max: String(getDataPointValue("daily-vo2-max", dataPoint).vo2Max ?? 0),
    }),
  },
  ["skin-temperature"]: {
    dataType: "daily-sleep-temperature-derivations",
    requiredScopes: [HEALTH_METRICS_AND_MEASUREMENTS_READONLY],
    maxDays: 31,
    mapValue: (
      dataPoint: DataPointFor<"daily-sleep-temperature-derivations">,
    ) => {
      const value = getDataPointValue(
        "daily-sleep-temperature-derivations",
        dataPoint,
      );
      const nightly = value.nightlyTemperatureCelsius ?? 0;
      const baseline = value.baselineTemperatureCelsius ?? nightly;
      return {
        nightlyRelative: nightly - baseline,
      };
    },
  },
};

export type TimeSeriesEntry<ValueType> = {
  dateTime: string;
  value: ValueType;
};

export function getTimeSeriesValueForDay<T>(
  entries: Array<TimeSeriesEntry<T>> | undefined,
  day: Dayjs,
) {
  return entries?.find((entry) => day.isSame(entry.dateTime, "day"))?.value;
}

function usesDailyRollup(
  dataType: DataType | DailyRollupDataType,
): dataType is DailyRollupDataType {
  return (
    dataType in DAILY_ROLLUP_PROPERTIES &&
    !PERSONAL_RANGE_ROLLUP_TYPES.has(dataType as DailyRollupDataType)
  );
}

function formatCivilDate(date?: {
  year?: number;
  month?: number;
  day?: number;
}): string {
  if (date?.year == null || date?.month == null || date?.day == null) {
    return "";
  }

  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(
    date.day,
  ).padStart(2, "0")}`;
}

function dateTimeFromDataPoint<T extends DataType>(
  dataType: T,
  dataPoint: DataPointFor<T>,
): string {
  const value = getDataPointValue(dataType, dataPoint) as {
    date?: { year?: number; month?: number; day?: number };
    sampleTime?: {
      civilTime?: { date?: { year?: number; month?: number; day?: number } };
      physicalTime?: string;
    };
    interval?: {
      civilStartTime?: {
        date?: { year?: number; month?: number; day?: number };
      };
      civilEndTime?: {
        date?: { year?: number; month?: number; day?: number };
      };
      startTime?: string;
      endTime?: string;
    };
  };

  if (value.date) {
    return formatCivilDate(value.date);
  }

  if (value.sampleTime) {
    return (
      formatCivilDate(value.sampleTime.civilTime?.date) ||
      (value.sampleTime.physicalTime
        ? formatAsDate(dayjs(value.sampleTime.physicalTime))
        : "")
    );
  }

  if (value.interval) {
    const civil =
      dataType === "sleep"
        ? value.interval.civilEndTime
        : value.interval.civilStartTime;
    const timestamp =
      dataType === "sleep" ? value.interval.endTime : value.interval.startTime;

    return (
      formatCivilDate(civil?.date) ||
      (timestamp ? formatAsDate(dayjs(timestamp)) : "")
    );
  }

  return "";
}

function mergeEntriesByDate(
  entries: Array<TimeSeriesEntry<unknown>>,
): Array<TimeSeriesEntry<number>> {
  const grouped = groupBy(entries, (entry) => entry.dateTime);

  return Object.entries(grouped)
    .map(([dateTime, group]) => ({
      dateTime,
      value: sumBy(group, (entry) => Number(entry.value)),
    }))
    .toSorted((a, b) => a.dateTime.localeCompare(b.dateTime));
}

function heightMillimetersOnDate(
  heights: Array<{ dateTime: string; millimeters: number }>,
  dateTime: string,
) {
  let latest: number | undefined;

  for (const height of heights) {
    if (height.dateTime <= dateTime) {
      latest = height.millimeters;
    } else {
      break;
    }
  }

  return latest ?? heights.at(-1)?.millimeters;
}

async function toBmiEntries(
  weightEntries: Array<TimeSeriesEntry<unknown>>,
  startDay: Dayjs,
  endDayExclusive: Dayjs,
  queryClient: QueryClient,
): Promise<Array<TimeSeriesEntry<string>>> {
  const { dataPoints } = await queryClient.fetchQuery(
    buildDatapointsQuery(
      "height",
      startDay.subtract(10, "year"),
      endDayExclusive,
    ),
  );

  const heights = dataPoints
    .map((dataPoint) => ({
      dateTime: dateTimeFromDataPoint("height", dataPoint),
      millimeters: Number(
        getDataPointValue("height", dataPoint).heightMillimeters,
      ),
    }))
    .filter((entry) => entry.dateTime && Number.isFinite(entry.millimeters))
    .toSorted((a, b) => a.dateTime.localeCompare(b.dateTime));

  return weightEntries.flatMap((entry) => {
    const heightMm = heightMillimetersOnDate(heights, entry.dateTime);
    if (!heightMm) {
      return [];
    }

    const heightM = heightMm / 1000;
    const kg = Number(entry.value) / GRAMS_PER_KILOGRAM;
    return [
      {
        dateTime: entry.dateTime,
        value: String(kg / (heightM * heightM)),
      },
    ];
  });
}

async function fetchTimeSeriesEntries(
  resource: TimeSeriesResource,
  config: TimeSeriesResourceConfig,
  startDay: Dayjs,
  endDayExclusive: Dayjs,
  queryClient: QueryClient,
): Promise<Array<TimeSeriesEntry<unknown>>> {
  if (usesDailyRollup(config.dataType)) {
    const { rollupDataPoints } = await queryClient.fetchQuery(
      buildDailyRollupQuery(config.dataType, startDay, endDayExclusive),
    );

    const entries = rollupDataPoints.map((dataPoint) => ({
      dateTime: formatCivilDate(dataPoint.civilStartTime?.date),
      value: config.mapValue(dataPoint as never),
    }));

    if (resource === "bmi") {
      return toBmiEntries(entries, startDay, endDayExclusive, queryClient);
    }

    return entries;
  }

  const { dataPoints } = await queryClient.fetchQuery(
    buildDatapointsQuery(
      config.dataType as DataType,
      startDay,
      endDayExclusive,
    ),
  );

  return dataPoints.map((dataPoint) => ({
    dateTime: dateTimeFromDataPoint(config.dataType as DataType, dataPoint),
    value: config.mapValue(dataPoint as never),
  }));
}

export function buildTimeSeriesQuery<TEntry = TimeSeriesEntry<string>>(
  resource: TimeSeriesResource,
  startDay: Dayjs,
  endDay: Dayjs,
) {
  const config = TIME_SERIES_CONFIGS[resource];

  if (config.noFuture && isAfterToday(endDay)) {
    endDay = dayjs();
  }

  const startDate = formatAsDate(startDay);
  const endDate = formatAsDate(endDay);
  const rangeStart = startDay.startOf("day");
  const rangeEndExclusive = endDay.startOf("day").add(1, "day");

  return queryOptions({
    queryKey: ["timeseries", resource, startDate, endDate],
    queryFn: async ({ client }) => {
      let entries = await fetchTimeSeriesEntries(
        resource,
        config,
        rangeStart,
        rangeEndExclusive,
        client,
      );

      entries = entries.filter((entry) => entry.dateTime);

      if (config.mergeByDate === "sum") {
        return mergeEntriesByDate(entries) as Array<TEntry>;
      }

      return entries.toSorted((a, b) =>
        a.dateTime.localeCompare(b.dateTime),
      ) as Array<TEntry>;
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
