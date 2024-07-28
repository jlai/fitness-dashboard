import { BREAKFAST_FOODS_LOG_RESPONSE } from "@/e2e/data/nutrition/food-log-list";
import { test, expect } from "@/e2e/fixtures";

test("can view logged foods", async ({ page, pageObjects, nutritionApi }) => {
  await page.route("**/1/user/-/foods/log/date/*.json", async (route) => {
    await route.fulfill({ json: BREAKFAST_FOODS_LOG_RESPONSE });
  });

  nutritionApi.setFoodLogsResponse(BREAKFAST_FOODS_LOG_RESPONSE);

  await page.goto("/nutrition");

  // Food tab should be selected by default
  const foodTab = page.getByRole("tab", { name: "Food", selected: true });
  await expect(foodTab).toBeVisible();

  // Has total calories
  await expect(pageObjects.foodPage.calorieTotal).toContainText("260 Calories");

  // Contains expected foods
  const eggs = page.getByText("Scrambled Eggs");
  await expect(eggs).toBeVisible();

  const orangeJuice = page.getByText("Orange Juice");
  await expect(orangeJuice).toBeVisible();
});
