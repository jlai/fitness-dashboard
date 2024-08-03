import { HEART_INTRADAY_RESPONSE } from "@/e2e/data/nutrition/heart-intraday";
import { test, expect } from "@/e2e/fixtures";

test.describe("with no heart rate data", () => {
  test("shows no heart rate message", async ({
    page,
    dashboard,
    intradayApi: _intradayApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "heartRate", w: 1, h: 1 },
    ]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();

    const text = page.getByText("No heart rate data");
    await expect(text).toBeVisible();
  });
});

test.describe("with heart rate data", () => {
  test("shows heart rate range", async ({ page, dashboard, intradayApi }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "heartRate", w: 1, h: 1 },
    ]);

    await intradayApi.setHeartIntradayResponse(HEART_INTRADAY_RESPONSE);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();

    const text = page.getByLabel("BPM range");
    await expect(text).toBeVisible();
    await expect(text).toContainText(/67\s+\u2013\s+173/);
  });
});
