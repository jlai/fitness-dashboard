import { test as base, Page } from "@playwright/test";

import {
  DistanceUnitSystem,
  SwimUnitSystem,
  TemperatureUnitSystem,
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";

interface UserProfile {
  fullName: string;
  avatar: string;
  avatar150: string;
  avatar650: string;
  distanceUnit: DistanceUnitSystem;
  swimUnit: SwimUnitSystem;
  temperatureUnit: TemperatureUnitSystem;
  waterUnit: WaterUnitSystem;
  waterUnitName: string;
  weightUnit: WeightUnitSystem;
}

const DEFAULT_USER_PROFILE: UserProfile = {
  fullName: "Test User",
  avatar: "https://example.com/avatar.jpg",
  avatar150: "https://example.com/avatar150.jpg",
  avatar650: "https://example.com/avatar650.jpg",
  distanceUnit: "METRIC",
  swimUnit: "METRIC",
  temperatureUnit: "METRIC",
  waterUnit: "METRIC",
  waterUnitName: "ml",
  weightUnit: "METRIC",
};

export class UserApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.page.route("**/1/user/-/profile.json", async (route) => {
      await route.fulfill({ json: { user: DEFAULT_USER_PROFILE } });
    });
  }

  async setUserProfile(profile: Partial<UserProfile> = {}) {
    const userProfile = { ...DEFAULT_USER_PROFILE, ...profile };

    await this.page.route("**/1/user/-/profile.json", async (route) => {
      await route.fulfill({ json: { user: userProfile } });
    });
  }
}

type UserApiFixture = {
  userApi: UserApi;
};

export const test = base.extend<UserApiFixture>({
  userApi: async ({ page }, use) => {
    const api = new UserApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
