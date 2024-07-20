"use client";

import { FormControl, MenuItem, Select, Divider, Box } from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import { createElement } from "react";

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
  rangeTypeChangedEffect,
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
}: {
  resource: ChartResource;
  range: DayjsRange;
  aggregation?: AggregationType;
  layout?: "horizontal" | "vertical";
  formatDate?: (date: Date) => string;
}) {
  const requiredScopes = CHART_RESOURCE_CONFIGS[resource]?.requiredScopes ?? [];

  return (
    <RequireScopes scopes={requiredScopes}>
      <TimeSeriesChartContext.Provider
        value={{ range, formatDate, aggregation, layout }}
      >
        {createElement(CHART_RESOURCE_CONFIGS[resource].component)}
      </TimeSeriesChartContext.Provider>
    </RequireScopes>
  );
}

/** Graph component with resource selector and navigation controls */
export function NavigableGraphView() {
  useAtomValue(resourceChangedEffect);
  useAtomValue(rangeTypeChangedEffect);

  const selectedResource = useAtomValue(selectedResourceAtom);
  const selectedRange = useAtomValue(selectedRangeAtom);
  const selectedRangeType = useAtomValue(selectedRangeTypeAtom);

  const aggregation = selectedRangeType === "year" ? "month" : "day";

  return (
    <div>
      <HeaderBar>
        <SeriesSelector />
        <GraphRangeSelector resource={selectedResource} />
        <Box flex={1} />
        <DateTimeRangeNavigator />
      </HeaderBar>
      <div className="w-full h-[400px]">
        <TimeSeriesChart
          resource={selectedResource}
          range={selectedRange}
          aggregation={aggregation}
        />
      </div>
    </div>
  );
}
