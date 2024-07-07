import dayjs, { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";

import { formatAsDate } from "./datetime";
import { makeRequest } from "./request";
import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";

// https://dev.fitbit.com/build/reference/web-api/activity-timeseries/get-activity-timeseries-by-date-range/#Resource-Options
export type TimeSeriesResource =
  | "calories"
  | "distance"
  | "steps"
  | "floors"
  | "resting-heart-rate"
  | "heart-rate-zones"
  | "weight"
  | "water";

export interface HeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: string;
}

export interface HeartTimeSeriesValue {
  restingHeartRate: number;
  heartRateZones: Array<HeartRateZone>;
}

interface TimeSeriesResourceConfig {
  urlPrefix: string;
  responseKey: string;
  requiredScopes: Array<string>;
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
  },
  distance: {
    urlPrefix: "/1/user/-/activities/distance/date/",
    responseKey: "activities-distance",
    requiredScopes: ["act"],
  },
  steps: {
    urlPrefix: "/1/user/-/activities/steps/date/",
    responseKey: "activities-steps",
    requiredScopes: ["act"],
  },
  floors: {
    urlPrefix: "/1/user/-/activities/floors/date/",
    responseKey: "activities-floors",
    requiredScopes: ["act"],
  },
  // body
  weight: {
    urlPrefix: "/1/user/-/body/weight/date/",
    responseKey: "body-weight",
    requiredScopes: ["weight"],
  },
  // other
  ["resting-heart-rate"]: {
    urlPrefix: "/1/user/-/activities/heart/date/",
    responseKey: "activities-heart",
    requiredScopes: ["hr"],
  },
  ["heart-rate-zones"]: {
    urlPrefix: "/1/user/-/activities/heart/date/",
    responseKey: "activities-heart",
    requiredScopes: ["hr"],
  },
  ["water"]: {
    urlPrefix: "/1/user/-/foods/log/water/date/",
    responseKey: "foods-log-water",
    requiredScopes: ["nut"],
  },
};

export type TimeSeriesEntry<ValueType> = {
  dateTime: string;
  value: ValueType;
};

export type TimeSeriesResponse<ResourceName extends string, ValueType> = {
  [key in ResourceName]: Array<TimeSeriesEntry<ValueType>>;
};

export function getTimeSeriesQuery<ValueType = unknown>(
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
            // For heart rate zones
            "Accept-Locale": "en-US",
          },
        }
      );

      const responseBody = (await response.json()) as TimeSeriesResponse<
        string,
        ValueType
      >;

      const data = responseBody[config.responseKey];

      if (!data) {
        throw new Error(
          "key missing from response: ${config.responseKey}; keys: ${Object.keys(data)}"
        );
      }

      return data;
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
