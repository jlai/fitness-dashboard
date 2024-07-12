"use client";

import { FormControl, MenuItem, Select, Divider, Box } from "@mui/material";
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
import { useAtom, useAtomValue } from "jotai";
import dayjs from "dayjs";
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
import { DayjsRange } from "../calendar/period-navigator";
import { HeaderBar } from "../layout/rows";

import { useDataset } from "./dataset";
import { CHART_RESOURCE_CONFIGS, CHART_RESOURCE_MENU_ITEMS } from "./resources";
import {
  selectedRangeAtom,
  selectedResourceAtom,
  rangeTypeChangedEffect,
  resourceChangedEffect,
} from "./atoms";
import { GraphRangeSelector, DateTimeRangeNavigator } from "./navigators";

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
  formatDate?: AxisConfig<"band", Date>["valueFormatter"];
}) {
  return (
    <ResponsiveChartContainer
      dataset={dataset}
      series={series}
      xAxis={[
        {
          scaleType: "band",
          dataKey: "dateTime",
          valueFormatter: formatDate,
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

type DateValueFormatter = AxisConfig<"band", Date>["valueFormatter"];

export function getFormatterForDayRange({
  startDay,
  endDay,
}: DayjsRange): DateValueFormatter {
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

  const tickFormat = new Intl.DateTimeFormat(undefined, options).format;
  const tooltipFormat = new Intl.DateTimeFormat(undefined, {
    month: "long",
    ...options,
  }).format;

  return (value, context) =>
    context.location === "tick" ? tickFormat(value) : tooltipFormat(value);
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
      <HeaderBar>
        <SeriesSelector />
        <GraphRangeSelector resource={selectedResource} />
        <Box flex={1} />
        <DateTimeRangeNavigator />
      </HeaderBar>
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
