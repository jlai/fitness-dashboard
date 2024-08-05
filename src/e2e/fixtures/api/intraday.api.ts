import { test as base, Page } from "@playwright/test";

import { GetHeartIntradayResponse } from "@/api/intraday";
import { HEART_INTRADAY_EMPTY_RESPONSE } from "@/e2e/data/heart-intraday";

const HEART_INTRADAY_URL =
  "**/1/user/-/activities/heart/date/*/*/*/time/00:00/23:59.json";

export class IntradayApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    // Heart
    await page.route(
      "**/1/user/-/activities/heart/date/*/*/*/time/00:00/23:59.json",
      async (route) => {
        await route.fulfill({
          json: HEART_INTRADAY_EMPTY_RESPONSE,
        });
      }
    );
  }

  async setHeartIntradayResponse(
    response: Readonly<GetHeartIntradayResponse>,
    date = "*"
  ) {
    await this.page.route(
      `**/1/user/-/activities/heart/date/${date}/${date}/*/time/00:00/23:59.json`,
      async (route) => {
        await route.fulfill({ json: response });
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
