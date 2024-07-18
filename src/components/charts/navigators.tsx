"use client";

import { useAtomValue, useAtom } from "jotai";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";

import { TIME_SERIES_CONFIGS, TimeSeriesResource } from "@/api/times-series";

import {
  WeekNavigator,
  MonthNavigator,
  QuarterNavigator,
  YearNavigator,
} from "../calendar/period-navigator";

import { selectedRangeTypeAtom, selectedRangeAtom } from "./atoms";

export function GraphRangeSelector({
  resource,
}: {
  resource: TimeSeriesResource;
}) {
  const [selectedRangeType, setSelectedRangeType] = useAtom(
    selectedRangeTypeAtom
  );

  const maxDays = TIME_SERIES_CONFIGS[resource].maxDays;

  return (
    <ToggleButtonGroup
      exclusive
      value={selectedRangeType}
      onChange={(event, value) => value && setSelectedRangeType(value)}
    >
      <ToggleButton value="week">Week</ToggleButton>
      <ToggleButton value="month" disabled={maxDays < 31}>
        Month
      </ToggleButton>
      <ToggleButton value="quarter" disabled={maxDays < 90}>
        Quarter
      </ToggleButton>
      <ToggleButton value="year" disabled={maxDays < 366}>
        Year
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export function DateTimeRangeNavigator() {
  const selectedRangeType = useAtomValue(selectedRangeTypeAtom);

  const [selectedRange, setSelectedRange] = useAtom(selectedRangeAtom);

  switch (selectedRangeType) {
    case "week":
      return (
        <WeekNavigator value={selectedRange} onChange={setSelectedRange} />
      );
    case "month":
      return (
        <MonthNavigator value={selectedRange} onChange={setSelectedRange} />
      );
    case "quarter":
      return (
        <QuarterNavigator value={selectedRange} onChange={setSelectedRange} />
      );
    case "year":
      return (
        <YearNavigator value={selectedRange} onChange={setSelectedRange} />
      );
  }
}
