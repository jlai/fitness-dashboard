import { test as base, Page } from "@playwright/test";

import type { DataPoint } from "@generated/orval/fetch/google-health-api/models";

const FOOD_LIST_URL = /\/v4\/users\/[^/]+\/dataTypes\/food\/dataPoints(?:\?|$)/;
const FOOD_GET_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/food\/dataPoints\/[^/?]+(?:\?|$)/;
const FOOD_MEASUREMENT_UNIT_LIST_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/food-measurement-unit\/dataPoints(?:\?|$)/;
const FOOD_MEASUREMENT_UNIT_GET_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/food-measurement-unit\/dataPoints\/[^/?]+(?:\?|$)/;
const NUTRITION_LOG_LIST_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/nutrition-log\/dataPoints(?:\?|$)/;
const NUTRITION_LOG_PATCH_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/nutrition-log\/dataPoints\/[^/?]+(?:\?|$)/;
const NUTRITION_LOG_BATCH_DELETE_URL =
  /\/v4\/users\/[^/]+\/dataTypes\/nutrition-log\/dataPoints:batchDelete(?:\?|$)/;

export class NutritionApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    await page.route(FOOD_LIST_URL, async (route) => {
      await route.fulfill({ json: { dataPoints: [] } });
    });
    await page.route(FOOD_GET_URL, async (route) => {
      const id = route
        .request()
        .url()
        .match(/dataPoints\/([^/?]+)/)?.[1];
      await route.fulfill({
        json: {
          name: `users/me/dataTypes/food/dataPoints/${id}`,
          food: {
            displayName: id === "80850" ? "Scrambled Eggs" : "Orange Juice",
          },
        },
      });
    });
    await page.route(FOOD_MEASUREMENT_UNIT_LIST_URL, async (route) => {
      await route.fulfill({ json: { dataPoints: [] } });
    });
    await page.route(FOOD_MEASUREMENT_UNIT_GET_URL, async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      const id = decodeURIComponent(route.request().url()).match(
        /dataPoints\/([^/?]+)/,
      )?.[1];

      await route.fulfill({
        json: {
          name: `users/me/dataTypes/food-measurement-unit/dataPoints/${id}`,
          foodMeasurementUnit: {
            displayName: "serving",
            pluralDisplayName: "servings",
          },
        },
      });
    });
    await page.route(NUTRITION_LOG_LIST_URL, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            name: "users/me/dataTypes/nutrition-log/dataPoints/new",
          },
        });
        return;
      }

      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({ json: { dataPoints: [] } });
    });
    await page.route(NUTRITION_LOG_PATCH_URL, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          json: {
            name: "users/me/dataTypes/nutrition-log/dataPoints/updated",
          },
        });
        return;
      }

      await route.fallback();
    });
    await page.route(NUTRITION_LOG_BATCH_DELETE_URL, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: {} });
        return;
      }

      await route.fallback();
    });
  }

  async setFoodLogsResponse(dataPoints: ReadonlyArray<DataPoint>, date = "*") {
    await this.page.route(NUTRITION_LOG_LIST_URL, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            name: "users/me/dataTypes/nutrition-log/dataPoints/new",
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

      await route.fulfill({
        json: { dataPoints },
      });
    });
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
