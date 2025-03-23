import { Page } from "@playwright/test";

import FoodPage from "./app/nutrition/food.page";
import Toasts from "./app/toasts";

export default class PageObjects {
  readonly toasts = new Toasts(this.page);
  readonly foodPage = new FoodPage(this.page);

  constructor(private readonly page: Page) {}
}
