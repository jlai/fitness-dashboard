import { test as base } from "@playwright/test";

function encodeBase64URL(data: Record<string, string>) {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

/** Create a fake JWT token with no signature */
function encodeFakeToken(data: Record<string, string>) {
  return `${encodeBase64URL({ alg: "none", typ: "JWT" })}.${encodeBase64URL(
    data
  )}.`;
}

const TOKEN_STRING = JSON.stringify({
  accessToken: encodeFakeToken({
    scopes: "whr wnut wpro wsle wwei wact wloc",
  }),
  refreshToken: encodeFakeToken({}),
  expiresAt: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
});

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("https://api.fitbit.com/**", async (route) => {
      await route.fulfill({ status: 404 });
    });

    await page.clock.install({
      time: "2021-02-01T10:00:00-0700",
    });

    await use(page);
  },
  storageState: async ({}, use) => {
    await use({
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:3000",
          localStorage: [
            { name: "auth:fitbit-token", value: TOKEN_STRING },
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
