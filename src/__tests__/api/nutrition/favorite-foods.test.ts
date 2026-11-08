import { QueryClient } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { FoodAccessLevel } from "@generated/orval/fetch/google-health-api/models";

import * as datapoints from "@/api/datapoints";
import { buildFavoriteFoodsQuery } from "@/api/nutrition/search";
import type { FoodDataPoint } from "@/api/nutrition/helpers";
import { logError } from "@/utils/log-error";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
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
jest.mock("@/utils/log-error", () => ({ logError: jest.fn() }));

const localFood: FoodDataPoint = {
  name: "users/me/dataTypes/food/dataPoints/local-123",
  food: {
    displayName: "Local food",
    accessLevel: FoodAccessLevel.FOOD_ACCESS_LEVEL_PRIVATE,
  },
};
const remoteFood: FoodDataPoint = {
  name: "users/me/dataTypes/food/dataPoints/public-123",
  food: {
    displayName: "Public food",
    accessLevel: FoodAccessLevel.FOOD_ACCESS_LEVEL_PUBLIC,
  },
};

describe("favorite foods", () => {
  beforeEach(() => {
    resetSettingsStorageSingletonsForTests();
    getDefaultStore().set(settingsStorageEpochAtom, (epoch) => epoch + 1);
  });

  afterEach(() => jest.resetAllMocks());

  it("persists object entries and reloads them after a storage epoch change", async () => {
    const store = getDefaultStore();
    expect(await store.get(clientOnlyFavoriteFoodsAtom)).toEqual({
      clientOnlyFavoriteFoods: [],
    });
    await store.set(clientOnlyFavoriteFoodsAtom, {
      clientOnlyFavoriteFoods: [{ foodId: "local-123", note: "keep me" }],
    });
    expect(
      await getMemorySettingsStorage().get(
        SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods,
      ),
    ).toMatchObject({
      data: {
        clientOnlyFavoriteFoods: [{ foodId: "local-123", note: "keep me" }],
      },
    });
    store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
    expect(await store.get(clientOnlyFavoriteFoodsAtom)).toEqual({
      clientOnlyFavoriteFoods: [{ foodId: "local-123", note: "keep me" }],
    });
  });

  it("resolves local foods and fetches catalog foods in favorite order", async () => {
    const getFood = jest
      .mocked(datapoints.getDataPoint)
      .mockResolvedValue(remoteFood);
    const foods = await new QueryClient().fetchQuery(
      buildFavoriteFoodsQuery(["public-123", "local-123"], [localFood], 0),
    );
    expect(foods.map(({ foodId, name }) => ({ foodId, name }))).toEqual([
      { foodId: "public-123", name: "Public food" },
      { foodId: "local-123", name: "Local food" },
    ]);
    expect(getFood).toHaveBeenCalledTimes(1);
    expect(getFood).toHaveBeenCalledWith("food", "public-123");
  });

  it("reports invalid IDs and catalog failures instead of hiding them", async () => {
    const getFood = jest
      .mocked(datapoints.getDataPoint)
      .mockRejectedValue(new Error("offline"));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await expect(
      client.fetchQuery(buildFavoriteFoodsQuery(["../bad"], [], 0)),
    ).rejects.toThrow("Invalid favorite food ID");
    expect(getFood).not.toHaveBeenCalled();
    await expect(
      client.fetchQuery(buildFavoriteFoodsQuery(["public-123"], [], 0)),
    ).resolves.toMatchObject([{ foodId: "public-123", unavailable: true }]);
    expect(logError).toHaveBeenCalledWith(
      "Failed to load a favorite food",
      expect.objectContaining({ message: "offline" }),
    );
  });
});
