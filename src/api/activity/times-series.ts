import { Dayjs } from "dayjs";
import { queryOptions } from "@tanstack/react-query";

import { formatAsDate } from "../datetime";
import { makeRequest } from "../request";

// https://dev.fitbit.com/build/reference/web-api/activity-timeseries/get-activity-timeseries-by-date-range/#Resource-Options
export enum ActivityTimeSeriesResource {
  Calories = "calories",
  Distance = "distance",
  Steps = "steps",
  Floors = "floors",
}

export type ActivityTimeSeriesResponse<ResourceName extends string> = {
  [key in ResourceName]: Array<{
    dateTime: string;
    value: string;
  }>;
};

export function getActivityTimeSeriesQuery<ResourceKey extends string = string>(
  resource: ActivityTimeSeriesResource,
  startDay: Dayjs,
  endDay: Dayjs
) {
  const startDate = formatAsDate(startDay);
  const endDate = formatAsDate(endDay);

  return queryOptions({
    queryKey: ["timeseries", resource, startDay, endDay],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/${resource.toString()}/date/${startDate}/${endDate}.json`
      );

      return (await response.json()) as ActivityTimeSeriesResponse<ResourceKey>;
    },
  });
}
