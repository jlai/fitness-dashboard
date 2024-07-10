"use client";

import {
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  MenuItem,
  Select,
  Typography,
  Divider,
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

import { useDataset } from "./dataset";
import { CHART_RESOURCE_CONFIGS, CHART_RESOURCE_MENU_ITEMS } from "./resources";

type DateRangeType = "last7" | "last30";

const selectedRangeTypeAtom = atom<DateRangeType>("last7");

const startDayAtom = atom(dayjs());
const endDayAtom = atom((get) => {
  switch (get(selectedRangeTypeAtom)) {
    case "last7":
      return get(startDayAtom).subtract(7, "days");
    case "last30":
      return get(startDayAtom).subtract(30, "days");
  }
});

const selectedResourceAtom = atom<TimeSeriesResource>("steps");

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
  const [selectedRangeType, setSelectedRangeType] = useAtom(
    selectedRangeTypeAtom
  );

  return (
    <ToggleButtonGroup
      exclusive
      value={selectedRangeType}
      onChange={(event, value) => setSelectedRangeType(value)}
    >
      <ToggleButton value="last7">7 days</ToggleButton>
      <ToggleButton value="last30">30 days</ToggleButton>
    </ToggleButtonGroup>
  );
}

export function TimeSeriesChart({
  dataset,
  series,
  yAxis,
  formatDate = formatShortDate,
}: {
  dataset: DatasetType;
  series: Array<BarSeriesType | LineSeriesType>;
  yAxis?: Array<
    MakeOptional<AxisConfig<ScaleName, any, ChartsYAxisProps>, "id">
  >;
  formatDate?: (day: Dayjs) => string;
}) {
  return (
    <ResponsiveChartContainer
      dataset={dataset}
      series={series}
      xAxis={[
        {
          scaleType: "band",
          dataKey: "dateTime",
          valueFormatter: (value) => formatDate(dayjs(value)),
        },
      ]}
      yAxis={yAxis}
    >
      <BarPlot />
      <LinePlot />

      <ChartsXAxis />
      <ChartsYAxis />
      <ChartsAxisHighlight />
      <ChartsTooltip />
      <MarkPlot />
      <ChartsGrid horizontal />
    </ResponsiveChartContainer>
  );
}

export function GraphView() {
  const startDay = useAtomValue(startDayAtom);
  const endDay = useAtomValue(endDayAtom);

  const selectedResource = useAtomValue(selectedResourceAtom);

  const { data } = useQuery(
    buildTimeSeriesQuery(selectedResource, startDay, endDay)
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
          <Typography variant="caption">
            (More date ranges coming soon...)
          </Typography>
        </FormRow>
      </FormRows>
      <div className="w-full h-[400px]">
        <RequireScopes scopes={requiredScopes}>
          <TimeSeriesChart dataset={dataset} series={series} yAxis={yAxis} />
        </RequireScopes>
      </div>
    </div>
  );
}
