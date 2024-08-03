import { test as base } from "@playwright/test";

import { UserTile } from "@/storage/tiles";

type DashboardFixture = {
  dashboard: {
    initTiles: (tiles: Array<UserTile>) => Promise<void>;
    updateTiles: (tiles: Array<UserTile>) => Promise<void>;
  };
};

export const test = base.extend<DashboardFixture>({
  dashboard: async ({ page }, use) => {
    /** Set up tiles before page load */
    async function initTiles(tiles: Array<UserTile>) {
      await page.addInitScript((tilesString) => {
        localStorage.setItem("dashboard-tiles", tilesString);
      }, JSON.stringify(tiles));
    }

    /** Change tiles after page load */
    async function updateTiles(tiles: Array<UserTile>) {
      await page.evaluate((tilesString) => {
        localStorage.setItem("dashboard-tiles", tilesString);
      }, JSON.stringify(tiles));
    }

    await use({
      initTiles,
      updateTiles,
    });
  },
});
