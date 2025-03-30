import { test as base, Page } from "@playwright/test";

import { TimeSeriesEntry } from "@/api/times-series";
import { ActiveZoneMinutesTimeSeriesValue } from "@/api/times-series";

export class TimeSeriesApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    // Default empty responses for time series
    await this.page.route(
      "**/1/user/-/body/weight/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "body-weight": [] } });
      }
    );

    await this.page.route(
      "**/1/user/-/body/fat/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "body-fat": [] } });
      }
    );

    await this.page.route(
      "**/1/user/-/body/bmi/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "body-bmi": [] } });
      }
    );

    await this.page.route(
      "**/1/user/-/activities/active-zone-minutes/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { "activities-active-zone-minutes": [] } });
      }
    );

    await this.page.route(
      "**/1/user/-/activities/goals/daily.json",
      async (route) => {
        await route.fulfill({ json: {} });
      }
    );
  }

  async setWeightTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
    dateRange = { start: "*", end: "*" }
  ) {
    await this.page.route(
      `**/1/user/-/body/weight/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "body-weight": response },
        });
      }
    );
  }

  async setFatTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
    dateRange = { start: "*", end: "*" }
  ) {
    await this.page.route(
      `**/1/user/-/body/fat/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "body-fat": response },
        });
      }
    );
  }

  async setBmiTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
    dateRange = { start: "*", end: "*" }
  ) {
    await this.page.route(
      `**/1/user/-/body/bmi/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "body-bmi": response },
        });
      }
    );
  }

  async setActiveZoneMinutesTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>[]>,
    dateRange = { start: "*", end: "*" }
  ) {
    await this.page.route(
      `**/1/user/-/activities/active-zone-minutes/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "activities-active-zone-minutes": response },
        });
      }
    );
  }

  async setActivityGoalsResponse(goals: { activeZoneMinutes?: number }) {
    await this.page.route(
      "**/1/user/-/activities/goals/daily.json",
      async (route) => {
        await route.fulfill({
          json: goals,
        });
      }
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
