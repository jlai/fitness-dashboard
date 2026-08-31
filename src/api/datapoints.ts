import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

import type {
  CivilDateTime,
  DailyRollupDataPoint,
  DataPoint,
  RollupDataPoint,
} from "@generated/orval/fetch/google-health-api/models";
import {
  healthUsersDataTypesDataPointsDailyRollUp,
  healthUsersDataTypesDataPointsGet,
  healthUsersDataTypesDataPointsList,
  healthUsersDataTypesDataPointsRollUp,
} from "@generated/orval/fetch/google-health-api/users/users";

import { graduallyStale } from "./cache-settings";
import { formatAsDate } from "./datetime";

/** Union fields on DataPoint that correspond to a listable data type. */
type DataPointDataKey = Exclude<keyof DataPoint, "name" | "dataSource">;

/**
 * Maps Google Health data type IDs (kebab-case path segment) to the
 * corresponding DataPoint union field (camelCase).
 *
 * @see https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints#DataPoint
 */
export const DATA_TYPE_PROPERTIES = {
  "active-energy-burned": "activeEnergyBurned",
  "active-minutes": "activeMinutes",
  "active-zone-minutes": "activeZoneMinutes",
  "activity-level": "activityLevel",
  altitude: "altitude",
  "basal-energy-burned": "basalEnergyBurned",
  "blood-glucose": "bloodGlucose",
  "body-fat": "bodyFat",
  "core-body-temperature": "coreBodyTemperature",
  "daily-heart-rate-variability": "dailyHeartRateVariability",
  "daily-heart-rate-zones": "dailyHeartRateZones",
  "daily-oxygen-saturation": "dailyOxygenSaturation",
  "daily-respiratory-rate": "dailyRespiratoryRate",
  "daily-resting-heart-rate": "dailyRestingHeartRate",
  "daily-sleep-temperature-derivations": "dailySleepTemperatureDerivations",
  "daily-vo2-max": "dailyVo2Max",
  distance: "distance",
  electrocardiogram: "electrocardiogram",
  exercise: "exercise",
  floors: "floors",
  "heart-rate": "heartRate",
  "heart-rate-variability": "heartRateVariability",
  height: "height",
  "hydration-log": "hydrationLog",
  "irregular-rhythm-notification": "irregularRhythmNotification",
  "menstrual-period": "menstrualPeriod",
  moods: "moods",
  "nutrition-log": "nutritionLog",
  "ovulation-test": "ovulationTest",
  "oxygen-saturation": "oxygenSaturation",
  "respiratory-rate-sleep-summary": "respiratoryRateSleepSummary",
  "run-vo2-max": "runVo2Max",
  "sedentary-period": "sedentaryPeriod",
  sleep: "sleep",
  steps: "steps",
  "swim-lengths-data": "swimLengthsData",
  symptoms: "symptoms",
  "time-in-heart-rate-zone": "timeInHeartRateZone",
  "vo2-max": "vo2Max",
  weight: "weight",
} as const satisfies Record<string, DataPointDataKey>;

export type DataType = keyof typeof DATA_TYPE_PROPERTIES;

export type DataTypeProperty<T extends DataType> =
  (typeof DATA_TYPE_PROPERTIES)[T];

/** A DataPoint known to contain the union field for data type `T`. */
export type DataPointFor<T extends DataType> = DataPoint & {
  [K in DataTypeProperty<T>]-?: NonNullable<DataPoint[K]>;
};

export type ListDatapointsResult<T extends DataType> = {
  dataPoints: Array<DataPointFor<T>>;
};

/** Union fields on DailyRollupDataPoint that correspond to a rollup value. */
type DailyRollupValueKey = Exclude<
  keyof DailyRollupDataPoint,
  "civilStartTime" | "civilEndTime"
>;

/**
 * Maps data type IDs supported by dailyRollUp to the DailyRollupDataPoint
 * union field they populate.
 *
 * @see https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/dailyRollUp
 */
export const DAILY_ROLLUP_PROPERTIES = {
  "active-energy-burned": "activeEnergyBurned",
  "active-minutes": "activeMinutes",
  "active-zone-minutes": "activeZoneMinutes",
  "activity-level": "activityLevel",
  altitude: "altitude",
  "blood-glucose": "bloodGlucose",
  "body-fat": "bodyFat",
  "calories-in-heart-rate-zone": "caloriesInHeartRateZone",
  "core-body-temperature": "coreBodyTemperature",
  "daily-heart-rate-variability": "heartRateVariabilityPersonalRange",
  "daily-resting-heart-rate": "restingHeartRatePersonalRange",
  distance: "distance",
  floors: "floors",
  "heart-rate": "heartRate",
  "hydration-log": "hydrationLog",
  "nutrition-log": "nutritionLog",
  "run-vo2-max": "runVo2Max",
  "sedentary-period": "sedentaryPeriod",
  steps: "steps",
  "swim-lengths-data": "swimLengthsData",
  "time-in-heart-rate-zone": "timeInHeartRateZone",
  "total-calories": "totalCalories",
  weight: "weight",
} as const satisfies Record<string, DailyRollupValueKey>;

export type DailyRollupDataType = keyof typeof DAILY_ROLLUP_PROPERTIES;

export type DailyRollupProperty<T extends DailyRollupDataType> =
  (typeof DAILY_ROLLUP_PROPERTIES)[T];

/** A DailyRollupDataPoint known to contain the union field for data type `T`. */
export type DailyRollupDataPointFor<T extends DailyRollupDataType> =
  DailyRollupDataPoint & {
    [K in DailyRollupProperty<T>]-?: NonNullable<DailyRollupDataPoint[K]>;
  };

export type DailyRollupResult<T extends DailyRollupDataType> = {
  rollupDataPoints: Array<DailyRollupDataPointFor<T>>;
};

/** Union fields on RollupDataPoint that correspond to a rollup value. */
type RollupValueKey = Exclude<keyof RollupDataPoint, "startTime" | "endTime">;

/**
 * Maps data type IDs supported by rollUp to the RollupDataPoint union field
 * they populate.
 *
 * @see https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/rollUp
 */
export const ROLLUP_PROPERTIES = {
  "active-energy-burned": "activeEnergyBurned",
  "active-minutes": "activeMinutes",
  "active-zone-minutes": "activeZoneMinutes",
  "activity-level": "activityLevel",
  altitude: "altitude",
  "blood-glucose": "bloodGlucose",
  "body-fat": "bodyFat",
  "calories-in-heart-rate-zone": "caloriesInHeartRateZone",
  "core-body-temperature": "coreBodyTemperature",
  distance: "distance",
  floors: "floors",
  "heart-rate": "heartRate",
  "hydration-log": "hydrationLog",
  "nutrition-log": "nutritionLog",
  "run-vo2-max": "runVo2Max",
  "sedentary-period": "sedentaryPeriod",
  steps: "steps",
  "swim-lengths-data": "swimLengthsData",
  "time-in-heart-rate-zone": "timeInHeartRateZone",
  "total-calories": "totalCalories",
  weight: "weight",
} as const satisfies Record<string, RollupValueKey>;

export type RollupDataType = keyof typeof ROLLUP_PROPERTIES;

export type RollupProperty<T extends RollupDataType> =
  (typeof ROLLUP_PROPERTIES)[T];

/** A RollupDataPoint known to contain the union field for data type `T`. */
export type RollupDataPointFor<T extends RollupDataType> = RollupDataPoint & {
  [K in RollupProperty<T>]-?: NonNullable<RollupDataPoint[K]>;
};

export type RollupResult<T extends RollupDataType> = {
  rollupDataPoints: Array<RollupDataPointFor<T>>;
};

const FOURTEEN_DAY_ROLLUP_TYPES = new Set<DailyRollupDataType>([
  "active-minutes",
  "calories-in-heart-rate-zone",
  "heart-rate",
  "total-calories",
]);

type FilterKind = "interval" | "sample" | "daily" | "sleep" | "exercise";

/**
 * How to filter each data type when listing.
 * @see https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/list
 */
const DATA_TYPE_FILTER_KIND = {
  "active-energy-burned": "interval",
  "active-minutes": "interval",
  "active-zone-minutes": "interval",
  "activity-level": "interval",
  altitude: "interval",
  "basal-energy-burned": "interval",
  "blood-glucose": "sample",
  "body-fat": "sample",
  "core-body-temperature": "sample",
  "daily-heart-rate-variability": "daily",
  "daily-heart-rate-zones": "daily",
  "daily-oxygen-saturation": "daily",
  "daily-respiratory-rate": "daily",
  "daily-resting-heart-rate": "daily",
  "daily-sleep-temperature-derivations": "daily",
  "daily-vo2-max": "daily",
  distance: "interval",
  electrocardiogram: "interval",
  exercise: "exercise",
  floors: "interval",
  "heart-rate": "sample",
  "heart-rate-variability": "sample",
  height: "sample",
  "hydration-log": "interval",
  "irregular-rhythm-notification": "interval",
  "menstrual-period": "interval",
  moods: "sample",
  "nutrition-log": "interval",
  "ovulation-test": "sample",
  "oxygen-saturation": "sample",
  "respiratory-rate-sleep-summary": "sample",
  "run-vo2-max": "sample",
  "sedentary-period": "interval",
  sleep: "sleep",
  steps: "interval",
  "swim-lengths-data": "interval",
  symptoms: "sample",
  "time-in-heart-rate-zone": "interval",
  "vo2-max": "sample",
  weight: "sample",
} as const satisfies Record<DataType, FilterKind>;

function camelToSnake(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function filterField(dataType: DataType, timeField: "civil" | "physical") {
  const prefix = camelToSnake(DATA_TYPE_PROPERTIES[dataType]);
  const kind = DATA_TYPE_FILTER_KIND[dataType];

  switch (kind) {
    case "interval":
      return timeField === "civil"
        ? `${prefix}.interval.civil_start_time`
        : `${prefix}.interval.start_time`;
    case "sample":
      return timeField === "civil"
        ? `${prefix}.sample_time.civil_time`
        : `${prefix}.sample_time.physical_time`;
    case "daily":
      return `${prefix}.date`;
    case "exercise":
      // Session types other than sleep/ECG only support civil start time.
      return `${prefix}.interval.civil_start_time`;
    case "sleep":
      return timeField === "civil"
        ? `${prefix}.interval.civil_end_time`
        : `${prefix}.interval.end_time`;
  }
}

function timeRangeFilter(
  dataType: DataType,
  start: string,
  end: string,
  timeField: "civil" | "physical",
) {
  const field = filterField(dataType, timeField);
  return `${field} >= "${start}" AND ${field} < "${end}"`;
}

function pageSizeFor(dataType: DataType) {
  return dataType === "exercise" || dataType === "sleep" ? 25 : 10000;
}

export async function getDataPoint<T extends DataType>(
  dataType: T,
  dataPointId: string,
): Promise<DataPointFor<T>> {
  const response = await healthUsersDataTypesDataPointsGet(
    "me",
    dataType,
    dataPointId,
  );

  return response.data as DataPointFor<T>;
}

export async function listDataPointsPage<T extends DataType>(
  dataType: T,
  filter: string,
  pageToken?: string,
  pageSize?: number,
): Promise<{
  dataPoints: Array<DataPointFor<T>>;
  nextPageToken?: string;
}> {
  const response = await healthUsersDataTypesDataPointsList("me", dataType, {
    filter,
    pageSize: Math.min(
      pageSize ?? pageSizeFor(dataType),
      pageSizeFor(dataType),
    ),
    pageToken,
  });

  return {
    dataPoints: (response.data.dataPoints ?? []) as Array<DataPointFor<T>>,
    nextPageToken: response.data.nextPageToken,
  };
}

async function listDataPoints<T extends DataType>(
  dataType: T,
  filter: string,
): Promise<ListDatapointsResult<T>> {
  const dataPoints: Array<DataPointFor<T>> = [];
  let pageToken: string | undefined;

  do {
    const page = await listDataPointsPage(dataType, filter, pageToken);
    dataPoints.push(...page.dataPoints);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return { dataPoints };
}

/** The DataPoint union value for a given data type. */
export function getDataPointValue<T extends DataType>(
  dataType: T,
  dataPoint: DataPointFor<T>,
) {
  return dataPoint[DATA_TYPE_PROPERTIES[dataType]];
}

export function buildOneDayDatapointsQuery<T extends DataType>(
  dataType: T,
  day: Dayjs,
) {
  const date = formatAsDate(day);
  const nextDate = formatAsDate(day.add(1, "day"));

  return queryOptions({
    queryKey: ["datapoints", dataType, date],
    queryFn: () =>
      listDataPoints(
        dataType,
        timeRangeFilter(dataType, date, nextDate, "civil"),
      ),
    staleTime: graduallyStale(day),
  });
}

export function buildDatapointsQuery<T extends DataType>(
  dataType: T,
  start: Dayjs,
  end: Dayjs,
) {
  const kind = DATA_TYPE_FILTER_KIND[dataType];
  const usesCivilDate = kind === "daily" || kind === "exercise";
  const startValue = usesCivilDate ? formatAsDate(start) : start.toISOString();
  const endValue = usesCivilDate ? formatAsDate(end) : end.toISOString();
  const timeField = usesCivilDate ? "civil" : "physical";

  return queryOptions({
    queryKey: ["datapoints", dataType, start.toISOString(), end.toISOString()],
    queryFn: () =>
      listDataPoints(
        dataType,
        timeRangeFilter(dataType, startValue, endValue, timeField),
      ),
    staleTime: graduallyStale(end),
  });
}

function toCivilDate(day: Dayjs): CivilDateTime {
  return {
    date: {
      year: day.year(),
      month: day.month() + 1,
      day: day.date(),
    },
  };
}

function maxDailyRollupRangeDays(dataType: DailyRollupDataType) {
  return FOURTEEN_DAY_ROLLUP_TYPES.has(dataType) ? 14 : 90;
}

async function listDailyRollups<T extends DailyRollupDataType>(
  dataType: T,
  start: Dayjs,
  end: Dayjs,
): Promise<DailyRollupResult<T>> {
  const rollupDataPoints: Array<DailyRollupDataPointFor<T>> = [];
  const maxDays = maxDailyRollupRangeDays(dataType);
  let windowStart = start.startOf("day");
  const rangeEnd = end.startOf("day");

  while (windowStart.isBefore(rangeEnd)) {
    const windowEndCandidate = windowStart.add(maxDays, "day");
    const windowEnd = windowEndCandidate.isAfter(rangeEnd)
      ? rangeEnd
      : windowEndCandidate;
    const windowDays = windowEnd.diff(windowStart, "day");

    const response = await healthUsersDataTypesDataPointsDailyRollUp(
      "me",
      dataType,
      {
        range: {
          start: toCivilDate(windowStart),
          end: toCivilDate(windowEnd),
        },
        // windowSizeDays (default 1) * pageSize cannot exceed maxDays.
        pageSize: Math.min(Math.max(windowDays, 1), maxDays),
      },
    );

    rollupDataPoints.push(
      ...((response.data.rollupDataPoints ?? []) as Array<
        DailyRollupDataPointFor<T>
      >),
    );
    windowStart = windowEnd;
  }

  return { rollupDataPoints };
}

/** The DailyRollupDataPoint union value for a given data type. */
export function getDailyRollupValue<T extends DailyRollupDataType>(
  dataType: T,
  dataPoint: DailyRollupDataPointFor<T>,
) {
  return dataPoint[DAILY_ROLLUP_PROPERTIES[dataType]];
}

export function buildDailyRollupQuery<T extends DailyRollupDataType>(
  dataType: T,
  start: Dayjs,
  end: Dayjs,
) {
  const startDate = formatAsDate(start);
  const endDate = formatAsDate(end);

  return queryOptions({
    queryKey: ["datapoints", "daily-rollup", dataType, startDate, endDate],
    queryFn: () => listDailyRollups(dataType, start, end),
    staleTime: graduallyStale(end),
  });
}

function maxRollupRangeDays(dataType: RollupDataType) {
  return FOURTEEN_DAY_ROLLUP_TYPES.has(dataType as DailyRollupDataType)
    ? 14
    : 90;
}

async function listRollups<T extends RollupDataType>(
  dataType: T,
  start: Dayjs,
  end: Dayjs,
  windowSize: string,
): Promise<RollupResult<T>> {
  const rollupDataPoints: Array<RollupDataPointFor<T>> = [];
  const maxDays = maxRollupRangeDays(dataType);
  let windowStart = start;
  const rangeEnd = end;

  while (windowStart.isBefore(rangeEnd)) {
    const windowEndCandidate = windowStart.add(maxDays, "day");
    const windowEnd = windowEndCandidate.isAfter(rangeEnd)
      ? rangeEnd
      : windowEndCandidate;

    let pageToken: string | undefined;

    do {
      const response = await healthUsersDataTypesDataPointsRollUp(
        "me",
        dataType,
        {
          range: {
            startTime: windowStart.toISOString(),
            endTime: windowEnd.toISOString(),
          },
          windowSize,
          pageSize: 10000,
          pageToken,
        },
      );

      rollupDataPoints.push(
        ...((response.data.rollupDataPoints ?? []) as Array<
          RollupDataPointFor<T>
        >),
      );
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    windowStart = windowEnd;
  }

  return { rollupDataPoints };
}

/** The RollupDataPoint union value for a given data type. */
export function getRollupValue<T extends RollupDataType>(
  dataType: T,
  dataPoint: RollupDataPointFor<T>,
) {
  return dataPoint[ROLLUP_PROPERTIES[dataType]];
}

export function buildRollupQuery<T extends RollupDataType>(
  dataType: T,
  start: Dayjs,
  end: Dayjs,
  windowSize: string,
) {
  return queryOptions({
    queryKey: [
      "datapoints",
      "rollup",
      dataType,
      windowSize,
      start.toISOString(),
      end.toISOString(),
    ],
    queryFn: () => listRollups(dataType, start, end, windowSize),
    staleTime: graduallyStale(end),
  });
}
