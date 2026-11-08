import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { Suspense } from "react";

import * as datapoints from "@/api/datapoints";
import SearchFoods from "@/components/nutrition/food/food-search";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import {
  resetSettingsStorageSingletonsForTests,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  getDataPoint: jest.fn(),
}));

describe("favorite foods in food search", () => {
  it("offers and labels both local and catalog favorites", async () => {
    resetSettingsStorageSingletonsForTests();
    const store = getDefaultStore();
    store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
    await store.set(clientOnlyFoodsAtom, {
      clientOnlyFoods: [
        {
          name: "users/me/dataTypes/food/dataPoints/local-123",
          food: { displayName: "Local food" },
        },
      ],
    });
    await store.set(clientOnlyFavoriteFoodsAtom, {
      clientOnlyFavoriteFoods: [
        { foodId: "local-123" },
        { foodId: "public-123" },
      ],
    });
    jest.mocked(datapoints.getDataPoint).mockResolvedValue({
      name: "users/me/dataTypes/food/dataPoints/public-123",
      food: { displayName: "Catalog food" },
    });
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <Suspense fallback="Loading">
            <SearchFoods value={null} />
          </Suspense>
        </QueryClientProvider>,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Catalog food")).toBeTruthy();
    expect(screen.getByText("Local food")).toBeTruthy();
    expect(screen.getAllByText("Favorite")).toHaveLength(2);
  });
});
