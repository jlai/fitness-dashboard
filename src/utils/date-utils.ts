import dayjs, { Dayjs } from "dayjs";

export function todayOrEarlier(otherDay: Dayjs) {
  const today = dayjs();
  return otherDay.isAfter(today) ? today : otherDay;
}
