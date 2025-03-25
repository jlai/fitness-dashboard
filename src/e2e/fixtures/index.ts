import { mergeTests } from "@playwright/test";

import { test as standardTest } from "./standard";
import { test as nutritionApiTest } from "./api/nutrition.api";
import { test as intradayApiTest } from "./api/intraday.api";
import { test as devicesApiTest } from "./api/devices.api";
import { test as pageObjectsTest } from "./page-objects";
import { test as dashboardTest } from "./dashboard";
import { test as weightApiTest } from "./api/weight.api";
import { test as userApiTest } from "./api/user.api";
import { test as timeSeriesApiTest } from "./api/timeseries.api";

export const test = mergeTests(
  standardTest,
  intradayApiTest,
  nutritionApiTest,
  devicesApiTest,
  pageObjectsTest,
  dashboardTest,
  weightApiTest,
  userApiTest,
  timeSeriesApiTest
);
export { expect } from "@playwright/test";
