"use client";

import dayjs, { Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

const SHORT_WEEKDAY = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

const SHORT_DATE_THIS_YEAR = new Intl.DateTimeFormat(undefined, {
  ...SHORT_DATE_OPTIONS,
});

const SHORT_DATE_OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  ...SHORT_DATE_OPTIONS,
  year: "numeric",
});

const SHORT_DATE_TIME_THIS_YEAR = new Intl.DateTimeFormat(undefined, {
  ...SHORT_DATE_OPTIONS,
  ...TIME_FORMAT_OPTIONS,
});

const SHORT_DATE_TIME_OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  ...SHORT_DATE_OPTIONS,
  ...TIME_FORMAT_OPTIONS,
  year: "numeric",
});

export function formatShortWeekDay(day: Dayjs) {
  const today = dayjs();

  if (day.isSame(today, "week")) {
    return SHORT_WEEKDAY.format(day.toDate());
  } else {
    return formatShortDate(day);
  }
}

export function formatShortDate(day: Dayjs) {
  const today = dayjs();

  if (day.isSame(today, "year")) {
    return SHORT_DATE_THIS_YEAR.format(day.toDate());
  }

  return SHORT_DATE_OTHER_YEAR.format(day.toDate());
}

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
