import { test, expect } from "@/e2e/fixtures";
import { TimeSeriesEntry } from "@/api/times-series";
import { ActiveZoneMinutesTimeSeriesValue } from "@/api/times-series";
import { MOCK_DATE } from "@/e2e/fixtures/standard";

const ACTIVE_ZONE_MINUTES_TIME_SERIES: TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>[] =
  [
    {
      dateTime: MOCK_DATE,
      value: {
        activeZoneMinutes: 45,
        fatBurnActiveZoneMinutes: 15,
        cardioActiveZoneMinutes: 10,
        peakActiveZoneMinutes: 5,
      },
    },
  ];

test.describe("with no active zone minutes data", () => {
  test("shows zero active zone minutes", async ({
    page,
    dashboard,
    timeSeriesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "gaugeActiveZoneMinutes", w: 1, h: 1 },
    ]);

    await timeSeriesApi.setActiveZoneMinutesTimeSeriesResponse([]);
    await timeSeriesApi.setActivityGoalsResponse({ activeZoneMinutes: 25 });

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();

    await expect(tile.getByRole("button")).toContainText("0 zone mins");

    const gauge = tile.getByRole("meter");
    await expect(gauge).toHaveAttribute("aria-valuenow", "0");
  });
});

test.describe("with active zone minutes data", () => {
  test("shows current day's active zone minutes", async ({
    page,
    dashboard,
    timeSeriesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "gaugeActiveZoneMinutes", w: 1, h: 1 },
    ]);

    await timeSeriesApi.setActiveZoneMinutesTimeSeriesResponse(
      ACTIVE_ZONE_MINUTES_TIME_SERIES
    );
    await timeSeriesApi.setActivityGoalsResponse({ activeZoneMinutes: 25 });

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();

    await expect(tile.getByRole("button")).toContainText("45 zone mins");

    const gauge = tile.getByRole("meter");
    await expect(gauge).toHaveAttribute("aria-valuenow", "45");
  });
});
