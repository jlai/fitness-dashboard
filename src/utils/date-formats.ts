"use client";

import dayjs, { Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

const SHORT_DATE_TIME_THIS_YEAR = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const SHORT_DATE_TIME_OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  year: "numeric",
});

export function formatShortDateTime(day: Dayjs) {
  const today = dayjs();

  if (day.isSame(today, "year")) {
    return SHORT_DATE_TIME_THIS_YEAR.format(day.toDate());
  }

  return SHORT_DATE_TIME_OTHER_YEAR.format(day.toDate());
}

export function formatDuration(milliseconds: number) {
  return dayjs.duration(milliseconds).format("HH:mm:ss");
}
