import { QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { getDataPoint } from "@/api/datapoints";
import {
  buildMealDetailsQuery,
  buildCreateMealMutation,
  buildMealsQuery,
  refreshMealDescriptions,
} from "@/api/nutrition/meals";
import { foodResourceName } from "@/api/nutrition/food-log";
import {
  clientOnlyFoodsAtom,
  type FoodTemplate,
} from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";
import {
  getMemorySettingsStorage,
  resetSettingsStorageSingletonsForTests,
  SETTINGS_STORAGE_KEYS,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  getDataPoint: jest.fn(),
}));

const mockGetDataPoint = jest.mocked(getDataPoint);

beforeEach(() => {
  mockGetDataPoint.mockReset();
});

it("persists an anonymous recent food as a local food when saving a meal", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  await store.set(clientOnlyFoodsAtom, { clientOnlyFoods: [] });
  await store.set(mealsAtom, { meals: [] });
  const client = new QueryClient();
  const saved = await client
    .getMutationCache()
    .build(client, buildCreateMealMutation(client))
    .execute({
      id: "meal-123",
      name: "Lunch",
      description: "",
      mealFoods: [
        {
          foodId: "recent-log:log-123",
          sourceNutritionLogName: "log-123",
          name: "Soup",
          accessLevel: "PRIVATE",
          calories: 200,
          nutritionalValues: { protein: 20 },
          defaultServingSize: 2,
          units: [],
          amount: 2,
        },
      ],
    });
  expect(saved.mealFoods[0].foodId).not.toContain("recent-log:");
  expect(saved.mealFoods[0].cachedDisplayName).toBe("Soup");
  const { meals } = await store.get(mealsAtom);
  expect(meals[0].foods[0].cachedDisplayName).toBe("Soup");
  const [summary] = await client.fetchQuery(buildMealsQuery());
  expect(summary.foodNames).toEqual(["Soup"]);
  expect(mockGetDataPoint).not.toHaveBeenCalled();

  const meal = await client.fetchQuery(buildMealDetailsQuery(summary.id));
  expect(meal.mealFoods[0]).toMatchObject({
    foodId: saved.mealFoods[0].foodId,
    name: "Soup",
    cachedDisplayName: "Soup",
    accessLevel: "PRIVATE",
    calories: 200,
    nutritionalValues: { protein: 20 },
    amount: 2,
  });
});

it("marks a meal food as missing when its server food returns 404", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  await store.set(clientOnlyFoodsAtom, { clientOnlyFoods: [] });
  await store.set(mealsAtom, {
    meals: [
      {
        id: "meal-404",
        name: "Lunch",
        description: "",
        foods: [
          {
            food: foodResourceName("abcd"),
            serving: { amount: 1 },
          },
        ],
      },
    ],
  });
  mockGetDataPoint.mockRejectedValue(
    Object.assign(new Error("Not found"), { status: 404 }),
  );

  const client = new QueryClient();
  const [summary] = await client.fetchQuery(buildMealsQuery());
  expect(summary.foodNames).toEqual([]);
  expect(mockGetDataPoint).not.toHaveBeenCalled();

  const meal = await client.fetchQuery(buildMealDetailsQuery(summary.id));

  expect(mockGetDataPoint).toHaveBeenCalledWith("food", "abcd");
  expect(meal.mealFoods[0]).toMatchObject({
    name: "abcd",
    foodNotFound: true,
  });
});

it("resolves food templates locally without requesting their IDs from the server", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  await store.set(clientOnlyFoodsAtom, {
    clientOnlyFoods: [
      {
        id: "123e4567-e89b-42d3-a456-426614174000",
        food: {
          displayName: "Oatmeal",
          accessLevel: "FOOD_ACCESS_LEVEL_PRIVATE",
          energyAvg: { kcal: 150 },
          totalCarbohydrate: { grams: 27 },
          totalFat: { grams: 3 },
        },
      } as FoodTemplate,
    ],
  });
  await store.set(mealsAtom, {
    meals: [
      {
        id: "meal-template",
        name: "Breakfast",
        description: "",
        foods: [
          {
            food: "foodTemplate:123e4567-e89b-42d3-a456-426614174000",
            serving: { amount: 2 },
          },
          {
            food: "foodTemplate:123e4567-e89b-42d3-a456-426614174001",
            serving: { amount: 1 },
          },
        ],
      },
    ],
  });

  const meal = await new QueryClient().fetchQuery(
    buildMealDetailsQuery("meal-template"),
  );

  expect(mockGetDataPoint).not.toHaveBeenCalled();
  expect(meal.mealFoods).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        foodId: "123e4567-e89b-42d3-a456-426614174000",
        name: "Oatmeal",
        accessLevel: "PRIVATE",
        calories: 150,
        nutritionalValues: expect.objectContaining({
          calories: 150,
          carbs: 27,
          fat: 3,
        }),
        amount: 2,
      }),
      expect.objectContaining({
        foodId: "123e4567-e89b-42d3-a456-426614174001",
        foodNotFound: true,
      }),
    ]),
  );
});

it("refreshes missing meal food names and preserves newer meal edits", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  const queryClient = new QueryClient();
  store.set(queryClientAtom, queryClient);
  await store.set(mealsAtom, {
    meals: [
      {
        id: "meal-refresh",
        name: "Lunch",
        description: "",
        foods: [
          { food: foodResourceName("abcd"), serving: { amount: 1 } },
          { food: foodResourceName("efgh"), serving: { amount: 1 } },
        ],
      },
    ],
  });
  queryClient.setQueryData(["meals"], []);
  mockGetDataPoint.mockImplementation(async (_type, foodId) => {
    await store.set(mealsAtom, (current) => ({
      meals: current.meals.map((meal) =>
        meal.id === "meal-refresh" ? { ...meal, name: "Updated lunch" } : meal,
      ),
    }));
    if (foodId === "efgh") {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    return {
      name: foodResourceName(foodId),
      food: { displayName: "Oatmeal" },
    };
  });

  const result = await refreshMealDescriptions();

  expect(result).toEqual({ updated: 2, failed: 0, remaining: 0 });
  expect(mockGetDataPoint).toHaveBeenCalledTimes(2);
  expect((await store.get(mealsAtom)).meals[0]).toMatchObject({
    name: "Updated lunch",
    foods: [
      { cachedDisplayName: "Oatmeal" },
      { cachedDisplayName: "[missing]" },
    ],
  });
  expect(queryClient.getQueryState(["meals"])?.isInvalidated).toBe(true);
});

it("refreshes names from local food templates without fetching template ids", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  store.set(queryClientAtom, new QueryClient());
  await store.set(clientOnlyFoodsAtom, {
    clientOnlyFoods: [
      {
        id: "123e4567-e89b-42d3-a456-426614174000",
        food: {
          displayName: "Oatmeal",
          accessLevel: "FOOD_ACCESS_LEVEL_PRIVATE",
        },
      } as FoodTemplate,
    ],
  });
  await store.set(mealsAtom, {
    meals: [
      {
        id: "meal-template-refresh",
        name: "Breakfast",
        description: "",
        foods: [
          {
            food: "foodTemplate:123e4567-e89b-42d3-a456-426614174000",
            serving: { amount: 1 },
          },
          {
            food: "foodTemplate:123e4567-e89b-42d3-a456-426614174001",
            serving: { amount: 1 },
          },
        ],
      },
    ],
  });

  const result = await refreshMealDescriptions();

  expect(result).toEqual({ updated: 1, failed: 0, remaining: 0 });
  expect(mockGetDataPoint).not.toHaveBeenCalled();
  expect((await store.get(mealsAtom)).meals[0].foods).toEqual([
    {
      food: "foodTemplate:123e4567-e89b-42d3-a456-426614174000",
      serving: { amount: 1 },
      cachedDisplayName: "Oatmeal",
    },
    {
      food: "foodTemplate:123e4567-e89b-42d3-a456-426614174001",
      serving: { amount: 1 },
    },
  ]);
});

it("requests no more than 50 distinct missing meal foods at a time", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  store.set(queryClientAtom, new QueryClient());
  await store.set(mealsAtom, {
    meals: [
      {
        id: "meal-limit",
        name: "Meal",
        description: "",
        foods: Array.from({ length: 51 }, (_, index) => ({
          food: foodResourceName(`food-${String(index).padStart(3, "0")}`),
          serving: { amount: 1 },
        })),
      },
    ],
  });
  mockGetDataPoint.mockImplementation(async (_type, foodId) => ({
    name: foodResourceName(foodId),
    food: { displayName: "Food" },
  }));

  const result = await refreshMealDescriptions();

  expect(mockGetDataPoint).toHaveBeenCalledTimes(50);
  expect(result).toEqual({ updated: 50, failed: 0, remaining: 1 });
});

it("resolves legacy meal food templates while migrating stored settings", async () => {
  resetSettingsStorageSingletonsForTests();
  const store = getDefaultStore();
  store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  const storage = getMemorySettingsStorage();
  storage.seedSync(
    SETTINGS_STORAGE_KEYS.clientOnlyFoods,
    {
      clientOnlyFoods: [
        {
          name: "users/me/dataTypes/food/dataPoints/local-123",
          food: {
            displayName: "Oatmeal",
            accessLevel: "FOOD_ACCESS_LEVEL_PRIVATE",
          },
        },
      ],
    },
    1,
  );
  storage.seedSync(
    SETTINGS_STORAGE_KEYS.meals,
    {
      meals: [
        {
          id: "meal-template",
          name: "Breakfast",
          description: "",
          foods: [{ foodId: "local-123", serving: { amount: 1 } }],
        },
      ],
    },
    1,
  );

  const originalGet = storage.get.bind(storage);
  let firstFoodRead = true;
  jest.spyOn(storage, "get").mockImplementation(async (key) => {
    const result = await originalGet(key);
    if (key === SETTINGS_STORAGE_KEYS.clientOnlyFoods && firstFoodRead) {
      firstFoodRead = false;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return result;
  });

  const meal = await new QueryClient().fetchQuery(
    buildMealDetailsQuery("meal-template"),
  );

  expect(meal.mealFoods[0]).toMatchObject({
    name: "Oatmeal",
    accessLevel: "PRIVATE",
  });
  expect(mockGetDataPoint).not.toHaveBeenCalled();
});
