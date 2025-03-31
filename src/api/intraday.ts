import { queryOptions } from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";
import { formatAsDate, formatHoursMinutes } from "./datetime";
import { makeRequest } from "./request";
import {
  ActiveZoneMinutesTimeSeriesValue,
  HeartRateZone,
} from "./times-series";
import { parseHeartRateZones } from "./heart-rate";

type IntradayTimeEntry = {
  time: string; // "08:00:00", does not include date
  value: number;
};

type IntradayMinuteEntry<ValueType = number> = {
  minute: string; // "2020-09-17T17:00:00"
  value: ValueType;
};

/** Intraday entry converted to a date-time */
export type IntradayEntry<ValueType = number> = {
  dateTime: Date;
  value: ValueType;
};

type GetIntradayResponse = {
  [key: string]: {
    dataset: Array<IntradayTimeEntry>;
  };
};

type GetIntradayMinutesResponse<ValueType = number> = {
  [key: string]: Array<{
    minutes: Array<IntradayMinuteEntry<ValueType>>;
  }>;
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

/** Convert an intraday dataset ("minutes" array) to one that has a dateTime */
export function parseIntradayMinutesDataset<ValueType = number>(
  response: GetIntradayMinutesResponse<ValueType>,
  key: string
): Array<IntradayEntry<ValueType>> {
  return response[key].flatMap(({ minutes }) =>
    minutes.map((entry) => ({
      dateTime: new Date(entry.minute),
      value: entry.value,
    }))
  );
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

export function buildActiveZoneMinutesIntradayQuery(
  detailLevel: "1min" | "5min" | "15min",
  startTime: Dayjs,
  endTime: Dayjs
) {
  return queryOptions({
    queryKey: [
      "active-zone-minutes-intraday",
      startTime.toISOString(),
      endTime.toISOString(),
    ],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/active-zone-minutes/date/${formatAsDate(
          startTime
        )}/${formatAsDate(endTime)}/${detailLevel}/time/${formatHoursMinutes(
          startTime
        )}/${formatHoursMinutes(endTime)}.json`
      );

      const intradayData =
        (await response.json()) as GetIntradayMinutesResponse<ActiveZoneMinutesTimeSeriesValue>;

      return parseIntradayMinutesDataset<ActiveZoneMinutesTimeSeriesValue>(
        intradayData,
        "activities-active-zone-minutes-intraday"
      );
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}

export type GetHeartIntradayResponse = {
  "activities-heart": Array<{
    customHeartRateZones: Array<HeartRateZone>;
    heartRateZones: Array<HeartRateZone>;
    dateTime: string;
    value: string;
  }>;
  "activities-heart-intraday": {
    dataset: Array<IntradayTimeEntry>;
    datasetInterval: number;
    datasetType: string;
  };
};

export function buildHeartRateIntradayQuery(
  detailLevel: "1min" | "5min" | "15min",
  startTime: Dayjs,
  endTime: Dayjs
) {
  return queryOptions({
    queryKey: [
      "heart-rate-intraday",
      startTime.toISOString(),
      endTime.toISOString(),
    ],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/heart/date/${formatAsDate(
          startTime
        )}/${formatAsDate(endTime)}/${detailLevel}/time/${formatHoursMinutes(
          startTime
        )}/${formatHoursMinutes(endTime)}.json`,
        {
          headers: {
            "Accept-Language": "fr-FR",
          },
        }
      );

      const responseData = (await response.json()) as GetHeartIntradayResponse;

      return {
        heartRateZones: parseHeartRateZones(
          responseData["activities-heart"][0].heartRateZones
        ),
        intradayData: parseIntradayDataset(
          startTime,
          endTime,
          responseData["activities-heart-intraday"].dataset
        ),
      };
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
