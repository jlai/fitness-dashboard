import { test as base, Page } from "@playwright/test";

import { PairedDevice } from "@/api/devices";

const PAIRED_DEVICES_URL = "**/v4/users/*/pairedDevices**";

export class DevicesApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.setDevicesResponse([]);
  }

  async setDevicesResponse(pairedDevices: Readonly<PairedDevice[]>) {
    await this.page.route(PAIRED_DEVICES_URL, async (route) => {
      await route.fulfill({ json: { pairedDevices } });
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
