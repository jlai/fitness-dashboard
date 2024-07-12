import {
  BarSeriesType,
  LineSeriesType,
  AxisConfig,
  ScaleName,
  ChartsYAxisProps,
} from "@mui/x-charts";
import { DatasetType } from "@mui/x-charts/internals";
import { MakeOptional } from "@mui/x-date-pickers/internals";
import dayjs from "dayjs";
import { useMemo } from "react";

import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { useUnits } from "@/config/units";
import {
  TimeSeriesEntry,
  HeartTimeSeriesValue,
  TimeSeriesResource,
} from "@/api/times-series";
import { SleepLog } from "@/api/sleep";

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

export function useDataset(
  resource: TimeSeriesResource,
  data?: Array<TimeSeriesEntry<unknown>>
) {
  const units = useUnits();

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

    switch (resource) {
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
      case "sleep":
        dataset = getSingleValueDataset(data, Number);
        series = [
          {
            type: "bar",
            label: "Sleep",
            dataKey: "value",
            valueFormatter: (value) =>
              value
                ? `${dayjs.duration(value, "minutes").format("H[h] mm[m]")}`
                : "",
          },
        ];
        yAxis = [
          {
            min: 0,
            tickMinStep: 60,
            tickMaxStep: 240,
            valueFormatter: (value) =>
              value ? `${dayjs.duration(value, "minutes").format("H:mm")}` : "",
          },
        ];
        break;
      case "calories-in":
        dataset = getSingleValueDataset(data, (value) => Number(value));
        series = [
          {
            type: "bar",
            label: "Calories consumed",
            dataKey: "value",
            valueFormatter: (value) =>
              value ? `${FRACTION_DIGITS_1.format(value)} Cal` : "",
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
  }, [data, resource, units]);
}
