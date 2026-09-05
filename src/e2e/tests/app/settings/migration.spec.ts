import { readFile } from "fs/promises";

import { Page } from "@playwright/test";

import { Food, FoodUnit, Meal } from "@/api/nutrition";
import {
  BREAKFAST_FOOD_LOGS_RESPONSE,
  SCRAMBLED_EGGS,
} from "@/e2e/data/nutrition/food-log-list";
import { expect, test } from "@/e2e/fixtures";
import type {
  MigrationFood,
  MigrationGoal,
  MigrationMeal,
} from "@/storage/db/fitbitmigrationdb";

const FOOD_UNITS: Array<FoodUnit> = [
  { id: 304, name: "serving", plural: "servings" },
  { id: 226, name: "g", plural: "g" },
  { id: 180, name: "oz", plural: "oz" },
  { id: 147, name: "lb", plural: "lb" },
  { id: 389, name: "cup", plural: "cups" },
];

const SAMPLE_CUSTOM_FOODS = [
  {
    ...SCRAMBLED_EGGS,
    foodId: 9001,
    accessLevel: "PRIVATE" as const,
    name: "Homemade Scramble",
    creatorEncodedId: "ABC123",
  },
];

const SAMPLE_MEALS: Array<Meal> = [
  {
    id: "1001",
    name: "Breakfast Plate",
    description: "Eggs",
    mealFoods: [
      { ...SCRAMBLED_EGGS, amount: 1, creatorEncodedId: "DEF456" } as Meal["mealFoods"][number],
    ],
  },
];

const CUSTOM_FOOD_NUTRITION = {
  calories: 147,
  protein: 10.55,
  sodium: 339,
};

const MEAL_FOOD_NUTRITION = {
  calories: 147,
  protein: 10,
};

function preparedFood(
  food: Food,
  nutritionalValues?: Food["nutritionalValues"]
): MigrationFood {
  const unitsById = new Map(FOOD_UNITS.map((unit) => [unit.id, unit]));
  const { creatorEncodedId: _creatorEncodedId, units, ...rest } = food as Food & {
    creatorEncodedId?: string;
  };

  return {
    ...rest,
    units: units.map((unitId) => unitsById.get(unitId)!),
    nutritionalValues,
  };
}

const EXPECTED_CUSTOM_FOODS = [
  preparedFood(SAMPLE_CUSTOM_FOODS[0], CUSTOM_FOOD_NUTRITION),
];

const EXPECTED_MEALS: Array<MigrationMeal> = [
  {
    id: "1001",
    name: "Breakfast Plate",
    description: "Eggs",
    mealFoods: [
      {
        ...preparedFood(SAMPLE_MEALS[0].mealFoods[0], MEAL_FOOD_NUTRITION),
        amount: 1,
      },
    ],
  },
];

const SAMPLE_DAILY_ACTIVITY_GOALS = {
  activeMinutes: 55,
  activeZoneMinutes: 21,
  caloriesOut: 3500,
  distance: 5,
  floors: 10,
  steps: 10000,
};

const SAMPLE_WEEKLY_ACTIVITY_GOALS = {
  activeZoneMinutes: 150,
  distance: 56.33,
  floors: 70,
  steps: 70000,
};

const EXPECTED_GOALS: Array<MigrationGoal> = [
  { metric: "steps", period: "daily", value: 10000 },
  { metric: "floors", period: "daily", value: 10 },
  { metric: "distance", period: "daily", value: 5, units: "kilometers" },
  {
    metric: "caloriesOut",
    period: "daily",
    value: 3500,
    units: "kilocalories",
  },
  { metric: "activeMinutes", period: "daily", value: 55, units: "minutes" },
  {
    metric: "activeZoneMinutes",
    period: "daily",
    value: 21,
    units: "minutes",
  },
  { metric: "steps", period: "weekly", value: 70000 },
  { metric: "floors", period: "weekly", value: 70 },
  {
    metric: "distance",
    period: "weekly",
    value: 56.33,
    units: "kilometers",
  },
  {
    metric: "activeZoneMinutes",
    period: "weekly",
    value: 150,
    units: "minutes",
  },
  {
    metric: "waterVolume",
    period: "daily",
    value: 2000,
    units: "milliliters",
  },
  { metric: "sleep", period: "daily", value: 480, units: "minutes" },
  { metric: "weight", period: "target", value: 70, units: "kilograms" },
];

function byGoalKey(a: MigrationGoal, b: MigrationGoal) {
  return `${a.metric}:${a.period}`.localeCompare(`${b.metric}:${b.period}`);
}

async function readStore<T>(page: Page, storeName: string) {
  return page.evaluate((name) => {
    return new Promise<Array<T>>((resolve, reject) => {
      const request = indexedDB.open("FitbitMigrationDB");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(name, "readonly");
        const store = tx.objectStore(name);
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result);
        getAll.onerror = () => reject(getAll.error);
      };
    });
  }, storeName);
}

test("can backup selected meals and custom foods", async ({
  page,
  pageObjects: { toasts },
  nutritionApi,
}) => {
  await nutritionApi.setCustomFoodsResponse(SAMPLE_CUSTOM_FOODS);
  await nutritionApi.setMealsResponse(SAMPLE_MEALS);
  await nutritionApi.setFoodResponse({
    ...SAMPLE_CUSTOM_FOODS[0],
    nutritionalValues: CUSTOM_FOOD_NUTRITION,
  });
  await nutritionApi.setFoodResponse({
    ...SCRAMBLED_EGGS,
    nutritionalValues: MEAL_FOOD_NUTRITION,
  });

  await page.goto("/settings/migration");

  await expect(page.getByRole("gridcell", { name: "Homemade Scramble" })).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Homemade Scramble/ }).getByRole("gridcell", { name: "147" })
  ).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "Breakfast Plate" })).toBeVisible();

  await expect(
    page.getByRole("row", { name: /Homemade Scramble/ }).getByRole("checkbox")
  ).toBeChecked();
  await expect(
    page.getByRole("row", { name: /Breakfast Plate/ }).getByRole("checkbox")
  ).toBeChecked();

  const backupButton = page.getByRole("button", { name: "Backup selected" });
  await expect(backupButton).toBeEnabled();
  await backupButton.click();

  await expect(toasts.successToasts).toHaveText(
    /Saved 1 custom food and 1 meal/
  );

  expect(await readStore<MigrationFood>(page, "customFoods")).toEqual(
    EXPECTED_CUSTOM_FOODS
  );
  expect(await readStore<MigrationMeal>(page, "meals")).toEqual(EXPECTED_MEALS);
});

test("can backup only checked rows", async ({
  page,
  pageObjects: { toasts },
  nutritionApi,
}) => {
  await nutritionApi.setCustomFoodsResponse(SAMPLE_CUSTOM_FOODS);
  await nutritionApi.setMealsResponse(SAMPLE_MEALS);
  await nutritionApi.setFoodResponse({
    ...SCRAMBLED_EGGS,
    nutritionalValues: MEAL_FOOD_NUTRITION,
  });

  await page.goto("/settings/migration");

  await page
    .getByRole("row", { name: /Homemade Scramble/ })
    .getByRole("checkbox")
    .uncheck();

  await page.getByRole("button", { name: "Backup selected" }).click();

  await expect(toasts.successToasts).toHaveText(/Saved 1 meal/);

  expect(await readStore<MigrationMeal>(page, "meals")).toEqual(EXPECTED_MEALS);
});

test("can backup goals with daily, weekly, and target periods", async ({
  page,
  pageObjects: { toasts },
  nutritionApi,
  timeSeriesApi,
  sleepApi,
  weightApi,
}) => {
  await timeSeriesApi.setDailyActivityGoalsResponse(SAMPLE_DAILY_ACTIVITY_GOALS);
  await timeSeriesApi.setWeeklyActivityGoalsResponse(
    SAMPLE_WEEKLY_ACTIVITY_GOALS
  );
  await nutritionApi.setWaterGoalResponse(2000);
  await sleepApi.setSleepGoalResponse(480);
  await weightApi.setWeightGoalResponse(70);

  await page.goto("/settings/migration");

  await expect(page.getByRole("gridcell", { name: "waterVolume" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "kilometers" }).first()).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "target" })).toBeVisible();

  await page.getByRole("button", { name: "Backup selected" }).click();

  await expect(toasts.successToasts).toHaveText(/Saved 13 goals/);

  const storedGoals = await readStore<MigrationGoal>(page, "goals");
  expect([...storedGoals].sort(byGoalKey)).toEqual(
    [...EXPECTED_GOALS].sort(byGoalKey)
  );
});

test("can save selected migration data as a JSON file", async ({
  page,
  pageObjects: { toasts },
  nutritionApi,
  timeSeriesApi,
  sleepApi,
  weightApi,
}) => {
  await nutritionApi.setCustomFoodsResponse(SAMPLE_CUSTOM_FOODS);
  await nutritionApi.setMealsResponse(SAMPLE_MEALS);
  await nutritionApi.setFoodResponse({
    ...SAMPLE_CUSTOM_FOODS[0],
    nutritionalValues: CUSTOM_FOOD_NUTRITION,
  });
  await nutritionApi.setFoodResponse({
    ...SCRAMBLED_EGGS,
    nutritionalValues: MEAL_FOOD_NUTRITION,
  });
  await timeSeriesApi.setDailyActivityGoalsResponse(SAMPLE_DAILY_ACTIVITY_GOALS);
  await timeSeriesApi.setWeeklyActivityGoalsResponse(
    SAMPLE_WEEKLY_ACTIVITY_GOALS
  );
  await nutritionApi.setWaterGoalResponse(2000);
  await sleepApi.setSleepGoalResponse(480);
  await weightApi.setWeightGoalResponse(70);

  await page.goto("/settings/migration");

  await expect(page.getByRole("gridcell", { name: "Homemade Scramble" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "waterVolume" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save JSON file" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("fitbit-migration.json");
  await expect(toasts.successToasts).toHaveText(/Downloaded JSON file/);

  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const parsed = JSON.parse(await readFile(filePath!, "utf8"));

  expect(parsed.customFoods).toEqual(EXPECTED_CUSTOM_FOODS);
  expect(parsed.meals).toEqual(EXPECTED_MEALS);
  expect([...parsed.goals].sort(byGoalKey)).toEqual(
    [...EXPECTED_GOALS].sort(byGoalKey)
  );
});

test("disables backup when there is nothing to save", async ({
  page,
  nutritionApi,
}) => {
  await nutritionApi.setFoodLogsResponse(BREAKFAST_FOOD_LOGS_RESPONSE);

  await page.goto("/settings/migration");

  await expect(
    page.getByRole("button", { name: "Backup selected" })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save JSON file" })
  ).toBeDisabled();
});
