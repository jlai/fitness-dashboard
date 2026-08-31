import { Dayjs } from "dayjs";

export function formatAsDate(day: Dayjs) {
  return day.format("YYYY-MM-DD");
}
