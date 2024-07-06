"use client";

import {
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import {
  BarPlot,
  ChartsAxisHighlight,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
  ResponsiveChartContainer,
} from "@mui/x-charts";
import { useQuery } from "@tanstack/react-query";
import { atom, useAtom, useAtomValue } from "jotai";
import dayjs from "dayjs";
import { useMemo } from "react";

import {
  TimeSeriesResource,
  getTimeSeriesQuery,
  TIME_SERIES_CONFIGS,
} from "@/api/activity";
import { formatShortDate } from "@/utils/date-formats";
import { useUnits } from "@/api/units";

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

const selectedSeriesAtom = atom<TimeSeriesResource>("steps");

function SeriesSelector() {
  const [selectedSeries, setSelectedSeries] = useAtom(selectedSeriesAtom);

  return (
    <FormControl>
      <Select<TimeSeriesResource>
        value={selectedSeries}
        onChange={(event) =>
          setSelectedSeries(event.target.value as TimeSeriesResource)
        }
        size="small"
      >
        <MenuItem value="steps">Steps</MenuItem>
        <MenuItem value="distance">Distance</MenuItem>
        <MenuItem value="calories">Calories</MenuItem>
        <MenuItem value="floors">Floors</MenuItem>
        <MenuItem value="weight">Weight</MenuItem>
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

export function GraphView() {
  const units = useUnits();
  const startDay = useAtomValue(startDayAtom);
  const endDay = useAtomValue(endDayAtom);

  const selectedSeries = useAtomValue(selectedSeriesAtom);

  const config = TIME_SERIES_CONFIGS[selectedSeries];
  const { data } = useQuery(
    getTimeSeriesQuery(selectedSeries, startDay, endDay)
  );

  const dataset = useMemo(() => {
    if (!data) {
      return [];
    }

    const dataset = config.getDataset(data);

    // unit conversions
    switch (selectedSeries) {
      case "distance":
        return dataset.map((entry) => ({
          ...entry,
          value: units.localizedKilometers(entry.value),
        }));
      case "weight":
        return dataset.map((entry) => ({
          ...entry,
          value: units.localizedKilograms(entry.value),
        }));
    }

    return dataset;
  }, [data, config, units, selectedSeries]);

  return (
    <div>
      <div className="flex flex-row m-4 items-center gap-x-8">
        <SeriesSelector />
        <GraphRangeSelector />
        <Typography variant="caption">
          (More date ranges coming soon...)
        </Typography>
      </div>
      <div className="w-full h-[400px]">
        <ResponsiveChartContainer
          dataset={dataset}
          series={[
            {
              type: config.chartType,
              dataKey: "value",
              label: config.label,
              connectNulls: true,
              showMark: true,
            },
          ]}
          xAxis={[
            {
              scaleType: "band",
              dataKey: "dateTime",
              valueFormatter: (value) => formatShortDate(dayjs(value)),
            },
          ]}
          yAxis={[
            { scaleType: "linear", valueFormatter: config.valueFormatter },
          ]}
        >
          <BarPlot />
          <LinePlot />

          <ChartsXAxis />
          <ChartsYAxis />
          <ChartsAxisHighlight />
          <ChartsTooltip />
        </ResponsiveChartContainer>
      </div>
    </div>
  );
}
