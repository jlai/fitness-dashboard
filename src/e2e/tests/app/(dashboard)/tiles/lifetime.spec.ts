import { test, expect } from "@/e2e/fixtures";

test.describe("lifetime tiles", () => {
  test("shows not implemented message", async ({ page, dashboard }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "lifetimeSteps", w: 2, h: 1 },
    ]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();
    await expect(tile).toContainText("Lifetime stats not implemented yet.");
  });
});
