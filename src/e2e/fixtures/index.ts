import { mergeTests } from "@playwright/test";

import { test as standardTest } from "./standard";
import { test as nutritionApiTest } from "./api/nutrition.api";
import { test as pageObjectsTest } from "./page-objects";

export const test = mergeTests(standardTest, nutritionApiTest, pageObjectsTest);
export { expect } from "@playwright/test";
