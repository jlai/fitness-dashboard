import { test, expect } from "@/e2e/fixtures";
import {
  ActiveMinutesTimeSeriesValue,
  HeartTimeSeriesValue,
  TimeSeriesEntry,
} from "@/api/times-series";
import { MOCK_DATE } from "@/e2e/fixtures/standard";

const ACTIVE_MINUTES_TIME_SERIES: TimeSeriesEntry<ActiveMinutesTimeSeriesValue>[] =
  [
    {
      dateTime: MOCK_DATE,
      value: {
        lightlyActiveMinutes: 0,
        fairlyActiveMinutes: 10,
        veryActiveMinutes: 5,
        activeMinutes: 15,
      },
    },
  ];

const HEART_TIME_SERIES: TimeSeriesEntry<HeartTimeSeriesValue>[] = [
  {
    dateTime: MOCK_DATE,
    value: {
      heartRateZones: [
        { name: "Out of Range", minutes: 30, caloriesOut: 0, min: 0, max: 0 },
        { name: "Fat Burn", minutes: 6, caloriesOut: 0, min: 0, max: 0 },
        { name: "Cardio", minutes: 8, caloriesOut: 0, min: 0, max: 0 },
        { name: "Peak", minutes: 5, caloriesOut: 0, min: 0, max: 0 },
      ],
    },
  },
];

test.describe("with mets source", () => {
  test.describe("with active minutes data", () => {
    test("shows current day's active minutes", async ({
      page,
      dashboard,
      timeSeriesApi,
    }) => {
      await dashboard.initTiles([
        {
          id: "test-tile",
          type: "gaugeActiveMinutes",
          w: 1,
          h: 1,
          settings: {
            source: "mets",
          },
        },
      ]);

      await timeSeriesApi.setActiveMinutesTimeSeriesResponse(
        ACTIVE_MINUTES_TIME_SERIES,
      );

      await page.goto("/");

      const tile = page.getByTestId("tile-test-tile");
      await expect(tile).toBeVisible();

      await expect(tile.getByRole("button")).toContainText("15 active mins");

      const gauge = tile.getByRole("meter");
      await expect(gauge).toHaveAttribute("aria-valuenow", "15");
    });
  });
});

test.describe("with heart-rate-zone source", () => {
  test.describe("with no heart data", () => {
    test("shows zero active minutes", async ({
      page,
      dashboard,
      timeSeriesApi,
    }) => {
      await dashboard.initTiles([
        {
          id: "test-tile",
          type: "gaugeActiveMinutes",
          w: 1,
          h: 1,
          settings: {
            source: "heart-rate-zones",
          },
        },
      ]);

      await timeSeriesApi.setHeartTimeSeriesResponse([]);

      await page.goto("/");

      const tile = page.getByTestId("tile-test-tile");
      await expect(tile).toBeVisible();

      await expect(tile.getByRole("button")).toContainText("0 active mins");

      const gauge = tile.getByRole("meter");
      await expect(gauge).toHaveAttribute("aria-valuenow", "0");
    });
  });

  test.describe("with heart rate zone data", () => {
    test("shows current day's active zone minutes", async ({
      page,
      dashboard,
      timeSeriesApi,
    }) => {
      await dashboard.initTiles([
        {
          id: "test-tile",
          type: "gaugeActiveMinutes",
          w: 1,
          h: 1,
          settings: {
            source: "heart-rate-zones",
          },
        },
      ]);

      await timeSeriesApi.setHeartTimeSeriesResponse(HEART_TIME_SERIES);

      await page.goto("/");

      const tile = page.getByTestId("tile-test-tile");
      await expect(tile).toBeVisible();

      await expect(tile.getByRole("button")).toContainText("19 active mins");

      const gauge = tile.getByRole("meter");
      await expect(gauge).toHaveAttribute("aria-valuenow", "19");
    });
  });
});
