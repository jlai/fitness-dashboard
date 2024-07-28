import { test as base, Page } from "@playwright/test";

import { GetFoodLogResponse } from "@/api/nutrition";

export class NutritionApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    await page.route("**/1/foods/units.json", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route(
      "**/1/user/-/foods/log/{favorite,frequent,recent}.json",
      async (route) => {
        await route.fulfill({ json: [] });
      }
    );
    // custom foods
    await page.route("**/1/user/-/foods.json", async (route) => {
      await route.fulfill({ json: { foods: [] } });
    });
    await page.route("**/1/user/-/foods/log/date/*.json", async (route) => {
      await route.fulfill({ json: { foods: [] } });
    });
  }

  async setFoodLogsResponse(
    response: Readonly<GetFoodLogResponse>,
    date = "*"
  ) {
    await this.page.route(
      `**/1/user/-/foods/log/date/${date}.json`,
      async (route) => {
        await route.fulfill({ json: response });
      }
    );
  }
}

type NutritionApiFixture = {
  nutritionApi: NutritionApi;
};

export const test = base.extend<NutritionApiFixture>({
  nutritionApi: async ({ page }, use) => {
    const api = new NutritionApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
