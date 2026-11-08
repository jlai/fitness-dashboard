import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { Suspense } from "react";

import * as datapoints from "@/api/datapoints";
import ManageFavoriteFoods from "@/app/settings/foods/favorite/page";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import {
  getMemorySettingsStorage,
  resetSettingsStorageSingletonsForTests,
  SETTINGS_STORAGE_KEYS,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";

jest.mock("@/storage/settings", () => {
  const { atom } = jest.requireActual("jotai");
  return { macroGoalsAtom: atom({}) };
});

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  getDataPoint: jest.fn(),
}));
jest.mock("@/utils/log-error", () => ({ logError: jest.fn() }));

jest.mock("@/components/nutrition/label/nutrition-popover", () => ({
  __esModule: true,
  default: () => null,
  ShowLabelAction: () => null,
}));

jest.mock("@/components/nutrition/food/food-search", () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (food: object) => void }) => (
    <>
      <button
        onClick={() =>
          onChange({
            foodId: "local-123",
            name: "Local food",
            accessLevel: "PRIVATE",
            calories: 0,
            units: [],
          })
        }
      >
        Choose local food
      </button>
      <button
        onClick={() =>
          onChange({
            foodId: "recent-log:log-123",
            sourceNutritionLogName: "log-123",
            name: "Homemade soup",
            accessLevel: "PRIVATE",
            calories: 200,
            units: [],
          })
        }
      >
        Choose anonymous food
      </button>
    </>
  ),
}));

jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    rows,
    onRowSelectionModelChange,
  }: {
    rows: Array<{ foodId: string; name: string }>;
    onRowSelectionModelChange: (rows: string[]) => void;
  }) => (
    <div>
      {rows.map((row) => (
        <button
          key={row.foodId}
          onClick={() => onRowSelectionModelChange([row.foodId])}
        >
          {row.name}
        </button>
      ))}
    </div>
  ),
}));

describe("favorite foods management", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
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
      clientOnlyFavoriteFoods: [],
    });
  });

  it("allows removing an unavailable favorite", async () => {
    jest
      .mocked(datapoints.getDataPoint)
      .mockRejectedValue(new Error("offline"));
    await getDefaultStore().set(clientOnlyFavoriteFoodsAtom, {
      clientOnlyFavoriteFoods: [{ foodId: "public-123" }],
    });
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <Suspense fallback="Loading">
            <ManageFavoriteFoods />
          </Suspense>
        </QueryClientProvider>,
      );
    });
    expect(await screen.findByText(/could not be loaded/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Unavailable food (public-123)" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove favorites" }));
    await waitFor(async () => {
      expect(await getDefaultStore().get(clientOnlyFavoriteFoodsAtom)).toEqual({
        clientOnlyFavoriteFoods: [],
      });
    });
  });

  it("adds without duplicates and removes favorite foods", async () => {
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <Suspense fallback="Loading">
            <ManageFavoriteFoods />
          </Suspense>
        </QueryClientProvider>,
      );
    });
    expect(
      await screen.findByText(/not synced with the Google Health app/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose local food" }));
    fireEvent.click(screen.getByRole("button", { name: "Add favorite food" }));
    expect(
      await screen.findByRole("button", { name: "Local food" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add favorite food" }));
    await waitFor(async () => {
      expect(
        await getMemorySettingsStorage().get(
          SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods,
        ),
      ).toMatchObject({
        data: { clientOnlyFavoriteFoods: [{ foodId: "local-123" }] },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Local food" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove favorites" }));
    await waitFor(async () => {
      expect(await getDefaultStore().get(clientOnlyFavoriteFoodsAtom)).toEqual({
        clientOnlyFavoriteFoods: [],
      });
    });
  });

  it("saves an anonymous recent food locally before favoriting it", async () => {
    jest
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("12345678-1234-4123-8123-123456789abc");
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <Suspense fallback="Loading">
            <ManageFavoriteFoods />
          </Suspense>
        </QueryClientProvider>,
      );
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Choose anonymous food" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add favorite food" }));
    expect(
      await screen.findByRole("button", { name: "Homemade soup" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add favorite food" }));
    await waitFor(async () => {
      const { clientOnlyFavoriteFoods } = await getDefaultStore().get(
        clientOnlyFavoriteFoodsAtom,
      );
      const { clientOnlyFoods } =
        await getDefaultStore().get(clientOnlyFoodsAtom);
      expect(clientOnlyFavoriteFoods).toEqual([
        { foodId: "12345678-1234-4123-8123-123456789abc" },
      ]);
      expect(clientOnlyFoods).toHaveLength(2);
      expect(clientOnlyFoods[1]).toMatchObject({
        name: "users/me/dataTypes/food/dataPoints/12345678-1234-4123-8123-123456789abc",
        food: { displayName: "Homemade soup", energyAvg: { kcal: 200 } },
      });
    });
    jest.restoreAllMocks();
  });
});
