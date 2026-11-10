import { createStore, getDefaultStore } from "jotai";

import { authSessionAtom, grantedDriveScopesAtom } from "@/api/auth";
import { DRIVE_APPDATA } from "@/config/google-drive-scopes";
import {
  createSettingsBlobAtom,
  getGoogleDriveSettingsStorage,
  getMemorySettingsStorage,
  clientOnlyGoalsStoredSchema,
  MemorySettingsStorage,
  resetSettingsStorageSingletonsForTests,
  settingsStorageAtom,
  SETTINGS_STORAGE_KEYS,
} from "@/storage/settings-storage";
import { createDefaultClientOnlyGoalsData } from "@/storage/settings-storage/defaults";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { mealsAtom } from "@/storage/meals";

jest.mock("@/api/auth", () => {
  const actual = jest.requireActual("@/api/auth");
  return {
    ...actual,
    isLoggedIn: jest.fn(() => false),
    getFreshDriveAccessToken: jest.fn(async () => "token"),
    getGrantedDriveScopesRaw: jest.fn(() => undefined),
    hasEncryptedDriveToken: jest.fn(() => false),
  };
});

const auth = jest.requireMock("@/api/auth") as {
  isLoggedIn: jest.Mock;
  getFreshDriveAccessToken: jest.Mock;
  getGrantedDriveScopesRaw: jest.Mock;
  hasEncryptedDriveToken: jest.Mock;
};

describe("settingsStorageAtom backend selection", () => {
  beforeEach(() => {
    resetSettingsStorageSingletonsForTests();
    auth.isLoggedIn.mockReturnValue(false);
    auth.hasEncryptedDriveToken.mockReturnValue(false);
    auth.getGrantedDriveScopesRaw.mockReturnValue(undefined);
    getDefaultStore().set(grantedDriveScopesAtom, undefined);
    getDefaultStore().set(authSessionAtom, {
      encryptedHealthToken: null,
      encryptedDriveToken: null,
    });
  });

  it("uses Memory when not logged in", async () => {
    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(storage).toBe(getMemorySettingsStorage());
    expect(storage).toBeInstanceOf(MemorySettingsStorage);
  });

  it("uses Memory when logged in without a Drive token", async () => {
    auth.isLoggedIn.mockReturnValue(true);
    auth.hasEncryptedDriveToken.mockReturnValue(false);

    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(storage).toBe(getMemorySettingsStorage());
  });

  it("uses Google Drive when logged in with a Drive token and drive.appdata", async () => {
    auth.isLoggedIn.mockReturnValue(true);
    auth.hasEncryptedDriveToken.mockReturnValue(true);
    auth.getGrantedDriveScopesRaw.mockReturnValue(DRIVE_APPDATA);
    getDefaultStore().set(grantedDriveScopesAtom, DRIVE_APPDATA);

    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(storage).toBe(getGoogleDriveSettingsStorage());
  });

  it("awaits drive token refresh when scopes are unknown", async () => {
    auth.isLoggedIn.mockReturnValue(true);
    auth.hasEncryptedDriveToken.mockReturnValue(true);
    auth.getGrantedDriveScopesRaw
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(DRIVE_APPDATA);
    auth.getFreshDriveAccessToken.mockResolvedValue("token");

    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(auth.getFreshDriveAccessToken).toHaveBeenCalled();
    expect(storage).toBe(getGoogleDriveSettingsStorage());
  });
});

describe("createSettingsBlobAtom validation", () => {
  beforeEach(() => {
    resetSettingsStorageSingletonsForTests();
    auth.isLoggedIn.mockReturnValue(false);
  });

  it("falls back to defaults on invalid stored data", async () => {
    const memory = getMemorySettingsStorage();
    memory.seedSync(SETTINGS_STORAGE_KEYS.clientOnlyGoals, { notGoals: true });

    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.clientOnlyGoals,
      schema: clientOnlyGoalsStoredSchema,
      defaultData: createDefaultClientOnlyGoalsData,
    });

    const store = createStore();
    const value = await store.get(goalsAtom);
    expect(value).toEqual({ clientOnlyGoals: [] });
  });

  it("rejects invalid payloads on write", async () => {
    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.clientOnlyGoals,
      schema: clientOnlyGoalsStoredSchema,
      defaultData: createDefaultClientOnlyGoalsData,
    });

    const store = createStore();
    await expect(
      store.set(goalsAtom, { clientOnlyGoals: [{ metric: "steps" }] } as never),
    ).rejects.toThrow();
  });

  it("persists valid writes to Memory storage", async () => {
    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.clientOnlyGoals,
      schema: clientOnlyGoalsStoredSchema,
      defaultData: createDefaultClientOnlyGoalsData,
    });

    const store = createStore();
    await store.set(goalsAtom, {
      clientOnlyGoals: [
        { metric: "steps", period: "daily", value: 8000, unit: "" },
      ],
    });

    const stored = await getMemorySettingsStorage().get(
      SETTINGS_STORAGE_KEYS.clientOnlyGoals,
    );
    expect(stored?.data).toEqual({
      clientOnlyGoals: [
        { metric: "steps", period: "daily", value: 8000, unit: "" },
      ],
    });
  });

  it("shares migrated food IDs when meals and foods load concurrently", async () => {
    const storage = getMemorySettingsStorage();
    storage.seedSync(SETTINGS_STORAGE_KEYS.clientOnlyFoods, {
      clientOnlyFoods: [
        {
          name: "users/me/dataTypes/food/dataPoints/local-123",
          food: { displayName: "Oatmeal" },
        },
      ],
    });
    storage.seedSync(SETTINGS_STORAGE_KEYS.meals, {
      meals: [
        {
          id: "breakfast",
          name: "Breakfast",
          description: "",
          foods: [{ foodId: "local-123", serving: { amount: 1 } }],
        },
      ],
    });

    const store = createStore();
    const [foods, meals] = await Promise.all([
      store.get(clientOnlyFoodsAtom),
      store.get(mealsAtom),
    ]);

    expect(meals.meals[0].foods[0].food).toBe(
      `foodTemplate:${foods.clientOnlyFoods[0].id}`,
    );
    expect(
      (await storage.get(SETTINGS_STORAGE_KEYS.clientOnlyFoods))?.data,
    ).toEqual(foods);
  });

  it("waits for the new backend instead of returning a warm cache from the old one", async () => {
    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.clientOnlyGoals,
      schema: clientOnlyGoalsStoredSchema,
      defaultData: createDefaultClientOnlyGoalsData,
    });
    const store = createStore();
    await store.set(goalsAtom, {
      clientOnlyGoals: [
        { metric: "steps", period: "daily", value: 8000, unit: "" },
      ],
    });
    expect(store.get(goalsAtom)).not.toBeInstanceOf(Promise);

    const drive = getGoogleDriveSettingsStorage();
    const read = jest.spyOn(drive, "get").mockResolvedValue({
      data: { clientOnlyGoals: [] },
      version: 1,
      updateTime: new Date().toISOString(),
    });
    auth.isLoggedIn.mockReturnValue(true);
    auth.hasEncryptedDriveToken.mockReturnValue(true);
    auth.getGrantedDriveScopesRaw.mockReturnValue(DRIVE_APPDATA);
    store.set(authSessionAtom, {
      encryptedHealthToken: "health-session",
      encryptedDriveToken: "drive-session",
    });

    try {
      expect(await store.get(goalsAtom)).toEqual({ clientOnlyGoals: [] });
      expect(read).toHaveBeenCalled();
    } finally {
      read.mockRestore();
    }
  });
});
