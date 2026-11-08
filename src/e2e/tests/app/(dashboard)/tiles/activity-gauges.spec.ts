import { test, expect } from "@/e2e/fixtures";
import { TimeSeriesEntry } from "@/api/times-series";
import { MOCK_DATE } from "@/e2e/fixtures/standard";

const DISTANCE_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: MOCK_DATE, value: "5" },
];

const FLOORS_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: MOCK_DATE, value: "12" },
];

const CALORIES_TIME_SERIES: TimeSeriesEntry<string>[] = [
  { dateTime: MOCK_DATE, value: "850" },
];

test.describe("distance tile", () => {
  test("shows current day's distance from daily rollup", async ({
    page,
    dashboard,
    timeSeriesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "gaugeDistance", w: 1, h: 1 },
    ]);

    await timeSeriesApi.setActivityTimeSeriesResponse(
      "distance",
      DISTANCE_TIME_SERIES,
    );

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();
    await expect(tile.getByRole("button")).toContainText("3.11 mi");
  });
});

test.describe("floors tile", () => {
  test("shows current day's floors from daily rollup", async ({
    page,
    dashboard,
    timeSeriesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "gaugeFloors", w: 1, h: 1 },
    ]);

    await timeSeriesApi.setActivityTimeSeriesResponse(
      "floors",
      FLOORS_TIME_SERIES,
    );

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();
    await expect(tile.getByRole("button")).toContainText("12 floors");
  });
});

test.describe("calories tile", () => {
  test("shows current day's calories from daily rollup", async ({
    page,
    dashboard,
    timeSeriesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "gaugeCaloriesBurned", w: 1, h: 1 },
    ]);

    await timeSeriesApi.setActivityTimeSeriesResponse(
      "calories",
      CALORIES_TIME_SERIES,
    );

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();
    await expect(tile.getByRole("button")).toContainText("850 calories");
  });
});
