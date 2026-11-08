import { Dayjs } from "dayjs";

export function formatAsDate(day: Dayjs) {
  return day.format("YYYY-MM-DD");
}

export function formatAsCivilDateTime(day: Dayjs) {
  return day.format("YYYY-MM-DDTHH:mm:ss");
}

/**
 * Closed-open physical time range for a civil calendar day in the browser's
 * local timezone. Rollup APIs expect UTC timestamps; this maps local midnight
 * through the next local midnight onto those instants.
 */
export function physicalRangeForLocalDay(day: Dayjs) {
  const start = day.startOf("day");

  return { start, end: start.add(1, "day") };
}
