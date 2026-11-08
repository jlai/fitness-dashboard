import dayjs from "dayjs";

import type { ObservationSampleTime } from "@generated/orval/fetch/google-health-api/models";

import type { DataPointFor } from "../datapoints";
import { getDataPointValue } from "../datapoints";
import { formatAsDate } from "../datetime";
import { SettingsWeightUnit, type WeightUnitSystem } from "../user";

import type { WeightLog } from "./types";

export const GRAMS_PER_KILOGRAM = 1000;
export const POUNDS_PER_KG = 2.20462;
export const STONES_PER_KG = 0.157473;

export type WeightDataPoint = DataPointFor<"weight">;
export type BodyFatDataPoint = DataPointFor<"body-fat">;
export type HeightDataPoint = DataPointFor<"height">;

export function kilogramsFromLocalizedWeight(
  weight: number,
  unit: WeightUnitSystem,
) {
  switch (unit) {
    case SettingsWeightUnit.WEIGHT_UNIT_POUNDS:
      return weight / POUNDS_PER_KG;
    case SettingsWeightUnit.WEIGHT_UNIT_STONE:
      return weight / STONES_PER_KG;
    default:
      return weight;
  }
}

export function gramsFromLocalizedWeight(
  weight: number,
  unit: WeightUnitSystem,
) {
  return kilogramsFromLocalizedWeight(weight, unit) * GRAMS_PER_KILOGRAM;
}

export function kilogramsFromGrams(grams: number) {
  return grams / GRAMS_PER_KILOGRAM;
}

export function bmiFromWeightAndHeight(
  weightKg: number,
  heightMillimeters: number,
) {
  const heightM = heightMillimeters / 1000;
  if (heightM <= 0 || weightKg <= 0) {
    return undefined;
  }

  return weightKg / (heightM * heightM);
}

function formatCivilDate(date?: {
  year?: number;
  month?: number;
  day?: number;
}) {
  if (date?.year == null || date?.month == null || date?.day == null) {
    return "";
  }

  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(
    date.day,
  ).padStart(2, "0")}`;
}

function formatCivilTime(time?: {
  hours?: number;
  minutes?: number;
  seconds?: number;
}) {
  if (!time) {
    return "";
  }

  return `${String(time.hours ?? 0).padStart(2, "0")}:${String(
    time.minutes ?? 0,
  ).padStart(2, "0")}:${String(time.seconds ?? 0).padStart(2, "0")}`;
}

export function sampleDateAndTime(sampleTime?: ObservationSampleTime) {
  const date =
    formatCivilDate(sampleTime?.civilTime?.date) ||
    (sampleTime?.physicalTime
      ? formatAsDate(dayjs(sampleTime.physicalTime))
      : "");
  const time =
    formatCivilTime(sampleTime?.civilTime?.time) ||
    (sampleTime?.physicalTime
      ? dayjs(sampleTime.physicalTime).format("HH:mm:ss")
      : "");

  return { date, time };
}

function sampleInstantMs(sampleTime?: ObservationSampleTime) {
  if (sampleTime?.physicalTime) {
    const ms = dayjs(sampleTime.physicalTime).valueOf();
    return Number.isFinite(ms) ? ms : undefined;
  }

  const { date, time } = sampleDateAndTime(sampleTime);
  if (!date) {
    return undefined;
  }

  const ms = dayjs(`${date}T${time || "00:00:00"}`).valueOf();
  return Number.isFinite(ms) ? ms : undefined;
}

function heightMillimetersOnDate(
  heights: Array<{ date: string; millimeters: number }>,
  date: string,
) {
  let latest: number | undefined;

  for (const height of heights) {
    if (height.date <= date) {
      latest = height.millimeters;
    } else {
      break;
    }
  }

  return latest ?? heights.at(-1)?.millimeters;
}

function fatPercentForWeight(
  fats: Array<{ date: string; instantMs?: number; percent: number }>,
  date: string,
  instantMs?: number,
) {
  const sameDay = fats.filter((fat) => fat.date === date);
  if (sameDay.length === 0) {
    return undefined;
  }

  if (instantMs == null) {
    return sameDay[0]?.percent;
  }

  let closest = sameDay[0];
  let closestDelta = Number.POSITIVE_INFINITY;

  for (const fat of sameDay) {
    const delta =
      fat.instantMs == null
        ? Number.POSITIVE_INFINITY
        : Math.abs(fat.instantMs - instantMs);
    if (delta < closestDelta) {
      closest = fat;
      closestDelta = delta;
    }
  }

  return closest?.percent;
}

export function toWeightLogs(
  weights: Array<WeightDataPoint>,
  fats: Array<BodyFatDataPoint>,
  heights: Array<HeightDataPoint> = [],
): Array<WeightLog> {
  const fatSamples = fats.flatMap((dataPoint) => {
    const fat = getDataPointValue("body-fat", dataPoint);
    const percent = Number(fat.percentage);
    if (!Number.isFinite(percent)) {
      return [];
    }

    const { date } = sampleDateAndTime(fat.sampleTime);
    if (!date) {
      return [];
    }

    return [
      {
        date,
        instantMs: sampleInstantMs(fat.sampleTime),
        percent,
      },
    ];
  });

  const heightSamples = heights
    .flatMap((dataPoint) => {
      const height = getDataPointValue("height", dataPoint);
      const millimeters = Number(height.heightMillimeters);
      const { date } = sampleDateAndTime(height.sampleTime);
      if (!date || !Number.isFinite(millimeters)) {
        return [];
      }

      return [{ date, millimeters }];
    })
    .toSorted((a, b) => a.date.localeCompare(b.date));

  return weights
    .flatMap((dataPoint) => {
      const weight = getDataPointValue("weight", dataPoint);
      const grams = Number(weight.weightGrams);
      if (!Number.isFinite(grams)) {
        return [];
      }

      const { date, time } = sampleDateAndTime(weight.sampleTime);
      if (!date) {
        return [];
      }

      const weightKg = kilogramsFromGrams(grams);
      const instantMs = sampleInstantMs(weight.sampleTime);
      const heightMm = heightMillimetersOnDate(heightSamples, date);

      return [
        {
          name: dataPoint.name ?? "",
          date,
          time,
          weight: weightKg,
          fat: fatPercentForWeight(fatSamples, date, instantMs),
          bmi:
            heightMm != null
              ? bmiFromWeightAndHeight(weightKg, heightMm)
              : undefined,
        } satisfies WeightLog,
      ];
    })
    .toSorted((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
    });
}
