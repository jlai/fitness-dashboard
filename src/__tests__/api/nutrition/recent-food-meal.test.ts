import { QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";

import { getDataPoint } from "@/api/datapoints";
import {
  buildCreateMealMutation,
  buildMealsQuery,
} from "@/api/nutrition/meals";
import { foodResourceName } from "@/api/nutrition/food-log";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";
import {
  resetSettingsStorageSingletonsForTests,
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
  const [meal] = await client.fetchQuery(buildMealsQuery());
  expect(meal.mealFoods[0]).toMatchObject({
    foodId: saved.mealFoods[0].foodId,
    name: "Soup",
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

  const [meal] = await new QueryClient().fetchQuery(buildMealsQuery());

  expect(mockGetDataPoint).toHaveBeenCalledWith("food", "abcd");
  expect(meal.mealFoods[0]).toMatchObject({
    name: "abcd",
    foodNotFound: true,
  });
});
