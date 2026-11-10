import { QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import { getDataPoint } from "@/api/datapoints";
import {
  buildMealDetailsQuery,
  buildCreateMealMutation,
  buildMealsQuery,
} from "@/api/nutrition/meals";
import { foodResourceName } from "@/api/nutrition/food-log";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
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
