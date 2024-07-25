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

export const TIME = new Intl.DateTimeFormat(undefined, TIME_FORMAT_OPTIONS);

export const SHORT_WEEKDAY = new Intl.DateTimeFormat(undefined, {
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

export function formatDay(day: Dayjs, options?: Intl.DateTimeFormatOptions) {
  const today = dayjs();
  const isSameYear = day.isSame(today, "year");
  const isSameMonth = day.isSame(today, "month");

  return new Intl.DateTimeFormat(undefined, {
    ...options,
    day: options?.day ?? "numeric",
    month: isSameMonth ? undefined : options?.month ?? "long",
    year: isSameYear ? undefined : "numeric",
  }).format(day.toDate());
}

export function formatWeek(day: Dayjs, options?: Intl.DateTimeFormatOptions) {
  const today = dayjs();
  const isSameYear = day.isSame(today, "year");

  return new Intl.DateTimeFormat(undefined, {
    ...options,
    day: options?.day ?? "numeric",
    month: options?.month ?? "long",
    year: isSameYear ? undefined : "numeric",
  }).formatRange(day.startOf("week").toDate(), day.endOf("week").toDate());
}

export function formatMonth(day: Dayjs, options?: Intl.DateTimeFormatOptions) {
  const isSameYear = day.isSame(dayjs(), "year");

  return new Intl.DateTimeFormat(undefined, {
    ...options,
    month: "long",
    year: isSameYear ? undefined : options?.year ?? "numeric",
  }).format(day.toDate());
}

export function formatDuration(milliseconds: number) {
  return dayjs.duration(milliseconds).format("HH:mm:ss");
}

export function formatMinutes(minutes: number) {
  const duration = dayjs.duration(minutes, "minutes");

  if (duration.asMinutes() > 60) {
    return duration.format("H[h] m[m]");
  } else {
    return duration.format("m[m]");
  }
}
