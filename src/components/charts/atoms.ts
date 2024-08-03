import { atom } from "jotai";
import dayjs from "dayjs";
import { atomEffect } from "jotai-effect";
import { atomFamily } from "jotai/utils";

import { DayjsRange } from "../calendar/period-navigator";

import { CHART_RESOURCE_CONFIGS, ChartResource } from "./timeseries/resources";

export const selectedResourceAtom = atom<ChartResource>("steps");

export type DateRangeType =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";
export const MAX_DAYS_IN_RANGE = {
  day: 1,
  week: 7,
  month: 31,
  quarter: 92,
  year: 365,
  custom: 1095,
};

export const selectedRangeTypeAtom = atom<DateRangeType>("month");

// Store selected range for each range type
export const selectedRangeFamily = atomFamily((rangeType: DateRangeType) => {
  if (rangeType === "custom") {
    return atom<DayjsRange>({
      startDay: dayjs().subtract(30, "days"),
      endDay: dayjs(),
    });
  }

  return atom<DayjsRange>({
    startDay: dayjs().startOf(rangeType),
    endDay: dayjs().endOf(rangeType),
  });
});

export const selectedRangeAtom = atom<DayjsRange, [DayjsRange], void>(
  (get) => get(selectedRangeFamily(get(selectedRangeTypeAtom))),
  (get, set, update) =>
    set(selectedRangeFamily(get(selectedRangeTypeAtom)), update)
);

// Reset date range if resource doesn't support it
export const resourceChangedEffect = atomEffect((get, set) => {
  const resource = get(selectedResourceAtom);
  const rangeType = get.peek(selectedRangeTypeAtom);

  const resourceMaxDays = CHART_RESOURCE_CONFIGS[resource].maxDays;
  const rangeMaxDays = MAX_DAYS_IN_RANGE[rangeType];

  if (
    rangeType === "day" &&
    !CHART_RESOURCE_CONFIGS[resource].supportsIntraday
  ) {
    set(selectedRangeTypeAtom, "week");
  }

  if (resourceMaxDays < rangeMaxDays) {
    console.log("resource max days too high");
    set(selectedRangeTypeAtom, "week");
  }
});
