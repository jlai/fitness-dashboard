import { test as base, Page } from "@playwright/test";

import { HeartTimeSeriesValue, TimeSeriesEntry } from "@/api/times-series";
import { ActiveZoneMinutesTimeSeriesValue } from "@/api/times-series";
import { GetDailyActivitySummaryResponse } from "@/api/exercise";

export class TimeSeriesApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    // Default empty responses for time series
    await this.page.route(
      "**/1/user/-/body/weight/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "body-weight": [] } });
      },
    );

    await this.page.route(
      "**/1/user/-/body/fat/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "body-fat": [] } });
      },
    );

    await this.page.route(
      "**/1/user/-/body/bmi/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "body-bmi": [] } });
      },
    );

    await this.page.route(
      "**/1/user/-/activities/active-zone-minutes/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "activities-active-zone-minutes": [] } });
      },
    );
  }

  async setDailySummaryResponse(
    response: Readonly<GetDailyActivitySummaryResponse>,
    dateRange = { start: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/activities/date/${dateRange.start}.json`,
      async (route) => {
        await route.fulfill({
          json: response,
        });
      },
    );
  }

  async setWeightTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
    dateRange = { start: "*", end: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/body/weight/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "body-weight": response },
        });
      },
    );
  }

  async setFatTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
    dateRange = { start: "*", end: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/body/fat/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "body-fat": response },
        });
      },
    );
  }

  async setBmiTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
    dateRange = { start: "*", end: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/body/bmi/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "body-bmi": response },
        });
      },
    );
  }

  async setHeartTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<HeartTimeSeriesValue>[]>,
    dateRange = { start: "*", end: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/activities/heart/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "activities-heart": response },
        });
      },
    );
  }

  async setActiveZoneMinutesTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>[]>,
    dateRange = { start: "*", end: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/activities/active-zone-minutes/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "activities-active-zone-minutes": response },
        });
      },
    );
  }
}

type TimeSeriesApiFixture = {
  timeSeriesApi: TimeSeriesApi;
};

export const test = base.extend<TimeSeriesApiFixture>({
  timeSeriesApi: async ({ page }, use) => {
    const api = new TimeSeriesApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
