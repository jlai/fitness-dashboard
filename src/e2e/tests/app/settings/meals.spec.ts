import { Page } from "@playwright/test";

import { Meal } from "@/api/nutrition";
import { BREAKFAST_FOOD_LOGS_RESPONSE, SCRAMBLED_EGGS } from "@/e2e/data/nutrition/food-log-list";
import { expect, test } from "@/e2e/fixtures";

const SAMPLE_MEALS: Array<Meal> = [
  {
    id: "1001",
    name: "Breakfast Plate",
    description: "Eggs",
    mealFoods: [{ ...SCRAMBLED_EGGS, amount: 1 }],
  },
];

async function readStoredMeals(page: Page) {
  return page.evaluate(() => {
    return new Promise<Array<Meal>>((resolve, reject) => {
      const request = indexedDB.open("FitbitMigrationDB");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("meals", "readonly");
        const store = tx.objectStore("meals");
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result);
        getAll.onerror = () => reject(getAll.error);
      };
    });
  });
}

test("can backup meals to local storage", async ({
  page,
  pageObjects: { toasts },
  nutritionApi,
  userApi,
}) => {
  await nutritionApi.setMealsResponse(SAMPLE_MEALS);

  await page.goto("/settings/meals");

  const saveButton = page.getByRole("button", {
    name: "Backup meals",
  });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(toasts.successToasts).toHaveText(/Saved 1 meal/);

  const storedMeals = await readStoredMeals(page);
  expect(storedMeals).toEqual(SAMPLE_MEALS);
});

test("shows the meal backup alert on the log meals tab", async ({
  page,
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);
  await nutritionApi.setMealsResponse(SAMPLE_MEALS);

  await page.goto("/nutrition");

  const mealTab = page.getByRole("tab", { name: "Meal" });
  await expect(mealTab).toBeVisible();
  await mealTab.click();

  await expect(
    page.getByRole("button", { name: "Backup meals" })
  ).toBeEnabled();
});

test("hides the meal backup alert when the user has no meals", async ({
  page,
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);

  await page.goto("/nutrition");

  const mealTab = page.getByRole("tab", { name: "Meal" });
  await expect(mealTab).toBeVisible();
  await mealTab.click();
  await expect(page.getByRole("tab", { name: "Meal", selected: true })).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Backup meals" })
  ).not.toBeVisible();
});
