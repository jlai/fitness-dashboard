import { test as base } from "@playwright/test";

import PageObjects from "../page-objects";

type PageObjectsFixture = {
  pageObjects: PageObjects;
};

export const test = base.extend<PageObjectsFixture>({
  pageObjects: async ({ page }, use) => {
    await use(new PageObjects(page));
  },
});
