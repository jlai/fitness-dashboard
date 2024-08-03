import { test as base, Page } from "@playwright/test";

import { GetHeartIntradayResponse } from "@/api/intraday";

export class IntradayApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    // Heart
    await page.route(
      "**/1/user/-/activities/heart/date/*/*/*/time/00:00/23:59.json",
      async (route) => {
        await route.fulfill({
          json: {
            "activities-heart": [{ heartRateZones: [] }],
            "activities-heart-intraday": { dataset: [] },
          } satisfies GetHeartIntradayResponse,
        });
      }
    );
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
