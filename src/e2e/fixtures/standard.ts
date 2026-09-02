import { test as base } from "@playwright/test";

import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

export const MOCK_DATE = "2021-02-01T10:00:00-0700";

const TOKEN_STRING = JSON.stringify({
  accessToken: "FAKE_ACCESS_TOKEN",
  expiresAt: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  scope: REQUESTED_SCOPES.join(" "),
});

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("https://api.fitbit.com/**", async (route) => {
      await route.fulfill({ status: 404 });
    });

    await page.clock.install({
      time: MOCK_DATE,
    });

    await use(page);
  },
  storageState: async ({}, use) => {
    await use({
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:3100",
          localStorage: [
            { name: "auth:google-token", value: TOKEN_STRING },
            { name: "units:distance", value: '"DISTANCE_UNIT_MILES"' },
            { name: "units:swim", value: '"SWIM_UNIT_YARDS"' },
            {
              name: "units:temperature",
              value: '"TEMPERATURE_UNIT_FAHRENHEIT"',
            },
            { name: "units:water", value: '"WATER_UNIT_FL_OZ"' },
            { name: "units:weight", value: '"WEIGHT_UNIT_POUNDS"' },
          ],
        },
      ],
    });
  },
});

export { expect } from "@playwright/test";
