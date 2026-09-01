import { produce } from "immer";
import dayjs from "dayjs";

import { NutritionLogMealType } from "@generated/orval/fetch/google-health-api/models";

import { BREAKFAST_NUTRITION_LOGS } from "@/e2e/data/nutrition/food-log-list";
import { test, expect } from "@/e2e/fixtures";

test("can view logged foods", async ({ page, pageObjects, nutritionApi }) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_NUTRITION_LOGS);

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

test("can delete logged foods", async ({
  page,
  pageObjects: { foodPage },
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_NUTRITION_LOGS);

  await page.goto("/nutrition");

  // Contains expected foods
  const eggs = page.getByText("Scrambled Eggs");
  await expect(eggs).toBeVisible();

  const orangeJuice = page.getByText("Orange Juice");
  await expect(orangeJuice).toBeVisible();

  // Select scrambled eggs
  const eggsCheckbox = page.getByRole("checkbox", { name: "Scrambled Eggs" });
  await eggsCheckbox.click();

  await expect(eggsCheckbox).toBeChecked();
  await expect(foodPage.deleteSelectedButton).toBeEnabled();

  await foodPage.deleteSelectedButton.click();

  const updatedResponse = produce(BREAKFAST_NUTRITION_LOGS, (draft) => {
    const remaining = draft.filter(
      (food) => food.nutritionLog?.foodDisplayName !== "Scrambled Eggs",
    );
    draft.splice(0, draft.length, ...remaining);
  });
  await nutritionApi.setFoodLogsResponse(updatedResponse);
  const confirmButton = page.getByRole("button", { name: "Delete" });

  await confirmButton.click();

  await expect(eggs).not.toBeVisible();
});

test("can move logged foods to another meal time", async ({
  page,
  pageObjects: { foodPage },
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_NUTRITION_LOGS);

  await page.goto("/nutrition");

  // Contains expected foods
  const eggs = page.getByText("Scrambled Eggs");
  const orangeJuice = page.getByText("Orange Juice");

  await expect(eggs).toBeVisible();
  await expect(orangeJuice).toBeVisible();

  // Select scrambled eggs
  const eggsCheckbox = page.getByRole("checkbox", { name: "Scrambled Eggs" });
  await eggsCheckbox.click();

  await expect(eggsCheckbox).toBeChecked();
  await expect(foodPage.moveSelectedButton).toBeEnabled();

  await foodPage.moveSelectedButton.click();

  const moveDialog = page.getByRole("dialog");
  const whenField = moveDialog.getByLabel("when");
  const lunchOption = page.getByRole("option", { name: "Lunch" });
  const confirmMoveButton = page.getByRole("button", { name: "Move" });

  // Click meal time
  await expect(moveDialog).toBeVisible();
  await expect(whenField).toBeVisible();
  await whenField.click();
  await lunchOption.click();

  const updatedResponse = produce(BREAKFAST_NUTRITION_LOGS, (draft) => {
    const eggs = draft.find(
      (food) => food.nutritionLog?.foodDisplayName === "Scrambled Eggs",
    );
    eggs!.nutritionLog!.mealType = NutritionLogMealType.LUNCH;
  });
  await nutritionApi.setFoodLogsResponse(updatedResponse);

  await confirmMoveButton.click();

  await expect(eggs).toBeVisible();

  // Check that it's in the right section now
  const tableRows = foodPage.foodLogSection.foodLogRows;
  const rowNameCells = tableRows.locator("td:first-child");

  const enoughRows = rowNameCells.locator("nth=4");
  await expect(enoughRows).toBeVisible();

  const rowNames = await rowNameCells.allInnerTexts();

  expect(rowNames.map((name) => name.trim())).toEqual([
    "Breakfast",
    "Orange Juice",
    "Lunch",
    "Scrambled Eggs",
    "Total",
  ]);
});

test("can favorite logged foods", async ({
  page,
  pageObjects: { foodPage },
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_NUTRITION_LOGS);

  await page.goto("/nutrition");

  // Contains expected foods
  const eggs = page.getByText("Scrambled Eggs");
  await expect(eggs).toBeVisible();

  const orangeJuice = page.getByText("Orange Juice");
  await expect(orangeJuice).toBeVisible();

  // Select scrambled eggs
  const eggsCheckbox = page.getByRole("checkbox", { name: "Scrambled Eggs" });
  await eggsCheckbox.click();

  await expect(eggsCheckbox).toBeChecked();

  const addToFavoritesPromise = nutritionApi.waitForAddToFavorites("80850");

  // Open more actions menu and click add to favorites
  await foodPage.openMoreActionsMenu();
  await expect(foodPage.addToFavoritesAction).toBeVisible();

  // Favorite list APIs are stubbed, so the UI stays on "add".
  await foodPage.addToFavoritesAction.click();
  await addToFavoritesPromise;
});

test("can copy logged foods to another day", async ({
  page,
  pageObjects: { foodPage, toasts },
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_NUTRITION_LOGS);

  await page.goto("/nutrition");

  // Contains expected foods
  const eggs = page.getByText("Scrambled Eggs");
  await expect(eggs).toBeVisible();

  const orangeJuice = page.getByText("Orange Juice");
  await expect(orangeJuice).toBeVisible();

  // Select scrambled eggs
  const eggsCheckbox = page.getByRole("checkbox", { name: "Scrambled Eggs" });
  await eggsCheckbox.click();

  await expect(eggsCheckbox).toBeChecked();
  await expect(foodPage.copySelectedButton).toBeEnabled();

  await foodPage.copySelectedButton.click();

  const copyDialog = page.getByRole("dialog");
  const dateField = copyDialog.getByLabel("To date");
  const confirmCopyButton = page.getByRole("button", { name: "Copy" });

  // Set date to tomorrow using dayjs
  const tomorrow = dayjs(Date.now()).add(1, "day");
  await dateField.fill(tomorrow.format("MM/DD/YYYY"));

  const updatedResponse = [
    {
      ...BREAKFAST_NUTRITION_LOGS[0]!,
      name: "users/me/dataTypes/nutrition-log/dataPoints/3",
    },
  ];
  await nutritionApi.setFoodLogsResponse(updatedResponse);

  await confirmCopyButton.click();

  // Check for success message
  await expect(toasts.successToasts).toHaveText(/Copied food logs/);

  // Navigate to tomorrow to see the copied food
  const nextDayButton = page.getByRole("button", { name: "Next day" });
  await nextDayButton.click();

  // Verify the food was copied to the next day
  const copiedEggs = page.getByText("Scrambled Eggs");
  await expect(copiedEggs).toBeVisible();
});
