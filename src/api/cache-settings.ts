import dayjs, { Dayjs } from "dayjs";

export const ONE_MINUTE_IN_MILLIS = 60 * 1000;
export const ONE_HOUR_IN_MILLIS = 60 * ONE_MINUTE_IN_MILLIS;
export const ONE_DAY_IN_MILLIS = ONE_HOUR_IN_MILLIS * 24;

// Return different staleTime based on the assumption that older
// data is less likely to change
export function graduallyStale(day: Dayjs) {
  const today = dayjs();

  if (day.isSame(today, "day")) {
    return ONE_MINUTE_IN_MILLIS;
  }

  return ONE_HOUR_IN_MILLIS;
}
