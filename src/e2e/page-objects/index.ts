import { Page } from "@playwright/test";

import FoodPage from "./app/nutrition/food.page";

export default class PageObjects {
  readonly foodPage = new FoodPage(this.page);

  constructor(private readonly page: Page) {}
}
