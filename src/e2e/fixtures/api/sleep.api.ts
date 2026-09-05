import { test as base, Page } from "@playwright/test";

export class SleepApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.page.route("**/1.2/user/-/sleep/goal.json", async (route) => {
      await route.fulfill({ json: { goal: {} } });
    });
  }

  async setSleepGoalResponse(minDuration: number) {
    await this.page.route("**/1.2/user/-/sleep/goal.json", async (route) => {
      await route.fulfill({
        json: {
          goal: {
            minDuration,
            updatedOn: "2021-01-01T00:00:00.000Z",
          },
        },
      });
    });
  }
}

type SleepApiFixture = {
  sleepApi: SleepApi;
};

export const test = base.extend<SleepApiFixture>({
  sleepApi: async ({ page }, use) => {
    const api = new SleepApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
