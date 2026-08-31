import { test as base, Page } from "@playwright/test";

import type { DataPoint } from "@generated/orval/fetch/google-health-api/models";

import { HEART_INTRADAY_EMPTY_DATAPOINTS } from "@/e2e/data/heart-intraday";

const HEART_RATE_DATAPOINTS_URL =
  "**/v4/users/*/dataTypes/heart-rate/dataPoints**";
const HEART_RATE_ZONES_DATAPOINTS_URL =
  "**/v4/users/*/dataTypes/daily-heart-rate-zones/dataPoints**";

export class IntradayApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    await page.route(HEART_RATE_DATAPOINTS_URL, async (route) => {
      await route.fulfill({
        json: { dataPoints: HEART_INTRADAY_EMPTY_DATAPOINTS },
      });
    });

    await page.route(HEART_RATE_ZONES_DATAPOINTS_URL, async (route) => {
      await route.fulfill({
        json: { dataPoints: [] },
      });
    });
  }

  async setHeartIntradayResponse(dataPoints: ReadonlyArray<DataPoint>) {
    await this.page.route(HEART_RATE_DATAPOINTS_URL, async (route) => {
      await route.fulfill({ json: { dataPoints } });
    });
  }
}

type IntradayApiFixture = {
  intradayApi: IntradayApi;
};

export const test = base.extend<IntradayApiFixture>({
  intradayApi: async ({ page }, use) => {
    const api = new IntradayApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
