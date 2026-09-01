import { test as base, Page } from "@playwright/test";

import type { DataPoint } from "@generated/orval/fetch/google-health-api/models";

const WEIGHT_LIST_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/weight\/dataPoints(?:\?|$)/;
const WEIGHT_BATCH_DELETE_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/weight\/dataPoints:batchDelete(?:\?|$)/;
const BODY_FAT_LIST_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/body-fat\/dataPoints(?:\?|$)/;
const HEIGHT_LIST_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/height\/dataPoints(?:\?|$)/;

export class WeightApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.setWeightLogsResponse([]);
    await this.setBodyFatLogsResponse([]);
    await this.page.route(HEIGHT_LIST_URL, async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({ json: { dataPoints: [] } });
    });
    await this.page.route(WEIGHT_BATCH_DELETE_URL, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: {} });
        return;
      }

      await route.fallback();
    });
  }

  async setWeightLogsResponse(
    dataPoints: ReadonlyArray<DataPoint>,
    date = "*",
  ) {
    await this.page.route(WEIGHT_LIST_URL, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            done: true,
            name: "operations/weight-create",
          },
        });
        return;
      }

      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      const url = decodeURIComponent(route.request().url());
      if (date !== "*" && !url.includes(date)) {
        await route.fulfill({ json: { dataPoints: [] } });
        return;
      }

      await route.fulfill({ json: { dataPoints } });
    });
  }

  async setBodyFatLogsResponse(
    dataPoints: ReadonlyArray<DataPoint>,
    date = "*",
  ) {
    await this.page.route(BODY_FAT_LIST_URL, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            done: true,
            name: "operations/body-fat-create",
          },
        });
        return;
      }

      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      const url = decodeURIComponent(route.request().url());
      if (date !== "*" && !url.includes(date)) {
        await route.fulfill({ json: { dataPoints: [] } });
        return;
      }

      await route.fulfill({ json: { dataPoints } });
    });
  }

  async setWeightLogSaveResponse(success = true, errorMessage?: string) {
    await this.page.route(WEIGHT_LIST_URL, async (route) => {
      if (route.request().method() === "POST") {
        if (success) {
          await route.fulfill({
            json: {
              done: true,
              name: "operations/weight-create",
            },
          });
        } else {
          await route.fulfill({
            status: 400,
            json: {
              errors: [
                { message: errorMessage || "Error saving weight log" },
              ],
            },
          });
        }
        return;
      }

      await route.fallback();
    });
  }

  async setFatLogSaveResponse(success = true, errorMessage?: string) {
    await this.page.route(BODY_FAT_LIST_URL, async (route) => {
      if (route.request().method() === "POST") {
        if (success) {
          await route.fulfill({
            json: {
              done: true,
              name: "operations/body-fat-create",
            },
          });
        } else {
          await route.fulfill({
            status: 400,
            json: {
              errors: [{ message: errorMessage || "Error saving fat log" }],
            },
          });
        }
        return;
      }

      await route.fallback();
    });
  }
}

type WeightApiFixture = {
  weightApi: WeightApi;
};

export const test = base.extend<WeightApiFixture>({
  weightApi: async ({ page }, use) => {
    const api = new WeightApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
