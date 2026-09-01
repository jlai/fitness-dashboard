import dayjs from "dayjs";

import type { TimeSeriesEntry } from "@/api/times-series";

export function leanFatMassByDate(
  weightData: Array<TimeSeriesEntry<string>> | undefined,
  fatData: Array<TimeSeriesEntry<string>> | undefined,
  today: dayjs.Dayjs,
) {
  const fatByDate = new Map(
    (fatData ?? []).map((entry) => [entry.dateTime, Number(entry.value)]),
  );

  const dates: Array<Date> = [];
  const totalKg: Array<number> = [];
  const leanKg: Array<number | null> = [];
  const fatKg: Array<number | null> = [];

  for (const entry of weightData ?? []) {
    if (dayjs(entry.dateTime).isAfter(today)) {
      break;
    }

    const weightKg = Number(entry.value);
    if (!Number.isFinite(weightKg)) {
      continue;
    }

    dates.push(dayjs(entry.dateTime).toDate());
    totalKg.push(weightKg);

    const percentFat = fatByDate.get(entry.dateTime);
    if (percentFat == null || !Number.isFinite(percentFat)) {
      leanKg.push(null);
      fatKg.push(null);
      continue;
    }

    leanKg.push(weightKg * (1.0 - percentFat / 100));
    fatKg.push(weightKg * (percentFat / 100));
  }

  return { dates, totalKg, leanKg, fatKg };
}
