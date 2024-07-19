import { Dayjs } from "dayjs";

// Used for most dates in the API
export function formatAsDate(day: Dayjs) {
  return day.format("YYYY-MM-DD");
}

// Used for intraday
export function formatHoursMinutes(day: Dayjs) {
  return day.format("HH:mm");
}
