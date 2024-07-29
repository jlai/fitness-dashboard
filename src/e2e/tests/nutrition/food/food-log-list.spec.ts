import { produce } from "immer";

import { BREAKFAST_FOOD_LOGS_RESPONSE } from "@/e2e/data/nutrition/food-log-list";
import { test, expect } from "@/e2e/fixtures";

test("can view logged foods", async ({ page, pageObjects, nutritionApi }) => {
  nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);

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
  nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);

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

  const updatedResponse = produce(BREAKFAST_FOOD_LOGS_RESPONSE, (draft) => {
    draft.foods = draft.foods.filter(
      (food) => food.loggedFood.name !== "Scrambled Eggs"
    );
  });
  nutritionApi.setFoodLogsResponse(updatedResponse);
  const confirmButton = page.getByRole("button", { name: "Delete" });

  await confirmButton.click();

  await expect(eggs).not.toBeVisible();
});

test("can move logged foods to another meal time", async ({
  page,
  pageObjects: { foodPage },
  nutritionApi,
}) => {
  nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);

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

  const updatedResponse = produce(BREAKFAST_FOOD_LOGS_RESPONSE, (draft) => {
    const eggs = draft.foods.find(
      (food) => food.loggedFood.name === "Scrambled Eggs"
    );
    eggs!.loggedFood.mealTypeId = 3;
  });
  nutritionApi.setFoodLogsResponse(updatedResponse);

  await confirmMoveButton.click();

  await expect(eggs).toBeVisible();

  // Check that it's in the right section now
  const tableRows = foodPage.foodLogSection.foodLogRows;
  const rowNameCells = tableRows.locator("td:first-child");

  const enoughRows = rowNameCells.locator("nth=4");
  await expect(enoughRows).toBeVisible();

  const rowNames = await rowNameCells.allInnerTexts();

  expect(rowNames).toEqual([
    "Breakfast",
    "Orange Juice",
    "Lunch",
    "Scrambled Eggs",
    "Total",
  ]);
});
