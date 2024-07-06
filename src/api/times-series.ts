import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

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
  | "weight";

interface TimeSeriesResourceConfig {
  urlPrefix: string;
  responseKey: string;
  label: string;
  requiredScopes: Array<string>;
  chartType: "line" | "bar";
  getDataset: (data: Array<TimeSeriesEntry<any>>) => Array<{
    dateTime: Date;
    value: any;
  }>;
}

interface HeartTimeSeriesValue {
  restingHeartRate: number;
  // other fields omitted for now
}

export const TIME_SERIES_CONFIGS: Record<
  TimeSeriesResource,
  TimeSeriesResourceConfig
> = {
  // activities
  calories: {
    urlPrefix: "/1/user/-/activities/calories/date/",
    responseKey: "activities-calories",
    label: "Calories",
    requiredScopes: ["act"],
    chartType: "bar",
    getDataset: getNumericTimeSeriesDataset,
  },
  distance: {
    urlPrefix: "/1/user/-/activities/distance/date/",
    responseKey: "activities-distance",
    label: "Distance",
    requiredScopes: ["act"],
    chartType: "bar",
    getDataset: getNumericTimeSeriesDataset,
  },
  steps: {
    urlPrefix: "/1/user/-/activities/steps/date/",
    responseKey: "activities-steps",
    label: "Steps",
    requiredScopes: ["act"],
    chartType: "bar",
    getDataset: getNumericTimeSeriesDataset,
  },
  floors: {
    urlPrefix: "/1/user/-/activities/floors/date/",
    responseKey: "activities-floors",
    label: "Floors",
    requiredScopes: ["act"],
    chartType: "bar",
    getDataset: getNumericTimeSeriesDataset,
  },
  // body
  weight: {
    urlPrefix: "/1/user/-/body/weight/date/",
    responseKey: "body-weight",
    label: "Weight",
    requiredScopes: ["act"],
    chartType: "line",
    getDataset: getNumericTimeSeriesDataset,
  },
  // other
  ["resting-heart-rate"]: {
    urlPrefix: "/1/user/-/activities/heart/date/",
    responseKey: "activities-heart",
    label: "Resting Heart Rate",
    requiredScopes: ["hr"],
    chartType: "line",
    getDataset(data: Array<TimeSeriesEntry<HeartTimeSeriesValue>>) {
      return data.map((entry) => ({
        dateTime: new Date(entry.dateTime),
        value: entry.value.restingHeartRate ?? null,
      }));
    },
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
        `${config.urlPrefix}${startDate}/${endDate}.json`
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

export function getNumericTimeSeriesDataset(
  data: Array<TimeSeriesEntry<unknown>>
) {
  return data.map(({ dateTime, value }) => ({
    dateTime: new Date(dateTime),
    value: Number(value),
  }));
}
