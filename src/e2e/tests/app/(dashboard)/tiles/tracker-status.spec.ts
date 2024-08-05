import { MOBILE_TRACK_DEVICE, TRACKER_DEVICE } from "@/e2e/data/devices";
import { test, expect } from "@/e2e/fixtures";

test.describe("with no trackers", () => {
  test("shows no devices message", async ({
    page,
    dashboard,
    devicesApi: _devicesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "trackerStatus", w: 1, h: 1 },
    ]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");
    await expect(tile).toBeVisible();

    const text = page.getByText("No devices");
    await expect(text).toBeVisible();
  });
});

test.describe("with tracker", () => {
  test("shows battery and last sync time", async ({
    page,
    dashboard,
    devicesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "trackerStatus", w: 1, h: 1 },
    ]);

    await devicesApi.setDevicesResponse([TRACKER_DEVICE]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");

    await expect(tile).toBeVisible();
    await expect(page.getByText("53%")).toBeVisible();
    await expect(page.getByText("12:00 PM")).toBeVisible();
  });

  test("shows date for older last sync time", async ({
    page,
    dashboard,
    devicesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "trackerStatus", w: 1, h: 1 },
    ]);

    await devicesApi.setDevicesResponse([
      { ...TRACKER_DEVICE, lastSyncTime: "2021-01-29T14:00:00" },
    ]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");

    await expect(tile).toBeVisible();
    await expect(page.getByText("53%")).toBeVisible();
    await expect(page.getByText("Jan 29")).toBeVisible();
  });
});

test.describe("with tracker and MobileTrack", () => {
  test("shows battery and last sync time for tracker", async ({
    page,
    dashboard,
    devicesApi,
  }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "trackerStatus", w: 1, h: 1 },
    ]);

    await devicesApi.setDevicesResponse([MOBILE_TRACK_DEVICE, TRACKER_DEVICE]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");

    await expect(tile).toBeVisible();
    await expect(page.getByText("53%")).toBeVisible();
    await expect(page.getByText("12:00 PM")).toBeVisible();
  });
});

test.describe("with MobileTrack", () => {
  test("shows last sync time", async ({ page, dashboard, devicesApi }) => {
    await dashboard.initTiles([
      { id: "test-tile", type: "trackerStatus", w: 1, h: 1 },
    ]);

    await devicesApi.setDevicesResponse([MOBILE_TRACK_DEVICE]);

    await page.goto("/");

    const tile = page.getByTestId("tile-test-tile");

    await expect(tile).toBeVisible();
    await expect(page.getByText("12:00 PM")).toBeVisible();
  });
});
