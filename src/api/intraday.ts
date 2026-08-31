import { queryOptions } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { groupBy, sumBy } from "es-toolkit";

import {
  ActiveZoneMinutesHeartRateZone,
  type CivilDateTime,
  type ObservationTimeInterval,
} from "@generated/orval/fetch/google-health-api/models";

import { graduallyStale } from "./cache-settings";
import {
  buildDatapointsQuery,
  buildOneDayDatapointsQuery,
  buildRollupQuery,
  getDataPointValue,
  getRollupValue,
  type DataPointFor,
  type DataType,
  type RollupDataPointFor,
} from "./datapoints";
import { parseDailyHeartRateZones } from "./heart-rate";
import { ActiveZoneMinutesTimeSeriesValue } from "./times-series";

/** Intraday entry converted to a date-time */
export type IntradayEntry<ValueType = number> = {
  dateTime: Date;
  value: ValueType;
};

export type ActivityIntradayResource =
  "calories" | "distance" | "floors" | "steps";

export type IntradayDetailLevel = "1min" | "5min" | "15min";

const ACTIVITY_INTRADAY_DATA_TYPES = {
  distance: "distance",
  floors: "floors",
  steps: "steps",
} as const satisfies Record<
  Exclude<ActivityIntradayResource, "calories">,
  DataType
>;

const DETAIL_LEVEL_MINUTES: Record<IntradayDetailLevel, number> = {
  "1min": 1,
  "5min": 5,
  "15min": 15,
};

const MILLIMETERS_PER_KILOMETER = 1_000_000;

function dateTimeFromCivil(civil?: CivilDateTime) {
  const date = civil?.date;
  if (date?.year == null || date.month == null || date.day == null) {
    return undefined;
  }

  const time = civil?.time;

  return new Date(
    date.year,
    date.month - 1,
    date.day,
    time?.hours ?? 0,
    time?.minutes ?? 0,
    time?.seconds ?? 0,
    time?.nanos != null ? Math.floor(time.nanos / 1_000_000) : 0,
  );
}

function dateTimeFromInterval(interval?: ObservationTimeInterval) {
  if (interval?.startTime) {
    return new Date(interval.startTime);
  }

  return dateTimeFromCivil(interval?.civilStartTime);
}

function finiteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function alignToDetailLevel(date: Date, detailLevel: IntradayDetailLevel) {
  const minutes = DETAIL_LEVEL_MINUTES[detailLevel];
  const aligned = dayjs(date);
  const alignedMinute = Math.floor(aligned.minute() / minutes) * minutes;

  return aligned.minute(alignedMinute).second(0).millisecond(0).toDate();
}

export function aggregateIntradayEntries<T>(
  entries: Array<IntradayEntry<T>>,
  detailLevel: IntradayDetailLevel,
  combine: (values: Array<T>) => T,
): Array<IntradayEntry<T>> {
  const byBucket = groupBy(entries, (entry) =>
    alignToDetailLevel(entry.dateTime, detailLevel).toISOString(),
  );

  return Object.entries(byBucket)
    .map(([timestamp, bucket]) => ({
      dateTime: new Date(timestamp),
      value: combine(bucket.map((entry) => entry.value)),
    }))
    .toSorted((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
}

function sumNumbers(values: Array<number>) {
  return sumBy(values, (value) => value);
}

function averageNumbers(values: Array<number>) {
  return values.length === 0 ? 0 : sumNumbers(values) / values.length;
}

function sumActiveZoneMinutes(
  values: Array<ActiveZoneMinutesTimeSeriesValue>,
): ActiveZoneMinutesTimeSeriesValue {
  return {
    activeZoneMinutes: sumBy(values, (value) => value.activeZoneMinutes),
    fatBurnActiveZoneMinutes: sumBy(
      values,
      (value) => value.fatBurnActiveZoneMinutes,
    ),
    cardioActiveZoneMinutes: sumBy(
      values,
      (value) => value.cardioActiveZoneMinutes,
    ),
    peakActiveZoneMinutes: sumBy(
      values,
      (value) => value.peakActiveZoneMinutes,
    ),
  };
}

type ActivityIntradayDataPoint =
  DataPointFor<"steps"> | DataPointFor<"floors"> | DataPointFor<"distance">;

export function toActivityIntradayEntries(
  resource: Exclude<ActivityIntradayResource, "calories">,
  dataPoints: ReadonlyArray<ActivityIntradayDataPoint>,
): Array<IntradayEntry> {
  switch (resource) {
    case "steps":
      return (dataPoints as Array<DataPointFor<"steps">>).flatMap(
        (dataPoint) => {
          const value = getDataPointValue("steps", dataPoint);
          const dateTime = dateTimeFromInterval(value.interval);
          const count = finiteNumber(value.count);

          if (!dateTime || count == null) {
            return [];
          }

          return [{ dateTime, value: count }];
        },
      );
    case "floors":
      return (dataPoints as Array<DataPointFor<"floors">>).flatMap(
        (dataPoint) => {
          const value = getDataPointValue("floors", dataPoint);
          const dateTime = dateTimeFromInterval(value.interval);
          const count = finiteNumber(value.count);

          if (!dateTime || count == null) {
            return [];
          }

          return [{ dateTime, value: count }];
        },
      );
    case "distance":
      return (dataPoints as Array<DataPointFor<"distance">>).flatMap(
        (dataPoint) => {
          const value = getDataPointValue("distance", dataPoint);
          const dateTime = dateTimeFromInterval(value.interval);
          const millimeters = finiteNumber(value.millimeters);

          if (!dateTime || millimeters == null) {
            return [];
          }

          return [{ dateTime, value: millimeters / MILLIMETERS_PER_KILOMETER }];
        },
      );
  }
}

export function toCaloriesIntradayEntries(
  rollupDataPoints: ReadonlyArray<RollupDataPointFor<"total-calories">>,
): Array<IntradayEntry> {
  return rollupDataPoints.flatMap((dataPoint) => {
    if (!dataPoint.startTime) {
      return [];
    }

    const kcal = finiteNumber(
      getRollupValue("total-calories", dataPoint).kcalSum,
    );

    return [
      {
        dateTime: new Date(dataPoint.startTime),
        value: kcal ?? 0,
      },
    ];
  });
}

export function toHeartRateIntradayEntries(
  dataPoints: Array<DataPointFor<"heart-rate">>,
): Array<IntradayEntry> {
  return dataPoints.flatMap((dataPoint) => {
    const value = getDataPointValue("heart-rate", dataPoint);
    const dateTime = value.sampleTime?.physicalTime
      ? new Date(value.sampleTime.physicalTime)
      : dateTimeFromCivil(value.sampleTime?.civilTime);
    const beatsPerMinute = finiteNumber(value.beatsPerMinute);

    if (!dateTime || beatsPerMinute == null) {
      return [];
    }

    return [{ dateTime, value: beatsPerMinute }];
  });
}

export function toActiveZoneMinutesIntradayEntries(
  dataPoints: Array<DataPointFor<"active-zone-minutes">>,
): Array<IntradayEntry<ActiveZoneMinutesTimeSeriesValue>> {
  return dataPoints.flatMap((dataPoint) => {
    const value = getDataPointValue("active-zone-minutes", dataPoint);
    const dateTime = dateTimeFromInterval(value.interval);
    const minutes = finiteNumber(value.activeZoneMinutes) ?? 0;
    const zone = value.heartRateZone;

    if (!dateTime) {
      return [];
    }

    return [
      {
        dateTime,
        value: {
          activeZoneMinutes: minutes,
          fatBurnActiveZoneMinutes:
            zone === ActiveZoneMinutesHeartRateZone.FAT_BURN ? minutes : 0,
          cardioActiveZoneMinutes:
            zone === ActiveZoneMinutesHeartRateZone.CARDIO ? minutes : 0,
          peakActiveZoneMinutes:
            zone === ActiveZoneMinutesHeartRateZone.PEAK ? minutes : 0,
        },
      },
    ];
  });
}

type CountedActivityIntradayResource = Exclude<
  ActivityIntradayResource,
  "calories"
>;

function buildCaloriesIntradayQuery(
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  const windowSize = `${DETAIL_LEVEL_MINUTES[detailLevel] * 60}s`;

  return queryOptions({
    ...buildRollupQuery("total-calories", startTime, endTime, windowSize),
    select: ({ rollupDataPoints }) =>
      toCaloriesIntradayEntries(rollupDataPoints),
  });
}

function buildCountedActivityIntradayQuery(
  resource: CountedActivityIntradayResource,
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  const dataType = ACTIVITY_INTRADAY_DATA_TYPES[resource];

  return queryOptions({
    ...buildDatapointsQuery(dataType, startTime, endTime),
    select: ({ dataPoints }) =>
      aggregateIntradayEntries(
        toActivityIntradayEntries(resource, dataPoints),
        detailLevel,
        sumNumbers,
      ),
  });
}

export function buildActivityIntradayQuery(
  resource: "calories",
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
): ReturnType<typeof buildCaloriesIntradayQuery>;
export function buildActivityIntradayQuery(
  resource: CountedActivityIntradayResource,
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
): ReturnType<typeof buildCountedActivityIntradayQuery>;
export function buildActivityIntradayQuery(
  resource: ActivityIntradayResource,
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  if (resource === "calories") {
    return buildCaloriesIntradayQuery(detailLevel, startTime, endTime);
  }

  return buildCountedActivityIntradayQuery(
    resource,
    detailLevel,
    startTime,
    endTime,
  );
}

export function buildActiveZoneMinutesIntradayQuery(
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  return queryOptions({
    ...buildDatapointsQuery("active-zone-minutes", startTime, endTime),
    select: ({ dataPoints }) =>
      aggregateIntradayEntries(
        toActiveZoneMinutesIntradayEntries(dataPoints),
        detailLevel,
        sumActiveZoneMinutes,
      ),
  });
}

export function buildHeartRateIntradayQuery(
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  const samplesQuery = buildDatapointsQuery("heart-rate", startTime, endTime);
  const zonesQuery = buildOneDayDatapointsQuery(
    "daily-heart-rate-zones",
    startTime,
  );

  return queryOptions({
    queryKey: [
      "datapoints",
      "heart-rate-intraday",
      startTime.toISOString(),
      endTime.toISOString(),
    ],
    queryFn: async ({ client }) => {
      const [{ dataPoints }, { dataPoints: zonePoints }] = await Promise.all([
        client.fetchQuery(samplesQuery),
        client.fetchQuery(zonesQuery),
      ]);

      return {
        heartRateZones: parseDailyHeartRateZones(
          zonePoints[0]
            ? getDataPointValue("daily-heart-rate-zones", zonePoints[0])
                .heartRateZones
            : undefined,
        ),
        samples: toHeartRateIntradayEntries(dataPoints),
      };
    },
    select: ({ heartRateZones, samples }) => ({
      heartRateZones,
      intradayData: aggregateIntradayEntries(
        samples,
        detailLevel,
        averageNumbers,
      ),
    }),
    staleTime: graduallyStale(endTime),
  });
}
