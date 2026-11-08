import { test as base, Page } from "@playwright/test";

import {
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
} from "@/api/user";
import {
  type Profile,
  Settings,
} from "@generated/orval/fetch/google-health-api/models";

const DEFAULT_USER_SETTINGS: Settings = {
  distanceUnit: SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS,
  swimUnit: SettingsSwimUnit.SWIM_UNIT_METERS,
  temperatureUnit: SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS,
  waterUnit: SettingsWaterUnit.WATER_UNIT_ML,
  weightUnit: SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
};

const DEFAULT_HEALTH_PROFILE: Profile = {
  membershipStartDate: { year: 2021, month: 1, day: 1 },
};

export class UserApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.setUserSettings();
    await this.setHealthProfile();
  }

  async setUserSettings(settings: Partial<Settings> = {}) {
    const userSettings = { ...DEFAULT_USER_SETTINGS, ...settings };

    await this.page.route("**/v4/users/*/settings**", async (route) => {
      await route.fulfill({ json: userSettings });
    });
  }

  async setHealthProfile(profile: Partial<Profile> = {}) {
    const healthProfile = { ...DEFAULT_HEALTH_PROFILE, ...profile };

    await this.page.route("**/v4/users/*/profile**", async (route) => {
      await route.fulfill({ json: healthProfile });
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
