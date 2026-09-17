import { test as base } from "@playwright/test";

import { UserTile } from "@/storage/tiles";

type DashboardFixture = {
  dashboard: {
    initTiles: (tiles: Array<UserTile>) => Promise<void>;
    updateTiles: (tiles: Array<UserTile>) => Promise<void>;
  };
};

function seedScript(tiles: Array<UserTile>) {
  return {
    dashboards: {
      dashboards: [
        {
          id: "e2e-main",
          name: "Main",
          tiles,
        },
      ],
    },
  };
}

export const test = base.extend<DashboardFixture>({
  dashboard: async ({ page }, use) => {
    /** Set up tiles before page load via MemorySettingsStorage seed. */
    async function initTiles(tiles: Array<UserTile>) {
      await page.addInitScript((seed) => {
        (
          window as Window & {
            __SETTINGS_STORAGE_SEED__?: unknown;
          }
        ).__SETTINGS_STORAGE_SEED__ = seed;
      }, seedScript(tiles));
    }

    /** Change tiles after page load through the same seed + reload is not used;
     * write through local evaluate of jotai is unavailable, so update the seed
     * storage singleton if already created via window hook is not exposed.
     * Prefer re-init + navigation for e2e updates. */
    async function updateTiles(tiles: Array<UserTile>) {
      await page.evaluate((seed) => {
        (
          window as Window & {
            __SETTINGS_STORAGE_SEED__?: unknown;
          }
        ).__SETTINGS_STORAGE_SEED__ = seed;
      }, seedScript(tiles));
    }

    await use({
      initTiles,
      updateTiles,
    });
  },
});
