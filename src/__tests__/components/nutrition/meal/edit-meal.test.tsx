import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { Suspense } from "react";

import * as datapoints from "@/api/datapoints";
import { EditMeal } from "@/components/nutrition/meal/edit-meal";
import { nutritionPopoverFoodAtom } from "@/components/nutrition/label/nutrition-popover";
import type { Meal } from "@/api/nutrition";
import {
  resetSettingsStorageSingletonsForTests,
  settingsStorageEpochAtom,
} from "@/storage/settings-storage";

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  listDataPointsPage: jest.fn().mockResolvedValue({ dataPoints: [] }),
}));
jest.mock("@/components/nutrition/food/food-search", () => ({
  __esModule: true,
  default: () => {
    const { createElement } = jest.requireActual("react");
    return createElement("input", { "aria-label": "Select a food" });
  },
}));
jest.mock("@/components/nutrition/food/serving-size", () => ({
  FoodServingSizeInput: () => null,
}));

describe("EditMeal missing-food recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSettingsStorageSingletonsForTests();
    const store = getDefaultStore();
    store.set(settingsStorageEpochAtom, (epoch) => epoch + 1);
    jest
      .mocked(datapoints.listDataPointsPage)
      .mockResolvedValue({ dataPoints: [] });
  });

  it("shows the warning before delete and reveals replacement options", async () => {
    const meal: Meal = {
      id: "meal-123",
      name: "Lunch",
      description: "",
      mealFoods: [
        {
          accessLevel: "PUBLIC",
          foodId: "missing-food",
          name: "missing-food",
          calories: 0,
          units: [],
          amount: 1,
          unit: { id: "304", name: "serving", plural: "servings" },
          foodNotFound: true,
        },
      ],
    };

    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <Suspense fallback="Loading">
            <EditMeal
              draftMeal={meal}
              onDeleteMeal={jest.fn()}
              onSaveMeal={jest.fn()}
            />
          </Suspense>
        </QueryClientProvider>,
      );
    });

    const warningButton = await screen.findByRole("button", {
      name: "Replace missing food",
    });
    const buttons = warningButton.parentElement?.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons?.[0]).toBe(warningButton);
    expect(screen.getAllByLabelText("Select a food")).toHaveLength(1);

    fireEvent.click(warningButton);

    expect(
      await screen.findByText(
        "The associated food could not be found. Replace with another food?",
      ),
    ).toBeTruthy();
    expect(screen.getAllByLabelText("Select a food")).toHaveLength(2);
    const templateSection = screen.getByText(
      "Create a new food template",
    ).parentElement;
    if (!templateSection) {
      throw new Error("Missing food template section");
    }
    const templateFields = within(templateSection);
    expect(templateFields.getByLabelText(/Name/)).toBeTruthy();
    expect(templateFields.getByLabelText(/Calories/)).toBeTruthy();
    expect(templateFields.queryByLabelText(/Brand/)).toBeNull();
    expect(templateFields.queryByLabelText(/Description/)).toBeNull();
  });

  it("uses the resolved meal food for its nutrition label", async () => {
    const meal: Meal = {
      id: "meal-123",
      name: "Breakfast",
      description: "",
      mealFoods: [
        {
          accessLevel: "PRIVATE",
          foodId: "local-123",
          name: "Oatmeal",
          calories: 150,
          nutritionalValues: { calories: 150, protein: 5 },
          units: [],
          amount: 1,
          unit: { id: "304", name: "serving", plural: "servings" },
        },
      ],
    };

    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <Suspense fallback="Loading">
            <EditMeal
              draftMeal={meal}
              onDeleteMeal={jest.fn()}
              onSaveMeal={jest.fn()}
            />
          </Suspense>
        </QueryClientProvider>,
      );
    });

    fireEvent.click(screen.getByTitle("Nutrition facts"));

    expect(getDefaultStore().get(nutritionPopoverFoodAtom)).toMatchObject({
      food: meal.mealFoods[0],
    });
  });

  it.each([
    { units: ["serving", "gram"], multipliers: [1, 1], warns: true },
    { units: ["serving", "gram"], multipliers: [1, 0.01], warns: false },
    { units: ["serving", "gram"], multipliers: [1, undefined], warns: false },
    { units: ["serving"], multipliers: [1], warns: false },
    { units: ["serving", "serving"], multipliers: [1, 1], warns: false },
    { units: [], multipliers: [], warns: false },
  ])(
    "checks serving multipliers: $units / $multipliers",
    async ({ units, multipliers, warns }) => {
      const meal: Meal = {
        id: "meal-123",
        name: "Lunch",
        description: "",
        mealFoods: [
          {
            accessLevel: "PRIVATE",
            foodId: "template-123",
            name: "Oatmeal",
            calories: 150,
            amount: 1,
            units,
            servings: units.map((id, index) => ({
              unit: { id, name: id, plural: id },
              servingSize: 1,
              multiplier: multipliers[index],
            })),
          },
        ],
      };

      await act(async () => {
        render(
          <QueryClientProvider client={new QueryClient()}>
            <Suspense fallback="Loading">
              <EditMeal
                draftMeal={meal}
                onDeleteMeal={jest.fn()}
                onSaveMeal={jest.fn()}
              />
            </Suspense>
          </QueryClientProvider>,
        );
      });

      const warningButton = screen.queryByRole("button", {
        name: "Incorrect serving size",
      });
      expect(Boolean(warningButton)).toBe(warns);
      expect(screen.getByTitle("Nutrition facts")).toBeTruthy();
      const warningText =
        "This food template might have been corrupted during migration but we do not have enough information to tell for sure. Exercise caution and consider replacing it in any meals and using a food from the Google Health database instead.";
      expect(screen.queryByText(warningText)).toBeNull();
      if (warningButton) {
        fireEvent.click(warningButton);
        expect(await screen.findByText(warningText)).toBeTruthy();
        expect(
          screen.getByRole("button", { name: "Replace food" }),
        ).toBeTruthy();
        expect(screen.queryByText("Create a new food template")).toBeNull();
        fireEvent.click(warningButton);
        expect(screen.queryByText(warningText)).toBeNull();
      }
    },
  );
});
