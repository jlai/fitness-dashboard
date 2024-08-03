import { test, expect } from "@/e2e/fixtures";

test.describe("with no heart rate data", () => {
  test("shows no heart rate message", async ({
    page,
    dashboard,
    intradayApi,
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
