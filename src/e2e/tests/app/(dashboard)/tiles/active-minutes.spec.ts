import { test, expect } from "@/e2e/fixtures";
import { HeartTimeSeriesValue, TimeSeriesEntry } from "@/api/times-series";
import { MOCK_DATE } from "@/e2e/fixtures/standard";
import { GetDailyActivitySummaryResponse } from "@/api/activity";

const DAILY_SUMMARY_RESPONSE: GetDailyActivitySummaryResponse = {
  activities: [],
  summary: {
    lightlyActiveMinutes: 0,
    veryActiveMinutes: 5,
    fairlyActiveMinutes: 10,

    // other stuff
    caloriesBMR: 0,
    caloriesOut: 0,
    steps: 0,
    floors: 0,
    distances: [],
  },
  goals: {
    activeMinutes: 5,
    caloriesOut: 0,
    distance: 0,
    floors: 0,
    steps: 0,
  },
};

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

      await timeSeriesApi.setDailySummaryResponse(DAILY_SUMMARY_RESPONSE);

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
      await timeSeriesApi.setActivityGoalsResponse({ activeMinutes: 25 });
      await timeSeriesApi.setDailySummaryResponse(DAILY_SUMMARY_RESPONSE);

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
      await timeSeriesApi.setDailySummaryResponse(DAILY_SUMMARY_RESPONSE);

      await page.goto("/");

      const tile = page.getByTestId("tile-test-tile");
      await expect(tile).toBeVisible();

      await expect(tile.getByRole("button")).toContainText("19 active mins");

      const gauge = tile.getByRole("meter");
      await expect(gauge).toHaveAttribute("aria-valuenow", "19");
    });
  });
});
