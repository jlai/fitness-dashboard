import dayjs from "dayjs";

import { TimeSeriesEntry } from "@/api/times-series";
import { WeightLog } from "@/api/body/types";
import { MOCK_DATE } from "@/e2e/fixtures/standard";

// Date helpers
export const TODAY = dayjs(MOCK_DATE);
export const TODAY_ISO = TODAY.format("YYYY-MM-DD");
export const YESTERDAY = TODAY.subtract(1, "day");
export const YESTERDAY_ISO = YESTERDAY.format("YYYY-MM-DD");
export const TWO_DAYS_AGO = TODAY.subtract(2, "day");
export const TWO_DAYS_AGO_ISO = TWO_DAYS_AGO.format("YYYY-MM-DD");

// Initial weight logs
export const INITIAL_WEIGHT_LOGS: WeightLog[] = [
  {
    logId: 1,
    weight: 168, // 168 pounds
    bmi: 23.8,
    fat: 21,
    date: TODAY_ISO,
    time: "08:00:00",
    source: "API",
  },
];

export const NEW_WEIGHT_LOG: WeightLog = {
  logId: 2,
  weight: 166.5, // 166.5 pounds
  bmi: 23.5,
  fat: 20,
  date: TODAY_ISO,
  time: "12:00:00",
  source: "API",
};

// Time series data
export const WEIGHT_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: TODAY_ISO, value: "168" },
  { dateTime: YESTERDAY_ISO, value: "169.5" },
  { dateTime: TWO_DAYS_AGO_ISO, value: "170" },
];

export const FAT_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: TODAY_ISO, value: "21" },
  { dateTime: YESTERDAY_ISO, value: "21.5" },
  { dateTime: TWO_DAYS_AGO_ISO, value: "22" },
];

export const BMI_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: TODAY_ISO, value: "23.8" },
  { dateTime: YESTERDAY_ISO, value: "24.0" },
  { dateTime: TWO_DAYS_AGO_ISO, value: "24.1" },
];
