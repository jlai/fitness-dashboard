import { test as base, Page } from "@playwright/test";

import { Food, GetFoodLogResponse } from "@/api/nutrition";
import { SCRAMBLED_EGGS } from "@/e2e/data/nutrition/food-log-list";

export class NutritionApi {
  private favorites = new Map<number, Food>();

  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    await page.route("**/1/foods/units.json", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route("**/1/user/-/foods/log/favorite.json", async (route) => {
      await route.fulfill({ json: [...this.favorites.values()] });
    });
    await page.route(
      "**/1/user/-/foods/log/{frequent,recent}.json",
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

    // Update or delete favorite
    await page.route(
      "**/1/user/-/foods/log/favorite/*.json**",
      async (route) => {
        const method = route.request().method();
        const [_, foodIdStr] =
          route
            .request()
            .url()
            .match(/favorite\/(\d+).json/) ?? [];
        const foodId = Number(foodIdStr);

        if (method === "POST") {
          if (foodId === SCRAMBLED_EGGS.foodId) {
            this.favorites.set(foodId, SCRAMBLED_EGGS);
          } else {
            throw new Error("unknown food id");
          }

          await route.fulfill({ status: 200 });
        } else if (method === "DELETE") {
          this.favorites.delete(foodId);

          await route.fulfill({ status: 200 });
        } else {
          await route.fallback();
        }
      }
    );

    // Update or delete food log
    await page.route("**/1/user/-/foods/log/*.json**", async (route) => {
      if (["POST", "DELETE"].includes(route.request().method())) {
        await route.fulfill({ status: 200 });
      } else {
        await route.fallback();
      }
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

  waitForAddToFavorites(foodId: number) {
    return this.page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith(`/1/user/-/foods/log/favorite/${foodId}.json`)
    );
  }

  waitForRemoveFromFavorites(foodId: number) {
    return this.page.waitForRequest(
      (request) =>
        request.method() === "DELETE" &&
        request.url().endsWith(`/1/user/-/foods/log/favorite/${foodId}.json`)
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
