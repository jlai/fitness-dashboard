import { test as base, Page } from "@playwright/test";

import { Device } from "@/api/devices";

export class DevicesApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    const page = this.page;

    await page.route("**/1/user/-/devices.json", async (route) => {
      await route.fulfill({
        json: [],
      });
    });
  }

  async setDevicesResponse(response: Readonly<Device[]>, date = "*") {
    await this.page.route(`**/1/user/-/devices.json`, async (route) => {
      await route.fulfill({ json: response });
    });
  }
}

type DevicesApiFixture = {
  devicesApi: DevicesApi;
};

export const test = base.extend<DevicesApiFixture>({
  devicesApi: async ({ page }, use) => {
    const api = new DevicesApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
