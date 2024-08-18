import dayjs, { Dayjs } from "dayjs";

export function isAfterToday(otherDay: Dayjs) {
  return otherDay.isAfter(dayjs(), "day");
}

export function todayOrEarlier(otherDay: Dayjs) {
  const today = dayjs();
  return otherDay.isAfter(today) ? today : otherDay;
}
