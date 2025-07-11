"use client";

import dayjs, { Dayjs } from "dayjs";

function createDateFormats(
  locale: string | undefined,
  hourCycle: Intl.DateTimeFormatOptions["hourCycle"]
) {
  const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };

  const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: hourCycle,
  };

  const TIME = new Intl.DateTimeFormat(locale, TIME_FORMAT_OPTIONS);

  const SHORT_WEEKDAY = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  });

  const SHORT_DATE_THIS_YEAR = new Intl.DateTimeFormat(locale, {
    ...SHORT_DATE_OPTIONS,
  });

  const SHORT_DATE_OTHER_YEAR = new Intl.DateTimeFormat(locale, {
    ...SHORT_DATE_OPTIONS,
    year: "numeric",
  });

  const SHORT_DATE_TIME_THIS_YEAR = new Intl.DateTimeFormat(locale, {
    ...SHORT_DATE_OPTIONS,
    ...TIME_FORMAT_OPTIONS,
  });

  const SHORT_DATE_TIME_OTHER_YEAR = new Intl.DateTimeFormat(locale, {
    ...SHORT_DATE_OPTIONS,
    ...TIME_FORMAT_OPTIONS,
    year: "numeric",
  });

  return {
    TIME,
    SHORT_WEEKDAY,

    formatShortDate(day: Dayjs) {
      const today = dayjs();

      if (day.isSame(today, "year")) {
        return SHORT_DATE_THIS_YEAR.format(day.toDate());
      }

      return SHORT_DATE_OTHER_YEAR.format(day.toDate());
    },

    formatShortDateTime(day: Dayjs) {
      const today = dayjs();

      if (day.isSame(today, "year")) {
        return SHORT_DATE_TIME_THIS_YEAR.format(day.toDate());
      }

      return SHORT_DATE_TIME_OTHER_YEAR.format(day.toDate());
    },

    formatWeek(day: Dayjs, options?: Intl.DateTimeFormatOptions) {
      const today = dayjs();
      const isSameYear = day.isSame(today, "year");

      return new Intl.DateTimeFormat(undefined, {
        ...options,
        day: options?.day ?? "numeric",
        month: options?.month ?? "long",
        year: isSameYear ? undefined : "numeric",
      }).formatRange(day.startOf("week").toDate(), day.endOf("week").toDate());
    },

    formatMonth(day: Dayjs, options?: Intl.DateTimeFormatOptions) {
      const isSameYear = day.isSame(dayjs(), "year");

      return new Intl.DateTimeFormat(undefined, {
        ...options,
        month: "long",
        year: isSameYear ? undefined : options?.year ?? "numeric",
      }).format(day.toDate());
    },
  };
}

export let DateFormats = createDateFormats(undefined, undefined);

export function setDateFormatLocale(
  locale: string | undefined,
  hourCycle: Intl.DateTimeFormatOptions["hourCycle"]
) {
  DateFormats = createDateFormats(locale, hourCycle);
}
