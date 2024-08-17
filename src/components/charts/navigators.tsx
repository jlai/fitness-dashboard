"use client";

import { useAtomValue, useAtom } from "jotai";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";

import {
  WeekNavigator,
  MonthNavigator,
  QuarterNavigator,
  YearNavigator,
  DayNavigator,
} from "../calendar/period-navigator";
import { CustomRangePicker } from "../calendar/custom-range";

import { selectedRangeTypeAtom, selectedRangeAtom } from "./atoms";
import { CHART_RESOURCE_CONFIGS, ChartResource } from "./timeseries/resources";

export function GraphRangeSelector({ resource }: { resource: ChartResource }) {
  const [selectedRangeType, setSelectedRangeType] = useAtom(
    selectedRangeTypeAtom
  );

  const maxDays = CHART_RESOURCE_CONFIGS[resource].maxDays;
  // const supportsIntraday = CHART_RESOURCE_CONFIGS[resource].supportsIntraday;
  const supportsIntraday = false;

  return (
    <ToggleButtonGroup
      exclusive
      value={selectedRangeType}
      onChange={(event, value) => value && setSelectedRangeType(value)}
    >
      {supportsIntraday && <ToggleButton value="day">Day</ToggleButton>}
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
      <ToggleButton value="custom">Custom</ToggleButton>
    </ToggleButtonGroup>
  );
}

export function DateTimeRangeNavigator({
  resource,
}: {
  resource: ChartResource;
}) {
  const selectedRangeType = useAtomValue(selectedRangeTypeAtom);

  const maxDays = CHART_RESOURCE_CONFIGS[resource].maxDays;

  const [selectedRange, setSelectedRange] = useAtom(selectedRangeAtom);

  switch (selectedRangeType) {
    case "day":
      return <DayNavigator value={selectedRange} onChange={setSelectedRange} />;
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
    case "custom":
      return (
        <CustomRangePicker
          value={selectedRange}
          onChange={setSelectedRange}
          maxDays={maxDays}
        />
      );
  }
}
