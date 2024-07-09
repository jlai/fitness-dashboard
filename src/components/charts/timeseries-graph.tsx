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
import dayjs from "dayjs";
import { useMemo } from "react";
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
  TimeSeriesEntry,
  HeartTimeSeriesValue,
  TIME_SERIES_CONFIGS,
} from "@/api/activity";
import { formatShortDate } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { RequireScopes } from "../require-scopes";

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

function SeriesSelector() {
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
        <MenuItem value="steps">Steps</MenuItem>
        <MenuItem value="distance">Distance</MenuItem>
        <MenuItem value="calories">Calories</MenuItem>
        <MenuItem value="floors">Floors</MenuItem>
        <Divider />
        <MenuItem value="weight">Weight (trend)</MenuItem>
        <MenuItem value="fat">Fat (trend)</MenuItem>
        <MenuItem value="bmi">BMI (trend)</MenuItem>
        <Divider />
        <MenuItem value="resting-heart-rate">Resting Heart Rate</MenuItem>
        <MenuItem value="heart-rate-zones">Heart Rate Zones</MenuItem>
        <Divider />
        <MenuItem value="calories-in">Calories consumed</MenuItem>
        <MenuItem value="water">Water</MenuItem>
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

/**
 * Transform timeseries entries into parsed values.
 * Only supports extracting a single value, which will be stored as the "value"
 * property on the dataset.
 */
function getSingleValueDataset<
  EntryValueType = string,
  OutputType = number | null
>(
  data: Array<TimeSeriesEntry<unknown>>,
  transformValue: (value: EntryValueType) => OutputType
) {
  return data.map(({ dateTime, value }) => ({
    dateTime: dayjs(dateTime).toDate(),
    value: transformValue(value as EntryValueType),
  }));
}

function useDataset(data?: Array<TimeSeriesEntry<unknown>>) {
  const units = useUnits();
  const selectedResource = useAtomValue(selectedResourceAtom);

  return useMemo(() => {
    let dataset: DatasetType = [];
    let series: Array<BarSeriesType | LineSeriesType> = [];
    let yAxis: Array<
      MakeOptional<AxisConfig<ScaleName, any, ChartsYAxisProps>, "id">
    > = [{ scaleType: "linear" }];

    if (!data) {
      return {
        dataset: [] as DatasetType,
        series: [] as Array<BarSeriesType | LineSeriesType>,
      };
    }

    switch (selectedResource) {
      case "steps":
        dataset = getSingleValueDataset(data, Number);
        series = [
          {
            type: "bar",
            label: "Steps",
            dataKey: "value",
          },
        ];
        break;
      case "floors":
        dataset = getSingleValueDataset(data, Number);
        series = [
          {
            type: "bar",
            label: "Floors",
            dataKey: "value",
          },
        ];
        yAxis = [{ tickMinStep: 1 }];
        break;
      case "calories-in":
        dataset = getSingleValueDataset(data, (value) => Number(value));
        series = [
          {
            type: "bar",
            label: "Calories consumed",
            dataKey: "value",
            valueFormatter: (value) =>
              value ? `${FRACTION_DIGITS_1.format(value)} cal` : "",
          },
        ];
        yAxis = [
          {
            label: units.localizedWaterVolumeName,
          },
        ];
        break;
      case "water":
        dataset = getSingleValueDataset(data, (value) =>
          units.localizedWaterVolume(Number(value))
        );
        series = [
          {
            type: "bar",
            label: "Water",
            dataKey: "value",
            valueFormatter: (value) =>
              value
                ? `${FRACTION_DIGITS_1.format(value)} ${
                    units.localizedWaterVolumeName
                  }`
                : "",
          },
        ];
        yAxis = [
          {
            label: units.localizedWaterVolumeName,
          },
        ];
        break;
      case "weight":
        dataset = getSingleValueDataset(data, (value) =>
          units.localizedKilograms(Number(value))
        );
        series = [
          {
            type: "line",
            label: "Weight",
            dataKey: "value",
            connectNulls: true,
            showMark: false,
            valueFormatter: (value) =>
              value
                ? `${FRACTION_DIGITS_1.format(value)} ${
                    units.localizedKilogramsName
                  }`
                : "",
          },
        ];
        yAxis = [
          {
            label: units.localizedKilogramsName,
          },
        ];
        break;
      case "fat":
        dataset = getSingleValueDataset(data, (value) => Number(value));
        series = [
          {
            type: "line",
            label: "Fat",
            dataKey: "value",
            connectNulls: true,
            showMark: false,
            valueFormatter: (value) =>
              value ? `${FRACTION_DIGITS_1.format(value)}%` : "",
          },
        ];
        yAxis = [
          {
            label: units.localizedKilogramsName,
          },
        ];
        break;
      case "bmi":
        dataset = getSingleValueDataset(data, (value) => Number(value));
        series = [
          {
            type: "line",
            label: "BMI",
            dataKey: "value",
            connectNulls: true,
            showMark: false,
            valueFormatter: (value) =>
              value ? FRACTION_DIGITS_1.format(value) : "",
          },
        ];
        yAxis = [
          {
            label: units.localizedKilogramsName,
          },
        ];
        break;
      case "distance":
        dataset = getSingleValueDataset(data, (value) =>
          units.localizedKilometers(Number(value))
        );
        series = [
          {
            type: "bar",
            label: "Distance",
            dataKey: "value",
            valueFormatter: (value) =>
              value
                ? `${FRACTION_DIGITS_1.format(value)} ${
                    units.localizedKilometersName
                  }`
                : "",
          },
        ];
        yAxis = [
          {
            label: units.localizedKilometersName,
          },
        ];
        break;
      case "calories":
        dataset = getSingleValueDataset(data, Number);
        series = [
          {
            type: "bar",
            label: "Calories",
            dataKey: "value",
          },
        ];
        break;
      case "resting-heart-rate":
        dataset = getSingleValueDataset<HeartTimeSeriesValue>(
          data,
          (value) => value.restingHeartRate ?? null
        );
        series = [
          {
            type: "line",
            label: "Resting Heart Rate",
            dataKey: "value",
            connectNulls: true,
            showMark: ({ value }) => value !== null,
          },
        ];
        break;
      case "heart-rate-zones":
        {
          dataset = [];

          for (const entry of data as Array<
            TimeSeriesEntry<HeartTimeSeriesValue>
          >) {
            const zoneValues: Record<string, number> = {};

            for (const zone of entry.value.heartRateZones) {
              zoneValues[`zone-${zone.name}`] = zone.minutes;
            }

            dataset.push({
              dateTime: dayjs(entry.dateTime).toDate(),
              ...zoneValues,
            });
          }
          series = [
            {
              type: "bar",
              label: "Fat Burn",
              stack: "zones",
              dataKey: "zone-Fat Burn",
              color: "#f5e12f",
              valueFormatter: (value) => `${value} minutes`,
            },
            {
              type: "bar",
              label: "Cardio",
              stack: "zones",
              dataKey: "zone-Cardio",
              color: "#f59f2f",
              valueFormatter: (value) => `${value} minutes`,
            },
            {
              type: "bar",
              label: "Peak",
              stack: "zones",
              dataKey: "zone-Peak",
              color: "#f5492f",
              valueFormatter: (value) => `${value} minutes`,
            },
          ];
          yAxis = [{ label: "mins" }];
        }
        break;
    }

    return { dataset, series, yAxis };
  }, [data, selectedResource, units]);
}

export function GraphView() {
  const startDay = useAtomValue(startDayAtom);
  const endDay = useAtomValue(endDayAtom);

  const selectedResource = useAtomValue(selectedResourceAtom);

  const { data } = useQuery(
    buildTimeSeriesQuery(selectedResource, startDay, endDay)
  );

  const { dataset, series, yAxis } = useDataset(data);

  const requiredScopes =
    TIME_SERIES_CONFIGS[selectedResource]?.requiredScopes ?? [];

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
        <RequireScopes scopes={requiredScopes}>
          <ResponsiveChartContainer
            dataset={dataset}
            series={series}
            xAxis={[
              {
                scaleType: "band",
                dataKey: "dateTime",
                valueFormatter: (value) => formatShortDate(dayjs(value)),
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
        </RequireScopes>
      </div>
    </div>
  );
}
