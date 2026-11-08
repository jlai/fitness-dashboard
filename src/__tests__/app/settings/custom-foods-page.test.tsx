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

import ManageCustomFoods from "@/app/settings/foods/custom/page";
import { deleteCustomFoods } from "@/app/settings/foods/custom/delete-custom-foods";
import {
  buildClientOnlyFoodsQuery,
  buildFavoriteFoodsQuery,
  buildMealsQuery,
  nutritionLogFromMealFood,
} from "@/api/nutrition";
import { NutritionLogMealType } from "@generated/orval/fetch/google-health-api/models";
import { usePopupState } from "material-ui-popup-state/hooks";
import SearchFoods from "@/components/nutrition/food/food-search";
import NutritionPopover, {
  nutritionPopoverFoodAtom,
  ShowLabelAction,
} from "@/components/nutrition/label/nutrition-popover";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { mealsAtom } from "@/storage/meals";
import {
  DEFAULT_FDA_MACRO_GOALS,
  showNutritionLabelAtom,
} from "@/storage/settings";
import * as datapoints from "@/api/datapoints";
import {
  getMemorySettingsStorage,
  resetSettingsStorageSingletonsForTests,
  SETTINGS_STORAGE_KEYS,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";

const name = "users/me/dataTypes/food/dataPoints/local-123";
const mockConfirm = jest.fn();
const mockToastError = jest.fn();

jest.mock("material-ui-confirm", () => ({
  useConfirm: () => mockConfirm,
}));
jest.mock("mui-sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
  },
}));
jest.mock("@mui/x-data-grid", () => ({
  GridActionsCellItem: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button aria-label={label} onClick={onClick}>
      {label}
    </button>
  ),
  DataGrid: ({
    rows,
    columns,
    rowSelectionModel,
    onRowSelectionModelChange,
  }: {
    rows: Array<{ foodId: string; name: string; brand?: string }>;
    columns: Array<{
      field: string;
      getActions?: (params: {
        id: string;
        row: { foodId: string; name: string };
      }) => React.ReactNode[];
    }>;
    rowSelectionModel: string[];
    onRowSelectionModelChange: (selection: string[]) => void;
  }) => (
    <div>
      {rows.map((row) => (
        <div key={row.foodId}>
          <label>
            <input
              type="checkbox"
              checked={rowSelectionModel.includes(row.foodId)}
              onChange={(event) =>
                onRowSelectionModelChange(
                  event.target.checked
                    ? [...rowSelectionModel, row.foodId]
                    : rowSelectionModel.filter((id) => id !== row.foodId),
                )
              }
            />
            {row.name}
          </label>
          {row.brand}
          {columns
            .find((column) => column.field === "actions")
            ?.getActions?.({ id: row.foodId, row })}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  listDataPointsPage: jest.fn().mockResolvedValue({ dataPoints: [] }),
  getDataPoint: jest.fn(),
}));

async function renderPage(client: QueryClient) {
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <Suspense fallback="Loading">
          <ManageCustomFoods />
        </Suspense>
      </QueryClientProvider>,
    );
  });
}

describe("Dashboard custom food editor", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockConfirm.mockResolvedValue({ confirmed: true });
    resetSettingsStorageSingletonsForTests();
    const store = getDefaultStore();
    store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
    await store.set(clientOnlyFoodsAtom, {
      clientOnlyFoods: [
        {
          name,
          food: {
            displayName: "Soup",
            brand: "Brand",
            description: "Original",
            accessLevel: "FOOD_ACCESS_LEVEL_PRIVATE",
            defaultServing: {
              amount: 1,
              foodMeasurementUnitDisplayName: "bowl",
            },
            servings: [
              { amount: 1, foodMeasurementUnitDisplayName: "bowl" },
              {
                amount: 0.5,
                foodMeasurementUnitDisplayName: "bowl",
                multiplier: 0.5,
              },
            ],
            energyAvg: { kcal: 200 },
            totalCarbohydrate: { grams: 15 },
            nutrients: [
              { nutrient: "SODIUM", quantity: { grams: 0.25 } },
              { nutrient: "CAFFEINE", quantity: { grams: 0.02 } },
            ],
          },
        },
      ],
    });
    await store.set(clientOnlyFavoriteFoodsAtom, {
      clientOnlyFavoriteFoods: [{ foodId: "local-123" }],
    });
    await store.set(mealsAtom, {
      meals: [
        {
          id: "meal-123",
          name: "Lunch",
          description: "",
          foods: [{ foodId: "local-123", serving: { amount: 1 } }],
        },
      ],
    });
    await store.set(showNutritionLabelAtom, false);
  });

  it("saves edits without losing other data and refreshes saved meals and favorites", async () => {
    const client = new QueryClient();
    await client.fetchQuery(buildMealsQuery());
    await renderPage(client);
    fireEvent.click(screen.getByRole("button", { name: "Edit Soup" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Detailed nutrition" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: /Food name/ }), {
      target: { value: "New soup" },
    });
    fireEvent.change(screen.getByLabelText("Calories (kcal)"), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText("Carbohydrates (g)"), {
      target: { value: "22" },
    });
    fireEvent.change(screen.getByLabelText("Sodium (mg)"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(async () => {
      expect(
        await getMemorySettingsStorage().get(
          SETTINGS_STORAGE_KEYS.clientOnlyFoods,
        ),
      ).toMatchObject({
        data: {
          clientOnlyFoods: [
            {
              name,
              food: {
                displayName: "New soup",
                brand: "Brand",
                description: "Original",
                defaultServing: {
                  amount: 1,
                  foodMeasurementUnitDisplayName: "bowl",
                },
                energyAvg: { kcal: 150 },
                totalCarbohydrate: { grams: 22 },
                nutrients: [
                  { nutrient: "CAFFEINE", quantity: { grams: 0.02 } },
                  { nutrient: "SODIUM", quantity: { grams: 0.3 } },
                ],
              },
            },
          ],
        },
      });
    });
    const store = getDefaultStore();
    const { clientOnlyFoods } = await store.get(clientOnlyFoodsAtom);
    const favorites = await client.fetchQuery(
      buildFavoriteFoodsQuery(["local-123"], clientOnlyFoods, 0),
    );
    const meals = await client.fetchQuery(buildMealsQuery());
    expect(favorites[0].name).toBe("New soup");
    expect(meals[0].mealFoods[0]).toMatchObject({
      name: "New soup",
      calories: 150,
    });
  });

  it("rejects invalid names and shows an empty state when no foods exist", async () => {
    const client = new QueryClient();
    await renderPage(client);
    fireEvent.click(screen.getByRole("button", { name: "Edit Soup" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: /Food name/ }),
      {
        target: { value: "   " },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Enter a food name")).toBeTruthy();
    expect(
      (await getDefaultStore().get(clientOnlyFoodsAtom)).clientOnlyFoods[0].food
        .displayName,
    ).toBe("Soup");
    await act(async () => {
      await getDefaultStore().set(clientOnlyFoodsAtom, { clientOnlyFoods: [] });
    });
    expect(
      screen.getByText("There are no Dashboard custom foods to edit."),
    ).toBeTruthy();
  });

  it("can clear optional nutrients and update the default serving", async () => {
    await renderPage(new QueryClient());
    fireEvent.click(screen.getByRole("button", { name: "Edit Soup" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Detailed nutrition" }),
    );
    fireEvent.change(screen.getByLabelText("Sodium (mg)"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Default serving amount"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(async () => {
      const { clientOnlyFoods } =
        await getDefaultStore().get(clientOnlyFoodsAtom);
      expect(clientOnlyFoods[0].food.defaultServing).toEqual({
        amount: 2,
        foodMeasurementUnitDisplayName: "bowl",
      });
      expect(clientOnlyFoods[0].food.servings).toEqual([
        { amount: 1, foodMeasurementUnitDisplayName: "bowl" },
        {
          amount: 0.5,
          foodMeasurementUnitDisplayName: "bowl",
          multiplier: 0.5,
        },
      ]);
      expect(clientOnlyFoods[0].food.nutrients).toEqual([
        { nutrient: "CAFFEINE", quantity: { grams: 0.02 } },
      ]);
    });
  });

  it("creates a food from an empty list that can be searched and logged", async () => {
    const uuid = "12345678-1234-4123-8123-123456789abc";
    const uuidSpy = jest.spyOn(crypto, "randomUUID").mockReturnValue(uuid);
    const store = getDefaultStore();
    await store.set(clientOnlyFoodsAtom, { clientOnlyFoods: [] });
    const client = new QueryClient();
    await client.fetchQuery(buildClientOnlyFoodsQuery());
    await renderPage(client);
    fireEvent.click(screen.getByRole("button", { name: "Create new food" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: /Food name/ }),
      {
        target: { value: "  Oatmeal  " },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: /^Serving unit(?: \*)?$/ }),
      {
        target: { value: "bowl" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: /Serving unit \(plural\)/ }),
      {
        target: { value: "bowls" },
      },
    );
    fireEvent.change(screen.getByLabelText(/Default serving amount/), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Calories (kcal)"), {
      target: { value: "240" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Detailed nutrition" }));
    fireEvent.change(screen.getByLabelText("Protein (g)"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Sodium (mg)"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create food" }));
    expect(
      await screen.findByRole("button", { name: "Edit Oatmeal" }),
    ).toBeTruthy();
    const stored = await getMemorySettingsStorage().get(
      SETTINGS_STORAGE_KEYS.clientOnlyFoods,
    );
    expect(stored).toMatchObject({
      data: {
        clientOnlyFoods: [
          {
            name: `users/me/dataTypes/food/dataPoints/${uuid}`,
            food: {
              displayName: "Oatmeal",
              accessLevel: "FOOD_ACCESS_LEVEL_PRIVATE",
              defaultServing: {
                amount: 2,
                foodMeasurementUnitDisplayName: "bowl",
                foodMeasurementUnitDisplayNamePlural: "bowls",
              },
              energyAvg: { kcal: 240 },
              nutrients: [
                { nutrient: "PROTEIN", quantity: { grams: 8 } },
                { nutrient: "SODIUM", quantity: { grams: 0.3 } },
              ],
            },
          },
        ],
      },
    });
    await act(async () => {
      store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
    });
    const [food] = await client.fetchQuery(buildClientOnlyFoodsQuery());
    expect(food).toMatchObject({
      foodId: uuid,
      name: "Oatmeal",
      accessLevel: "PRIVATE",
      defaultServingSize: 2,
      defaultUnit: { name: "bowl", plural: "bowls" },
      servings: [{ servingSize: 2, unit: { name: "bowl" } }],
    });
    expect(
      nutritionLogFromMealFood(
        { ...food, amount: 1 },
        NutritionLogMealType.BREAKFAST,
      ),
    ).toMatchObject({
      foodDisplayName: "Oatmeal",
      energy: { kcal: 120 },
      nutrients: [
        { nutrient: "PROTEIN", quantity: { grams: 4 } },
        { nutrient: "SODIUM", quantity: { grams: 0.15 } },
      ],
    });
    await act(async () => {
      render(
        <QueryClientProvider client={client}>
          <Suspense fallback="Loading search">
            <SearchFoods value={null} />
          </Suspense>
        </QueryClientProvider>,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("option", { name: /Oatmeal/ })).toBeTruthy();
    uuidSpy.mockRestore();
  });

  it("requires a valid name, serving amount, and serving unit when creating", async () => {
    await renderPage(new QueryClient());
    fireEvent.click(screen.getByRole("button", { name: "Create new food" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: /Food name/ }),
      {
        target: { value: " " },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: /^Serving unit(?: \*)?$/ }),
      {
        target: { value: " " },
      },
    );
    fireEvent.change(screen.getByLabelText(/Default serving amount/), {
      target: { value: "0" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Create food" }).closest("form")!,
    );
    expect(await screen.findByText("Enter a food name")).toBeTruthy();
    expect(screen.getByText("Enter a serving unit")).toBeTruthy();
    expect(screen.getByText("Enter a positive number")).toBeTruthy();
    expect(
      (await getDefaultStore().get(clientOnlyFoodsAtom)).clientOnlyFoods,
    ).toHaveLength(1);
  });

  it("shows a live nutrition preview and discards a cancelled draft", async () => {
    await getDefaultStore().set(showNutritionLabelAtom, true);
    await renderPage(new QueryClient());
    fireEvent.click(screen.getByRole("button", { name: "Edit Soup" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Detailed nutrition" }),
    );
    expect(screen.getByText("Nutrition Facts")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Calories (kcal)"), {
      target: { value: "123" },
    });
    expect(screen.getByText("123")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      (await getDefaultStore().get(clientOnlyFoodsAtom)).clientOnlyFoods[0].food
        .energyAvg?.kcal,
    ).toBe(200);
  });

  it("opens local nutrition facts without a remote food request", async () => {
    const getFood = jest.mocked(datapoints.getDataPoint);
    await renderPage(new QueryClient());
    fireEvent.click(screen.getByRole("button", { name: "Nutrition facts" }));
    expect(await screen.findByText("Nutrition Facts")).toBeTruthy();
    expect(getFood).not.toHaveBeenCalled();
  });

  it("still fetches nutrition details for remote food actions", async () => {
    const getFood = jest.mocked(datapoints.getDataPoint).mockResolvedValue({
      name: "users/me/dataTypes/food/dataPoints/public-123",
      food: {
        displayName: "Catalog",
        defaultServing: {
          amount: 1,
          foodMeasurementUnitDisplayName: "serving",
        },
        energyAvg: { kcal: 100 },
      },
    });
    function RemoteLabel() {
      const popupState = usePopupState({
        popupId: "remote-test",
        variant: "popper",
      });
      return (
        <>
          <ShowLabelAction
            food={{
              foodId: "public-123",
              name: "Catalog",
              calories: 100,
              accessLevel: "PUBLIC",
              units: [],
            }}
            popupState={popupState}
          />
          <NutritionPopover
            macroGoals={DEFAULT_FDA_MACRO_GOALS}
            popupState={popupState}
          />
        </>
      );
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RemoteLabel />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nutrition facts" }));
    expect(getDefaultStore().get(nutritionPopoverFoodAtom).foodId).toBe(
      "public-123",
    );
    await waitFor(() =>
      expect(getFood).toHaveBeenCalledWith("food", "public-123"),
    );
    expect(await screen.findByText("Nutrition Facts")).toBeTruthy();
  });

  it("blocks the entire selection if any food is used in a meal", async () => {
    const store = getDefaultStore();
    await store.set(clientOnlyFoodsAtom, (prev) => ({
      clientOnlyFoods: [
        ...prev.clientOnlyFoods,
        {
          name: "users/me/dataTypes/food/dataPoints/local-456",
          food: {
            displayName: "Rice",
            accessLevel: "FOOD_ACCESS_LEVEL_PRIVATE",
          },
        },
      ],
    }));
    await store.set(clientOnlyFavoriteFoodsAtom, {
      clientOnlyFavoriteFoods: [
        { foodId: "local-123" },
        { foodId: "local-456" },
      ],
    });
    await renderPage(new QueryClient());
    fireEvent.click(screen.getByRole("checkbox", { name: "Soup" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Rice" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete custom foods" }),
    );
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("Lunch"),
      ),
    );
    expect((await store.get(clientOnlyFoodsAtom)).clientOnlyFoods).toHaveLength(
      2,
    );
    expect(
      (await store.get(clientOnlyFavoriteFoodsAtom)).clientOnlyFavoriteFoods,
    ).toHaveLength(2);
  });

  it("only deletes confirmed foods and removes their favorite references", async () => {
    const store = getDefaultStore();
    await store.set(mealsAtom, { meals: [] });
    const client = new QueryClient();
    await client.fetchQuery(buildClientOnlyFoodsQuery());
    const invalidate = jest.spyOn(client, "invalidateQueries");
    await renderPage(client);
    fireEvent.click(screen.getByRole("checkbox", { name: "Soup" }));
    mockConfirm.mockResolvedValueOnce({ confirmed: false });
    fireEvent.click(
      screen.getByRole("button", { name: "Delete custom foods" }),
    );
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect((await store.get(clientOnlyFoodsAtom)).clientOnlyFoods).toHaveLength(
      1,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete custom foods" }),
    );
    await waitFor(async () =>
      expect(
        (await store.get(clientOnlyFoodsAtom)).clientOnlyFoods,
      ).toHaveLength(0),
    );
    expect(
      (await store.get(clientOnlyFavoriteFoodsAtom)).clientOnlyFavoriteFoods,
    ).toHaveLength(0);
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["client-only-foods"],
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["favorite-foods"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["meals"] });
    });
    expect(await client.fetchQuery(buildClientOnlyFoodsQuery())).toEqual([]);
    expect(
      screen
        .getByRole("button", { name: "Delete custom foods" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("reports partial deletion failure and permits a retry", async () => {
    const store = getDefaultStore();
    await store.set(mealsAtom, { meals: [] });
    const storage = getMemorySettingsStorage();
    const originalSet = storage.set.bind(storage);
    const spy = jest
      .spyOn(storage, "set")
      .mockImplementation(async (key, data, version) => {
        if (key === SETTINGS_STORAGE_KEYS.clientOnlyFoods)
          throw new Error("storage offline");
        return originalSet(key, data, version);
      });

    await expect(deleteCustomFoods(["local-123"])).rejects.toThrow(
      "Favorite removal completed, but the foods could not be deleted",
    );
    expect((await store.get(clientOnlyFoodsAtom)).clientOnlyFoods).toHaveLength(
      1,
    );
    expect(
      (await store.get(clientOnlyFavoriteFoodsAtom)).clientOnlyFavoriteFoods,
    ).toHaveLength(0);
    spy.mockRestore();
    await expect(deleteCustomFoods(["local-123"])).resolves.toEqual([]);
    expect((await store.get(clientOnlyFoodsAtom)).clientOnlyFoods).toHaveLength(
      0,
    );
  });

  it("does not delete foods if removing favorites fails", async () => {
    const store = getDefaultStore();
    await store.set(mealsAtom, { meals: [] });
    const storage = getMemorySettingsStorage();
    const originalSet = storage.set.bind(storage);
    jest
      .spyOn(storage, "set")
      .mockImplementation(async (key, data, version) => {
        if (key === SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods)
          throw new Error("storage offline");
        return originalSet(key, data, version);
      });
    await expect(deleteCustomFoods(["local-123"])).rejects.toThrow(
      "storage offline",
    );
    expect((await store.get(clientOnlyFoodsAtom)).clientOnlyFoods).toHaveLength(
      1,
    );
    expect(
      (await store.get(clientOnlyFavoriteFoodsAtom)).clientOnlyFavoriteFoods,
    ).toHaveLength(1);
  });
});
