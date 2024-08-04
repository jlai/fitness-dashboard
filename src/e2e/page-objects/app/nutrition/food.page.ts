import { Page, expect } from "@playwright/test";

export default class FoodPage {
  readonly calorieTotal = this.page.getByLabel("total calories for day");
  readonly deleteSelectedButton = this.page.getByRole("button", {
    name: /Delete/i,
  });
  readonly moveSelectedButton = this.page.getByRole("button", {
    name: /Move/i,
  });
  readonly copySelectedButton = this.page.getByRole("button", {
    name: /Copy/i,
  });
  readonly moreActionsButton = this.page.getByRole("button", {
    name: "more actions",
  });
  readonly addToFavoritesAction = this.page.getByRole("menuitem", {
    name: "Add to favorites",
  });
  readonly removeFromFavoritesAction = this.page.getByRole("menuitem", {
    name: "Remove from favorites",
  });

  readonly foodLogSection = new FoodLogSection(this.page);

  constructor(private readonly page: Page) {}

  async selectFood() {
    const foodSearch = this.page.getByPlaceholder("Type to search");
    await expect(foodSearch).toBeVisible();

    const openFoodSearch = this.page.getByLabel("Open", { exact: true });
    await openFoodSearch.click();
  }

  async openMoreActionsMenu() {
    await this.moreActionsButton.click();
  }
}

export class FoodLogSection {
  readonly section = this.page.getByRole("region", { name: "Logged foods" });
  readonly foodLogRows = this.section.getByRole("row");

  constructor(private readonly page: Page) {}
}
