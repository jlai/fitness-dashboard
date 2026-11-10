import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { MealSummary } from "@/api/nutrition";
import SearchMeals from "@/components/nutrition/meal/meal-search";

it("uses a meal food's cached display name in search results", async () => {
  const client = new QueryClient();
  const meal: MealSummary = {
    id: "meal-123",
    name: "Lunch",
    description: "",
    foodNames: ["Saved food name"],
  };
  client.setQueryData(["meals"], [meal]);

  render(
    <QueryClientProvider client={client}>
      <SearchMeals value={null} onChange={jest.fn()} />
    </QueryClientProvider>,
  );

  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Select a meal" }));

  expect(await screen.findByText("Saved food name")).toBeTruthy();
  expect(screen.queryByText("Current food name")).toBeNull();
});
