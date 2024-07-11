"use client";

import {
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  MenuItem,
  Select,
  Divider,
  Box,
} from "@mui/material";
import {
  BarPlot,
  BarSeriesType,
  ChartsAxisHighlight,
  ChartsGrid,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
  LineSeriesType,
  MarkPlot,
  ResponsiveChartContainer,
} from "@mui/x-charts";
import { useQuery } from "@tanstack/react-query";
import { atom, useAtom, useAtomValue } from "jotai";
import dayjs, { Dayjs } from "dayjs";
import {
  AxisConfig,
  ChartsYAxisProps,
  DatasetType,
  MakeOptional,
  ScaleName,
} from "@mui/x-charts/internals";

import {
  TimeSeriesResource,
  buildTimeSeriesQuery,
  TIME_SERIES_CONFIGS,
} from "@/api/activity";
import { formatShortDate } from "@/utils/date-formats";

import { RequireScopes } from "../require-scopes";
import { FormRow, FormRows } from "../forms/form-row";
import {
  DayjsRange,
  MonthNavigator,
  QuarterNavigator,
  WeekNavigator,
  YearNavigator,
} from "../calendar/period-navigator";

import { useDataset } from "./dataset";
import { CHART_RESOURCE_CONFIGS, CHART_RESOURCE_MENU_ITEMS } from "./resources";
import {
  selectedRangeTypeAtom,
  selectedRangeAtom,
  selectedResourceAtom,
  rangeTypeChangedEffect,
  resourceChangedEffect,
} from "./atoms";

export function SeriesSelector() {
  const [selectedResource, setselectedResource] = useAtom(selectedResourceAtom);

  return (
    <FormControl>
      <Select<TimeSeriesResource>
        value={selectedResource}
        onChange={(event) =>
          setselectedResource(event.target.value as TimeSeriesResource)
        }
        size="small"
      >
        {CHART_RESOURCE_MENU_ITEMS.map((id, i) =>
          id === "-" ? (
            <Divider key={i} />
          ) : (
            <MenuItem key={id} value={id}>
              {CHART_RESOURCE_CONFIGS[id].label}
            </MenuItem>
          )
        )}
      </Select>
    </FormControl>
  );
}

function GraphRangeSelector() {
  const resource = useAtomValue(selectedResourceAtom);
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
    </ToggleButtonGroup>
  );
}

function DateTimeRangeNavigator() {
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

export function TimeSeriesChart({
  dataset,
  series,
  yAxis,
  formatDate = (date: Date) => formatShortDate(dayjs(date)),
}: {
  dataset: DatasetType;
  series: Array<BarSeriesType | LineSeriesType>;
  yAxis?: Array<
    MakeOptional<AxisConfig<ScaleName, any, ChartsYAxisProps>, "id">
  >;
  formatDate?: (date: Date) => string;
}) {
  return (
    <ResponsiveChartContainer
      dataset={dataset}
      series={series}
      xAxis={[
        {
          scaleType: "band",
          dataKey: "dateTime",
          valueFormatter: (value) => formatDate(value),
        },
      ]}
      yAxis={yAxis}
    >
      <BarPlot />
      <LinePlot />

      <ChartsXAxis />
      <ChartsYAxis />
      <ChartsAxisHighlight y="band" />
      <ChartsTooltip />
      <MarkPlot />
      <ChartsGrid horizontal />
    </ResponsiveChartContainer>
  );
}

export function getFormatterForDayRange({ startDay, endDay }: DayjsRange) {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
  };

  if (startDay.isSame(endDay, "week")) {
    options.weekday = "short";
    options.month = "short";
  } else if (startDay.isSame(endDay, "month")) {
    // just the day
  } else if (startDay.isSame(endDay, "year")) {
    options.month = "numeric";
  } else {
    options.year = "numeric";
  }

  return new Intl.DateTimeFormat(undefined, options).format;
}

export function GraphView() {
  useAtomValue(resourceChangedEffect);
  useAtomValue(rangeTypeChangedEffect);

  const dateTimeRange = useAtomValue(selectedRangeAtom);
  const selectedResource = useAtomValue(selectedResourceAtom);

  const { data } = useQuery(
    buildTimeSeriesQuery(
      selectedResource,
      dateTimeRange.startDay,
      dateTimeRange.endDay
    )
  );

  const { dataset, series, yAxis } = useDataset(selectedResource, data);

  const requiredScopes =
    TIME_SERIES_CONFIGS[selectedResource]?.requiredScopes ?? [];

  return (
    <div>
      <FormRows margin={2}>
        <FormRow>
          <SeriesSelector />
          <GraphRangeSelector />
          <Box flex={1} />
          <DateTimeRangeNavigator />
        </FormRow>
      </FormRows>
      <div className="w-full h-[400px]">
        <RequireScopes scopes={requiredScopes}>
          <TimeSeriesChart
            dataset={dataset}
            series={series}
            yAxis={yAxis}
            formatDate={getFormatterForDayRange(dateTimeRange)}
          />
        </RequireScopes>
      </div>
    </div>
  );
}
