import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { render, screen } from "@testing-library/react";

import ManageMeals from "@/app/settings/meals/manage-meals";
import type { ClientOnlyMeal } from "@/storage/meals";
import { mealsAtom } from "@/storage/meals";

jest.mock("@/config/units", () => ({
  useUnits: jest.fn(),
}));

jest.mock("@/components/nutrition/meal/meal-search", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/nutrition/meal/edit-meal", () => ({
  CreateOrEditMeal: () => null,
}));

jest.mock("@/storage/meals", () => {
  const actual = jest.requireActual("@/storage/meals");
  const { atom } = jest.requireActual("jotai");
  return {
    ...actual,
    mealsAtom: atom({ meals: [] }),
  };
});

function renderManageMeals(meals: ClientOnlyMeal[]) {
  const store = createStore();
  store.set(mealsAtom, { meals });
  const queryClient = new QueryClient();

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ManageMeals />
      </QueryClientProvider>
    </Provider>,
  );
}

function meal(food: ClientOnlyMeal["foods"][number]): ClientOnlyMeal {
  return {
    id: "meal-1",
    name: "Lunch",
    description: "",
    foods: [food],
  };
}

it("links to troubleshooting when a saved meal has a missing food name", async () => {
  renderManageMeals([
    meal({
      food: "users/me/dataTypes/food/dataPoints/food-1",
      serving: { amount: 1 },
    }),
  ]);

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(
    "Missing food names in the meal search? Go to the Troubleshooting page to fix",
  );
  expect(
    screen
      .getByRole("link", { name: "Troubleshooting page" })
      .getAttribute("href"),
  ).toBe("/settings/advanced");
});

it("does not show the troubleshooting alert when food names are cached", () => {
  renderManageMeals([
    meal({
      food: "users/me/dataTypes/food/dataPoints/food-1",
      cachedDisplayName: "Oatmeal",
      serving: { amount: 1 },
    }),
  ]);

  expect(screen.queryByRole("alert")).toBeNull();
});
