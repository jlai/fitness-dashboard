import { test as base } from "@playwright/test";

import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

export const MOCK_DATE = "2021-02-01T10:00:00-0700";

const TOKEN_STRING = JSON.stringify({
  accessToken: "FAKE_ACCESS_TOKEN",
  expiresAt: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  scope: REQUESTED_SCOPES.join(" "),
  userId: "FAKE_USER_ID",
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
            { name: "unit:distance", value: "en_US" },
            { name: "unit:water", value: "en_US" },
            { name: "unit:weight", value: "en_US" },
          ],
        },
      ],
    });
  },
});

export { expect } from "@playwright/test";
