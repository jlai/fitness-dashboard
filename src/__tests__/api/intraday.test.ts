import {
  HeartRateZoneHeartRateZoneType,
  type HeartRateZone,
} from "@generated/orval/fetch/google-health-api/models";

import { parseDailyHeartRateZones } from "@/api/heart-rate";
import {
  aggregateIntradayEntries,
  toActivityIntradayEntries,
  toActiveZoneMinutesIntradayEntries,
  toCaloriesIntradayEntries,
  toHeartRateIntradayEntries,
} from "@/api/intraday";
import type { DataPointFor, RollupDataPointFor } from "@/api/datapoints";

describe("toActivityIntradayEntries", () => {
  it("maps steps datapoints to dateTime entries", () => {
    const dataPoints: Array<DataPointFor<"steps">> = [
      {
        steps: {
          count: "123",
          interval: { startTime: "2024-05-07T18:16:50-07:00" },
        },
      },
      {
        steps: {
          count: "40",
          interval: { startTime: "2024-05-07T19:00:15-07:00" },
        },
      },
    ];

    expect(toActivityIntradayEntries("steps", dataPoints)).toEqual([
      { dateTime: new Date("2024-05-07T18:16:50-07:00"), value: 123 },
      { dateTime: new Date("2024-05-07T19:00:15-07:00"), value: 40 },
    ]);
  });

  it("converts distance millimeters to kilometers", () => {
    const dataPoints: Array<DataPointFor<"distance">> = [
      {
        distance: {
          millimeters: "2500000",
          interval: { startTime: "2024-05-07T08:00:00Z" },
        },
      },
    ];

    expect(toActivityIntradayEntries("distance", dataPoints)).toEqual([
      { dateTime: new Date("2024-05-07T08:00:00Z"), value: 2.5 },
    ]);
  });

  it("skips datapoints without a usable timestamp", () => {
    const dataPoints: Array<DataPointFor<"floors">> = [
      { floors: { count: "2" } },
      {
        floors: {
          count: "1",
          interval: { startTime: "2024-05-07T09:00:00Z" },
        },
      },
    ];

    expect(toActivityIntradayEntries("floors", dataPoints)).toEqual([
      { dateTime: new Date("2024-05-07T09:00:00Z"), value: 1 },
    ]);
  });
});

describe("toCaloriesIntradayEntries", () => {
  it("maps total-calories rollup windows to dateTime entries", () => {
    const rollupDataPoints: Array<RollupDataPointFor<"total-calories">> = [
      {
        startTime: "2024-05-07T18:16:00Z",
        totalCalories: { kcalSum: 12.5 },
      },
      {
        startTime: "2024-05-07T18:17:00Z",
        totalCalories: { kcalSum: 0 },
      },
    ];

    expect(toCaloriesIntradayEntries(rollupDataPoints)).toEqual([
      { dateTime: new Date("2024-05-07T18:16:00Z"), value: 12.5 },
      { dateTime: new Date("2024-05-07T18:17:00Z"), value: 0 },
    ]);
  });
});

describe("toHeartRateIntradayEntries", () => {
  it("maps heart-rate samples to dateTime entries", () => {
    const dataPoints: Array<DataPointFor<"heart-rate">> = [
      {
        heartRate: {
          beatsPerMinute: "76",
          sampleTime: { physicalTime: "2024-05-07T18:16:50Z" },
        },
      },
    ];

    expect(toHeartRateIntradayEntries(dataPoints)).toEqual([
      { dateTime: new Date("2024-05-07T18:16:50Z"), value: 76 },
    ]);
  });
});

describe("toActiveZoneMinutesIntradayEntries", () => {
  it("attributes zone minutes to the recorded heart-rate zone", () => {
    const dataPoints: Array<DataPointFor<"active-zone-minutes">> = [
      {
        activeZoneMinutes: {
          activeZoneMinutes: "2",
          heartRateZone: "CARDIO",
          interval: { startTime: "2024-05-07T07:00:00Z" },
        },
      },
    ];

    expect(toActiveZoneMinutesIntradayEntries(dataPoints)).toEqual([
      {
        dateTime: new Date("2024-05-07T07:00:00Z"),
        value: {
          activeZoneMinutes: 2,
          fatBurnActiveZoneMinutes: 0,
          cardioActiveZoneMinutes: 2,
          peakActiveZoneMinutes: 0,
        },
      },
    ]);
  });
});

describe("aggregateIntradayEntries", () => {
  it("sums values into aligned detail-level buckets", () => {
    const entries = [
      { dateTime: new Date("2024-05-07T18:01:00"), value: 10 },
      { dateTime: new Date("2024-05-07T18:14:00"), value: 5 },
      { dateTime: new Date("2024-05-07T18:16:00"), value: 7 },
    ];

    expect(
      aggregateIntradayEntries(entries, "15min", (values) =>
        values.reduce((sum, value) => sum + value, 0),
      ),
    ).toEqual([
      { dateTime: new Date("2024-05-07T18:00:00"), value: 15 },
      { dateTime: new Date("2024-05-07T18:15:00"), value: 7 },
    ]);
  });
});

describe("parseDailyHeartRateZones", () => {
  const zones: Array<HeartRateZone> = [
    {
      heartRateZoneType: HeartRateZoneHeartRateZoneType.LIGHT,
      minBeatsPerMinute: "30",
      maxBeatsPerMinute: "115",
    },
    {
      heartRateZoneType: HeartRateZoneHeartRateZoneType.MODERATE,
      minBeatsPerMinute: "115",
      maxBeatsPerMinute: "137",
    },
    {
      heartRateZoneType: HeartRateZoneHeartRateZoneType.VIGOROUS,
      minBeatsPerMinute: "137",
      maxBeatsPerMinute: "165",
    },
    {
      heartRateZoneType: HeartRateZoneHeartRateZoneType.PEAK,
      minBeatsPerMinute: "165",
      maxBeatsPerMinute: "220",
    },
  ];

  it("maps Google Health zones onto chart zone stats", () => {
    expect(parseDailyHeartRateZones(zones)).toEqual({
      outOfRange: { min: 30, max: 115, minutes: 0, caloriesOut: 0 },
      fatBurn: { min: 115, max: 137, minutes: 0, caloriesOut: 0 },
      cardio: { min: 137, max: 165, minutes: 0, caloriesOut: 0 },
      peak: { min: 165, max: 220, minutes: 0, caloriesOut: 0 },
    });
  });

  it("returns undefined when a required zone is missing", () => {
    expect(parseDailyHeartRateZones(zones.slice(0, 3))).toBeUndefined();
    expect(parseDailyHeartRateZones([])).toBeUndefined();
  });
});
