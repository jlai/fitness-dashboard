import { Page, expect } from "@playwright/test";

export default class FoodPage {
  readonly calorieTotal = this.page.getByLabel("total calories for day");

  constructor(private readonly page: Page) {}

  async selectFood() {
    const foodSearch = this.page.getByPlaceholder("Type to search");
    expect(foodSearch).toBeVisible();

    const openFoodSearch = this.page.getByLabel("Open", { exact: true });
    await openFoodSearch.click();
  }
}
