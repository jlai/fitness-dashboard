import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Meal, MealSummary } from "@/api/nutrition";
import CreateMealLog from "@/components/nutrition/meal/create-meal-log";
import { buildMealDetailsQuery } from "@/api/nutrition";

const mockMeal: Meal = {
  id: "meal-123",
  name: "Lunch",
  description: "",
  mealFoods: [
    {
      accessLevel: "PUBLIC",
      foodId: "food-123",
      name: "Sandwich",
      calories: 400,
      units: [],
      amount: 1,
      unit: { id: "304", name: "serving", plural: "servings" },
    },
  ],
};

const mockMealSummary: MealSummary = {
  id: mockMeal.id,
  name: mockMeal.name,
  description: mockMeal.description,
  foodNames: ["Sandwich"],
};

jest.mock("@/api/nutrition", () => ({
  ...jest.requireActual("@/api/nutrition"),
  buildMealDetailsQuery: jest.fn((id: string) => ({
    queryKey: ["meals", "detail", id],
    queryFn: () => Promise.resolve(mockMeal),
  })),
}));

jest.mock("@/components/nutrition/meal/meal-search", () => ({
  SearchMealsElement: ({ disabled }: { disabled?: boolean }) => {
    const { createElement } = jest.requireActual("react");
    const { useController } = jest.requireActual("react-hook-form");
    const { field } = useController({ name: "meal" });
    return createElement(
      "button",
      {
        type: "button",
        disabled,
        onClick: () => field.onChange(mockMealSummary),
      },
      "Select meal",
    );
  },
}));

jest.mock("@/components/nutrition/meal/edit-meal", () => ({
  MealFoodListEditor: () => {
    const { createElement } = jest.requireActual("react");
    const { useWatch } = jest.requireActual("react-hook-form");
    const foods = useWatch({ name: "foods" }) ?? [];
    return createElement("div", null, `Queued foods: ${foods.length}`);
  },
}));

describe("CreateMealLog meal editor", () => {
  function renderMealLog() {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <CreateMealLog />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads the selected meal into the temporary food queue", async () => {
    renderMealLog();

    fireEvent.click(screen.getByRole("button", { name: "Select meal" }));
    fireEvent.click(screen.getByRole("button", { name: "Adjust meal" }));

    expect(await screen.findByText("Queued foods: 1")).toBeTruthy();
    expect(buildMealDetailsQuery).toHaveBeenCalledWith(mockMeal.id);
    expect(
      screen
        .getByRole("button", { name: "Adjust meal" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      (screen.getByRole("button", { name: "Select meal" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Adjust meal" }));

    expect(
      (screen.getByRole("button", { name: "Select meal" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("starts with an empty queue when no meal is selected", async () => {
    renderMealLog();

    fireEvent.click(screen.getByRole("button", { name: "Adjust meal" }));

    expect(await screen.findByText("Queued foods: 0")).toBeTruthy();
    expect(buildMealDetailsQuery).not.toHaveBeenCalled();
  });
});
