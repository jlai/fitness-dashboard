import dayjs, { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";
import { groupBy, sumBy } from "es-toolkit";

import { formatAsDate } from "./datetime";
import { makeRequest } from "./request";
import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";
import { GetSleepLogTimeSeriesResponse } from "./sleep";

// https://dev.fitbit.com/build/reference/web-api/activity-timeseries/get-activity-timeseries-by-date-range/#Resource-Options
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
  | "active-zone-minutes";

export interface HeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: string;
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
  urlPrefix: string;
  responseKey: string;
  requiredScopes: Array<string>;
  maxDays: number;
  extractData?: (responseBody: any) => Array<TimeSeriesEntry<any>>;
}

export const TIME_SERIES_CONFIGS: Record<
  TimeSeriesResource,
  TimeSeriesResourceConfig
> = {
  // activities
  calories: {
    urlPrefix: "/1/user/-/activities/calories/date/",
    responseKey: "activities-calories",
    requiredScopes: ["act"],
    maxDays: 1095,
  },
  distance: {
    urlPrefix: "/1/user/-/activities/distance/date/",
    responseKey: "activities-distance",
    requiredScopes: ["act"],
    maxDays: 1095,
  },
  steps: {
    urlPrefix: "/1/user/-/activities/steps/date/",
    responseKey: "activities-steps",
    requiredScopes: ["act"],
    maxDays: 1095,
  },
  floors: {
    urlPrefix: "/1/user/-/activities/floors/date/",
    responseKey: "activities-floors",
    requiredScopes: ["act"],
    maxDays: 1095,
  },
  // body
  weight: {
    urlPrefix: "/1/user/-/body/weight/date/",
    responseKey: "body-weight",
    requiredScopes: ["wei"],
    maxDays: 1095,
  },
  fat: {
    urlPrefix: "/1/user/-/body/fat/date/",
    responseKey: "body-fat",
    requiredScopes: ["wei"],
    maxDays: 1095,
  },
  bmi: {
    urlPrefix: "/1/user/-/body/bmi/date/",
    responseKey: "body-bmi",
    requiredScopes: ["wei"],
    maxDays: 1095,
  },
  // nutrition
  ["calories-in"]: {
    urlPrefix: "/1/user/-/foods/log/caloriesIn/date/",
    responseKey: "foods-log-caloriesIn",
    requiredScopes: ["nut"],
    maxDays: 1095,
  },
  water: {
    urlPrefix: "/1/user/-/foods/log/water/date/",
    responseKey: "foods-log-water",
    requiredScopes: ["nut"],
    maxDays: 1095,
  },
  // other
  ["heart"]: {
    urlPrefix: "/1/user/-/activities/heart/date/",
    responseKey: "activities-heart",
    requiredScopes: ["hr"],
    maxDays: 366,
  },
  ["hrv"]: {
    urlPrefix: "/1/user/-/hrv/date/",
    responseKey: "hrv",
    requiredScopes: ["hr"],
    maxDays: 31,
  },
  ["active-zone-minutes"]: {
    urlPrefix: "/1/user/-/activities/active-zone-minutes/date/",
    responseKey: "activities-active-zone-minutes",
    requiredScopes: ["act"],
    maxDays: Infinity,
  },
  sleep: {
    urlPrefix: "/1.2/user/-/sleep/date/",
    responseKey: "sleep",
    requiredScopes: ["sle"],
    maxDays: 100,
    extractData: (data: GetSleepLogTimeSeriesResponse) => {
      const sleepsByDate = groupBy(data.sleep, (sleepLog) =>
        formatAsDate(dayjs(sleepLog.endTime))
      );

      return Object.entries(sleepsByDate)
        .map(([dateString, sleepLogs]) => ({
          dateTime: dateString,
          value: sumBy(sleepLogs, ({ minutesAsleep }) => minutesAsleep),
        }))
        .toReversed();
    },
  },
};

export type TimeSeriesEntry<ValueType> = {
  dateTime: string;
  value: ValueType;
};

export type TimeSeriesResponse<ResourceName extends string, TEntry> = {
  [key in ResourceName]: Array<TEntry>;
};

export function buildTimeSeriesQuery<TEntry = TimeSeriesEntry<string>>(
  resource: TimeSeriesResource,
  startDay: Dayjs,
  endDay: Dayjs
) {
  const startDate = formatAsDate(startDay);
  const endDate = formatAsDate(endDay);

  return queryOptions({
    queryKey: ["timeseries", resource, startDay, endDay],
    queryFn: async () => {
      const config = TIME_SERIES_CONFIGS[resource];

      const response = await makeRequest(
        `${config.urlPrefix}${startDate}/${endDate}.json`,
        {
          headers: {
            // For heart rate zones where we need to match the name
            "Accept-Locale": "en-US",
          },
        }
      );

      const defaultExtractData = (responseBody: any) => {
        const data = (responseBody as TimeSeriesResponse<string, TEntry>)[
          config.responseKey
        ];

        if (!data) {
          throw new Error(
            "key missing from response: ${config.responseKey}; keys: ${Object.keys(data)}"
          );
        }

        return data;
      };

      const extractData = config.extractData ?? defaultExtractData;
      return extractData(await response.json()) as Array<TEntry>;
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
