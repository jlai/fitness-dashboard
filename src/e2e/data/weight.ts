import dayjs from "dayjs";

import type { DataPoint } from "@generated/orval/fetch/google-health-api/models";

import {
  gramsFromLocalizedWeight,
  kilogramsFromLocalizedWeight,
} from "@/api/body";
import { SettingsWeightUnit } from "@/api/user";
import { TimeSeriesEntry } from "@/api/times-series";
import { MOCK_DATE } from "@/e2e/fixtures/standard";

const POUNDS = SettingsWeightUnit.WEIGHT_UNIT_POUNDS;

export const TODAY = dayjs(MOCK_DATE);
export const TODAY_ISO = TODAY.format("YYYY-MM-DD");
export const YESTERDAY = TODAY.subtract(1, "day");
export const YESTERDAY_ISO = YESTERDAY.format("YYYY-MM-DD");
export const TWO_DAYS_AGO = TODAY.subtract(2, "day");
export const TWO_DAYS_AGO_ISO = TWO_DAYS_AGO.format("YYYY-MM-DD");

function civilDate(isoDate: string) {
  const day = dayjs(isoDate);
  return {
    year: day.year(),
    month: day.month() + 1,
    day: day.date(),
  };
}

function civilTime(time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return { hours, minutes, seconds };
}

function sampleTime(date: string, time: string) {
  return {
    physicalTime: dayjs(`${date}T${time}`).toISOString(),
    utcOffset: "-25200s",
    civilTime: {
      date: civilDate(date),
      time: civilTime(time),
    },
  };
}

export function weightDataPoint({
  id,
  date,
  time = "08:00:00",
  pounds,
}: {
  id: string;
  date: string;
  time?: string;
  pounds: number;
}): DataPoint {
  return {
    name: `users/me/dataTypes/weight/dataPoints/${id}`,
    weight: {
      weightGrams: gramsFromLocalizedWeight(pounds, POUNDS),
      sampleTime: sampleTime(date, time),
    },
  };
}

export function bodyFatDataPoint({
  id,
  date,
  time = "08:00:00",
  percent,
}: {
  id: string;
  date: string;
  time?: string;
  percent: number;
}): DataPoint {
  return {
    name: `users/me/dataTypes/body-fat/dataPoints/${id}`,
    bodyFat: {
      percentage: percent,
      sampleTime: sampleTime(date, time),
    },
  };
}

export const INITIAL_WEIGHT_DATA_POINTS: Array<DataPoint> = [
  weightDataPoint({ id: "1", date: TODAY_ISO, pounds: 168 }),
];

export const INITIAL_FAT_DATA_POINTS: Array<DataPoint> = [
  bodyFatDataPoint({ id: "1", date: TODAY_ISO, percent: 21 }),
];

export const NEW_WEIGHT_DATA_POINT = weightDataPoint({
  id: "2",
  date: TODAY_ISO,
  time: "12:00:00",
  pounds: 166.5,
});

export const NEW_FAT_DATA_POINT = bodyFatDataPoint({
  id: "2",
  date: TODAY_ISO,
  time: "12:00:00",
  percent: 20,
});

export function kgFromPounds(pounds: number) {
  return String(kilogramsFromLocalizedWeight(pounds, POUNDS));
}

export const WEIGHT_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: TODAY_ISO, value: kgFromPounds(168) },
  { dateTime: YESTERDAY_ISO, value: kgFromPounds(169.5) },
  { dateTime: TWO_DAYS_AGO_ISO, value: kgFromPounds(170) },
];

export const FAT_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: TODAY_ISO, value: "21" },
  { dateTime: YESTERDAY_ISO, value: "21.5" },
  { dateTime: TWO_DAYS_AGO_ISO, value: "22" },
];
