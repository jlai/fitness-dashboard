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
  type RollupDataPointFor,
  type RollupDataType,
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

type ActivityRollupResource = Exclude<ActivityIntradayResource, "steps">;

export type IntradayDetailLevel = "1min" | "5min" | "15min";

const ACTIVITY_INTRADAY_ROLLUP_DATA_TYPES = {
  calories: "total-calories",
  distance: "distance",
  floors: "floors",
} as const satisfies Record<ActivityRollupResource, RollupDataType>;

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

function dateTimePreferringCivil(
  civil: CivilDateTime | undefined,
  physical?: string,
) {
  const fromCivil = dateTimeFromCivil(civil);
  if (fromCivil && civil?.time) {
    return fromCivil;
  }

  if (physical) {
    return new Date(physical);
  }

  return fromCivil;
}

function dateTimeFromInterval(interval?: ObservationTimeInterval) {
  return dateTimePreferringCivil(interval?.civilStartTime, interval?.startTime);
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

export function toActivityIntradayEntries(
  resource: "steps",
  dataPoints: ReadonlyArray<DataPointFor<"steps">>,
): Array<IntradayEntry> {
  return dataPoints.flatMap((dataPoint) => {
    const value = getDataPointValue(resource, dataPoint);
    const dateTime = dateTimeFromInterval(value.interval);
    const count = finiteNumber(value.count);

    if (!dateTime || count == null) {
      return [];
    }

    return [{ dateTime, value: count }];
  });
}

function activityRollupValue<T extends ActivityRollupResource>(
  resource: T,
  dataPoint: RollupDataPointFor<
    (typeof ACTIVITY_INTRADAY_ROLLUP_DATA_TYPES)[T]
  >,
): number | undefined {
  switch (resource) {
    case "calories":
      return (
        finiteNumber(
          getRollupValue(
            "total-calories",
            dataPoint as RollupDataPointFor<"total-calories">,
          ).kcalSum,
        ) ?? 0
      );
    case "distance": {
      const millimeters = finiteNumber(
        getRollupValue("distance", dataPoint as RollupDataPointFor<"distance">)
          .millimetersSum,
      );

      return millimeters == null
        ? undefined
        : millimeters / MILLIMETERS_PER_KILOMETER;
    }
    case "floors":
      return finiteNumber(
        getRollupValue("floors", dataPoint as RollupDataPointFor<"floors">)
          .countSum,
      );
  }
}

export function toActivityRollupIntradayEntries<
  T extends ActivityRollupResource,
>(
  resource: T,
  rollupDataPoints: ReadonlyArray<
    RollupDataPointFor<(typeof ACTIVITY_INTRADAY_ROLLUP_DATA_TYPES)[T]>
  >,
): Array<IntradayEntry> {
  return rollupDataPoints
    .flatMap((dataPoint) => {
      if (!dataPoint.startTime) {
        return [];
      }

      const value = activityRollupValue(resource, dataPoint);
      if (value == null) {
        return [];
      }

      return [
        {
          dateTime: new Date(dataPoint.startTime),
          value,
        },
      ];
    })
    .toSorted((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
}

export function toCaloriesIntradayEntries(
  rollupDataPoints: ReadonlyArray<RollupDataPointFor<"total-calories">>,
): Array<IntradayEntry> {
  return toActivityRollupIntradayEntries("calories", rollupDataPoints);
}

export function toHeartRateIntradayEntries(
  dataPoints: Array<DataPointFor<"heart-rate">>,
): Array<IntradayEntry> {
  return dataPoints.flatMap((dataPoint) => {
    const value = getDataPointValue("heart-rate", dataPoint);
    const dateTime = dateTimePreferringCivil(
      value.sampleTime?.civilTime,
      value.sampleTime?.physicalTime,
    );
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

function buildStepsIntradayQuery(
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  return queryOptions({
    ...buildDatapointsQuery("steps", startTime, endTime, {
      timeField: "civil",
    }),
    select: ({ dataPoints }) =>
      aggregateIntradayEntries(
        toActivityIntradayEntries("steps", dataPoints),
        detailLevel,
        sumNumbers,
      ),
  });
}

function buildActivityRollupIntradayQuery(
  resource: ActivityRollupResource,
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  const windowSize = `${DETAIL_LEVEL_MINUTES[detailLevel] * 60}s`;
  const dataType = ACTIVITY_INTRADAY_ROLLUP_DATA_TYPES[resource];

  return queryOptions({
    ...buildRollupQuery(dataType, startTime, endTime, windowSize),
    select: ({ rollupDataPoints }) =>
      toActivityRollupIntradayEntries(resource, rollupDataPoints),
  });
}

export function buildActivityIntradayQuery(
  resource: "steps",
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
): ReturnType<typeof buildStepsIntradayQuery>;
export function buildActivityIntradayQuery(
  resource: ActivityRollupResource,
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
): ReturnType<typeof buildActivityRollupIntradayQuery>;
export function buildActivityIntradayQuery(
  resource: ActivityIntradayResource,
  detailLevel: IntradayDetailLevel,
  startTime: Dayjs,
  endTime: Dayjs,
) {
  if (resource === "steps") {
    return buildStepsIntradayQuery(detailLevel, startTime, endTime);
  }

  return buildActivityRollupIntradayQuery(
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
    ...buildDatapointsQuery("active-zone-minutes", startTime, endTime, {
      timeField: "civil",
    }),
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
  const samplesQuery = buildDatapointsQuery("heart-rate", startTime, endTime, {
    timeField: "civil",
  });
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
