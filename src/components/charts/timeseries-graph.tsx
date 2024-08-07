"use client";

import {
  FormControl,
  MenuItem,
  Select,
  Divider,
  Box,
  Stack,
} from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import { createElement, useMemo, useState } from "react";

import { RequireScopes } from "../require-scopes";
import { HeaderBar } from "../layout/rows";
import { DayjsRange } from "../calendar/period-navigator";

import {
  CHART_RESOURCE_CONFIGS,
  CHART_RESOURCE_MENU_ITEMS,
  ChartResource,
} from "./timeseries/resources";
import {
  selectedResourceAtom,
  resourceChangedEffect,
  selectedRangeAtom,
  selectedRangeTypeAtom,
} from "./atoms";
import { GraphRangeSelector, DateTimeRangeNavigator } from "./navigators";
import { AggregationType, TimeSeriesChartContext } from "./timeseries/context";

export function SeriesSelector() {
  const [selectedResource, setselectedResource] = useAtom(selectedResourceAtom);

  return (
    <FormControl>
      <Select<ChartResource>
        value={selectedResource}
        onChange={(event) =>
          setselectedResource(event.target.value as ChartResource)
        }
        size="small"
        SelectDisplayProps={{ "aria-label": "select resource" }}
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
  resource,
  range,
  formatDate,
  aggregation,
  layout,
  statsEl,
}: {
  resource: ChartResource;
  range: DayjsRange;
  aggregation?: AggregationType;
  layout?: "horizontal" | "vertical";
  formatDate?: (date: Date) => string;
  statsEl?: HTMLElement;
}) {
  const requiredScopes = CHART_RESOURCE_CONFIGS[resource]?.requiredScopes ?? [];

  const chartConfig = useMemo(
    () => ({ range, formatDate, aggregation, layout, statsEl }),
    [aggregation, formatDate, layout, range, statsEl]
  );

  return (
    <RequireScopes scopes={requiredScopes}>
      <TimeSeriesChartContext.Provider value={chartConfig}>
        {createElement(CHART_RESOURCE_CONFIGS[resource].component)}
      </TimeSeriesChartContext.Provider>
    </RequireScopes>
  );
}

/** Graph component with resource selector and navigation controls */
export function NavigableGraphView() {
  useAtomValue(resourceChangedEffect);

  const selectedResource = useAtomValue(selectedResourceAtom);
  const selectedRange = useAtomValue(selectedRangeAtom);
  const selectedRangeType = useAtomValue(selectedRangeTypeAtom);

  const [statsEl, setStatsEl] = useState<HTMLElement | null>(null);

  const aggregation = selectedRangeType === "year" ? "month" : "day";

  return (
    <div>
      <HeaderBar>
        <SeriesSelector />
        <GraphRangeSelector resource={selectedResource} />
        <Box flex={1} />
        <DateTimeRangeNavigator />
      </HeaderBar>
      <Stack
        direction="row"
        columnGap={4}
        ref={setStatsEl}
        padding={1}
        justifyContent="center"
      />
      <div className="w-full h-[400px]">
        <TimeSeriesChart
          resource={selectedResource}
          range={selectedRange}
          aggregation={aggregation}
          statsEl={statsEl ?? undefined}
        />
      </div>
    </div>
  );
}
