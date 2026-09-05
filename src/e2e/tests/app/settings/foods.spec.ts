import { Page } from "@playwright/test";

import { Food } from "@/api/nutrition";
import {
  BREAKFAST_FOOD_LOGS_RESPONSE,
  SCRAMBLED_EGGS,
} from "@/e2e/data/nutrition/food-log-list";
import { expect, test } from "@/e2e/fixtures";

const SAMPLE_CUSTOM_FOODS: Array<Food> = [
  {
    ...SCRAMBLED_EGGS,
    foodId: 9001,
    accessLevel: "PRIVATE",
    name: "Homemade Scramble",
  },
];

async function readStoredCustomFoods(page: Page) {
  return page.evaluate(() => {
    return new Promise<Array<Food>>((resolve, reject) => {
      const request = indexedDB.open("FitbitMigrationDB");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("customFoods", "readonly");
        const store = tx.objectStore("customFoods");
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result);
        getAll.onerror = () => reject(getAll.error);
      };
    });
  });
}

test("can backup custom foods to local storage", async ({
  page,
  pageObjects: { toasts },
  nutritionApi,
}) => {
  await nutritionApi.setCustomFoodsResponse(SAMPLE_CUSTOM_FOODS);

  await page.goto("/settings/foods/custom");

  const saveButton = page.getByRole("button", {
    name: "Backup custom foods",
  });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(toasts.successToasts).toHaveText(/Saved 1 custom food/);

  const storedCustomFoods = await readStoredCustomFoods(page);
  expect(storedCustomFoods).toEqual(SAMPLE_CUSTOM_FOODS);
});

test("shows the custom foods backup alert on the log food tab", async ({
  page,
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);
  await nutritionApi.setCustomFoodsResponse(SAMPLE_CUSTOM_FOODS);

  await page.goto("/nutrition");

  await expect(
    page.getByRole("button", { name: "Backup custom foods" })
  ).toBeEnabled();
});

test("hides the custom foods backup alert when the user has no custom foods", async ({
  page,
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);

  await page.goto("/nutrition");

  await expect(
    page.getByRole("tab", { name: "Food", selected: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Backup custom foods" })
  ).not.toBeVisible();
});
