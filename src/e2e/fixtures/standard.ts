import { test as base } from "@playwright/test";

import { REQUESTED_SCOPES } from "@/config/google-health-scopes";

export const MOCK_DATE = "2021-02-01T10:00:00-0700";

const GRANTED_SCOPE = REQUESTED_SCOPES.join(" ");

function toBase64Url(value: object) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fakeIdToken() {
  return `${toBase64Url({ alg: "none", typ: "JWT" })}.${toBase64Url({
    sub: "e2e-user",
    exp: 9999999999,
  })}.sig`;
}

function fakeSessionToken() {
  return `${toBase64Url({ alg: "HS256", typ: "session+jwt" })}.${toBase64Url({
    sub: "e2e-user",
    iat: 1,
    exp: 9999999999,
  })}.sig`;
}

function googleIdentityStub(idToken: string) {
  return `
    window.google = window.google || {};
    window.google.accounts = window.google.accounts || {};
    window.google.accounts.id = {
      initialize(config) { this._callback = config.callback; },
      prompt() {
        const callback = this._callback;
        queueMicrotask(function () {
          callback && callback({ credential: ${JSON.stringify(idToken)} });
        });
      },
      cancel() {},
      disableAutoSelect() {},
      renderButton() {},
    };
    window.google.accounts.oauth2 = {
      initCodeClient() { return { requestCode() {} }; },
      revoke(_token, callback) { callback && callback(); },
    };
  `;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("https://api.fitbit.com/**", async (route) => {
      await route.fulfill({ status: 404 });
    });

    await page.route(
      "https://accounts.google.com/gsi/client**",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: googleIdentityStub(fakeIdToken()),
        });
      },
    );

    await page.route("**/auth/health/access", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "FAKE_ACCESS_TOKEN",
          expires_in: 3600,
          scope: GRANTED_SCOPE,
          encrypted_health_token: "e2e-encrypted-token",
        }),
      });
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
            { name: "auth:session-token", value: fakeSessionToken() },
            {
              name: "auth:encrypted-health-token",
              value: "e2e-encrypted-token",
            },
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
