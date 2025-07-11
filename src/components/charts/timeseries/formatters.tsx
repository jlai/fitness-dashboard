import {
  AxisValueFormatterContext,
  SeriesValueFormatter,
} from "@mui/x-charts/internals";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";

import { NumberFormats } from "@/utils/number-formats";
import { DayjsRange } from "@/components/calendar/period-navigator";
import { TIME } from "@/utils/date-formats";

dayjs.extend(durationPlugin);

export const TOOLTIP_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const MONTH_ONLY_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
});

export const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

export function getTickFormatterForDayRange({ startDay, endDay }: DayjsRange) {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
  };

  if (startDay.isSame(endDay, "day")) {
    options.day = undefined;
    options.hour = "numeric";
    options.minute = "2-digit";
  } else if (startDay.isSame(endDay, "week")) {
    options.weekday = "short";
    options.month = "short";
  } else if (startDay.isSame(endDay, "month")) {
    // just the day
  } else if (startDay.isSame(endDay, "year")) {
    options.month = "numeric";
  } else {
    options.year = "numeric";
  }

  return new Intl.DateTimeFormat(undefined, options).format;
}

export function getTooltipFormatterForDayRange({
  startDay,
  endDay,
}: DayjsRange) {
  if (startDay.isSame(endDay, "day")) {
    return TIME.format;
  }

  return TOOLTIP_DATE_FORMAT.format;
}

export function durationTickFormat(value: number) {
  return dayjs.duration(value, "minutes").format("H:mm");
}

export function durationTooltipFormat(value: number) {
  return dayjs.duration(value, "minutes").format("H[h] mm[m]");
}

type AxisValueFormatter = (
  value: number | undefined,
  context: AxisValueFormatterContext
) => string;

export function makeAxisValueFormatter({
  tickFormat = NumberFormats.FRACTION_DIGITS_0.format,
  tooltipFormat = NumberFormats.FRACTION_DIGITS_0.format,
}: {
  tickFormat?: (value: number) => string;
  tooltipFormat?: (value: number) => string;
}): AxisValueFormatter {
  return (value, context) => {
    if (!value) {
      return "";
    }

    return (
      (context.location === "tick"
        ? tickFormat(value)
        : tooltipFormat(value)) ?? ""
    );
  };
}

export function makeSeriesValueFormatter({
  numberFormat = NumberFormats.FRACTION_DIGITS_0.format,
  unit,
}: {
  numberFormat?: (value: number) => string;
  unit?: string;
}): SeriesValueFormatter<number | null> {
  if (unit) {
    return (value) =>
      value || value === 0 ? `${numberFormat(value)} ${unit}` : "\u2014";
  } else {
    return (value) => (value || value === 0 ? numberFormat(value) : "\u2014");
  }
}
