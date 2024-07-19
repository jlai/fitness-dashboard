import { queryOptions } from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";
import { formatAsDate, formatHoursMinutes } from "./datetime";
import { makeRequest } from "./request";

type IntradayTimeEntry = {
  time: string; // "08:00:00", does not include date
  value: number;
};

/** Intraday entry converted to a date-time */
export type IntradayEntry = {
  dateTime: Date;
  value: number;
};

type GetIntradayResponse = {
  [key: string]: {
    dataset: Array<IntradayTimeEntry>;
  };
};

/** Convert an intraday dataset (time only) to one that has a dateTime */
export function parseIntradayDataset(
  startTime: Dayjs,
  endTime: Dayjs,
  dataset: Array<IntradayTimeEntry>
): Array<IntradayEntry> {
  const startDateStr = formatAsDate(startTime);
  const endDateStr = formatAsDate(endTime);
  const earliestStartTimeStr = startTime.format("HH:mm:ss");
  const timeZoneStr = startTime.format("Z");

  // Compares time by string; if it occurs before the start time, assume it's on the end day
  return dataset.map(({ time, ...rest }) => ({
    dateTime: new Date(
      `${
        time < earliestStartTimeStr ? endDateStr : startDateStr
      }T${time}${timeZoneStr}`
    ),
    ...rest,
  }));
}

export function buildActivityIntradayQuery(
  resource: "calories" | "distance" | "elevation" | "floors" | "steps",
  detailLevel: "1min" | "5min" | "15min",
  startTime: Dayjs,
  endTime: Dayjs
) {
  return queryOptions({
    queryKey: [
      "activity-intraday",
      resource,
      startTime.toISOString(),
      endTime.toISOString(),
    ],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/${resource}/date/${formatAsDate(
          startTime
        )}/${formatAsDate(endTime)}/${detailLevel}/time/${formatHoursMinutes(
          startTime
        )}/${formatHoursMinutes(endTime)}.json`
      );

      const intradayData = ((await response.json()) as GetIntradayResponse)[
        `activities-${resource}-intraday`
      ];

      return parseIntradayDataset(startTime, endTime, intradayData.dataset);
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
