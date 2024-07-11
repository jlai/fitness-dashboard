import { atom } from "jotai";
import dayjs from "dayjs";
import { atomEffect } from "jotai-effect";

import { TIME_SERIES_CONFIGS, TimeSeriesResource } from "@/api/times-series";

import { DayjsRange } from "../calendar/period-navigator";

export const selectedResourceAtom = atom<TimeSeriesResource>("steps");

export type DateRangeType = "week" | "month" | "quarter" | "year";
export const MAX_DAYS_IN_RANGE = {
  week: 7,
  month: 31,
  quarter: 92,
  year: 365,
};

export const selectedRangeTypeAtom = atom<DateRangeType>("month");

export const selectedRangeAtom = atom<DayjsRange>({
  startDay: dayjs().startOf("day"),
  endDay: dayjs().endOf("day"),
});

// Reset date range if resource doesn't support it
export const resourceChangedEffect = atomEffect((get, set) => {
  const resource = get(selectedResourceAtom);
  const rangeType = get.peek(selectedRangeTypeAtom);

  const resourceMaxDays = TIME_SERIES_CONFIGS[resource].maxDays;
  const rangeMaxDays = MAX_DAYS_IN_RANGE[rangeType];

  if (resourceMaxDays < rangeMaxDays) {
    console.log("resource max days too high");
    set(selectedRangeTypeAtom, "week");
  }
});

// Update date range when range type changes
export const rangeTypeChangedEffect = atomEffect((get, set) => {
  const rangeType = get(selectedRangeTypeAtom);
  let { startDay, endDay } = get.peek(selectedRangeAtom);

  startDay = startDay.startOf(rangeType);
  endDay = startDay.endOf(rangeType);

  set(selectedRangeAtom, { startDay, endDay });
});
