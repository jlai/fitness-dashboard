import { test as base, Page } from "@playwright/test";

import { WeightLog } from "@/api/body/types";

export class WeightApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.page.route(
      "**/1/user/-/body/log/weight/date/*/*.json",
      async (route) => {
        await route.fulfill({ json: { weight: [] } });
      }
    );

    // Default mock for weight and fat logging POST requests
    await this.page.route(
      "**/1/user/-/body/log/weight.json**",
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({ status: 200, json: { weightLog: {} } });
        } else {
          await route.fallback();
        }
      }
    );

    await this.page.route("**/1/user/-/body/log/fat.json**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, json: { fatLog: {} } });
      } else {
        await route.fallback();
      }
    });
  }

  async setWeightLogsResponse(response: Readonly<WeightLog[]>, date = "*") {
    await this.page.route(
      `**/1/user/-/body/log/weight/date/${date}/${date}.json`,
      async (route) => {
        await route.fulfill({ json: { weight: response } });
      }
    );
  }

  async setWeightLogSaveResponse(success = true, errorMessage?: string) {
    await this.page.route(
      "**/1/user/-/body/log/weight.json**",
      async (route) => {
        if (route.request().method() === "POST") {
          if (success) {
            await route.fulfill({
              status: 201,
              json: {
                weightLog: {
                  logId: Date.now(),
                  weight: 0, // Will be overridden by the mocked response in setWeightLogsResponse
                  date: "",
                  time: "",
                  source: "API",
                },
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
        } else {
          await route.fallback();
        }
      }
    );
  }

  async setFatLogSaveResponse(success = true, errorMessage?: string) {
    await this.page.route("**/1/user/-/body/log/fat.json**", async (route) => {
      if (route.request().method() === "POST") {
        if (success) {
          await route.fulfill({
            status: 201,
            json: {
              fatLog: {
                logId: Date.now(),
                fat: 0, // Will be overridden by the mocked response in setWeightLogsResponse
                date: "",
                time: "",
                source: "API",
              },
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
      } else {
        await route.fallback();
      }
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
