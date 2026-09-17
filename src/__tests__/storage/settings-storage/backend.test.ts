import { createStore, getDefaultStore } from "jotai";

import {
  authSessionAtom,
  grantedScopesAtom,
} from "@/api/auth";
import { DRIVE_APPDATA } from "@/config/google-drive-scopes";
import {
  createSettingsBlobAtom,
  getGoogleDriveSettingsStorage,
  getMemorySettingsStorage,
  goalsStoredSchema,
  MemorySettingsStorage,
  resetSettingsStorageSingletonsForTests,
  settingsStorageAtom,
  SETTINGS_STORAGE_KEYS,
} from "@/storage/settings-storage";
import { createDefaultGoalsData } from "@/storage/settings-storage/defaults";

jest.mock("@/api/auth", () => {
  const actual = jest.requireActual("@/api/auth");
  return {
    ...actual,
    isLoggedIn: jest.fn(() => false),
    getFreshAccessToken: jest.fn(async () => "token"),
    getGrantedScopesRaw: jest.fn(() => undefined),
  };
});

const auth = jest.requireMock("@/api/auth") as {
  isLoggedIn: jest.Mock;
  getFreshAccessToken: jest.Mock;
  getGrantedScopesRaw: jest.Mock;
};

describe("settingsStorageAtom backend selection", () => {
  beforeEach(() => {
    resetSettingsStorageSingletonsForTests();
    auth.isLoggedIn.mockReturnValue(false);
    auth.getGrantedScopesRaw.mockReturnValue(undefined);
    getDefaultStore().set(grantedScopesAtom, undefined);
    getDefaultStore().set(authSessionAtom, {
      sessionToken: null,
      encryptedHealthToken: null,
    });
  });

  it("uses Memory when not logged in", async () => {
    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(storage).toBe(getMemorySettingsStorage());
    expect(storage).toBeInstanceOf(MemorySettingsStorage);
  });

  it("uses Memory when logged in without Drive scope", async () => {
    auth.isLoggedIn.mockReturnValue(true);
    auth.getGrantedScopesRaw.mockReturnValue("https://www.googleapis.com/auth/fitness.activity.read");
    getDefaultStore().set(
      grantedScopesAtom,
      "https://www.googleapis.com/auth/fitness.activity.read",
    );

    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(storage).toBe(getMemorySettingsStorage());
  });

  it("uses Google Drive when logged in with drive.appdata", async () => {
    auth.isLoggedIn.mockReturnValue(true);
    auth.getGrantedScopesRaw.mockReturnValue(DRIVE_APPDATA);
    getDefaultStore().set(grantedScopesAtom, DRIVE_APPDATA);

    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(storage).toBe(getGoogleDriveSettingsStorage());
  });

  it("awaits token refresh when logged in and scopes are unknown", async () => {
    auth.isLoggedIn.mockReturnValue(true);
    auth.getGrantedScopesRaw
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(DRIVE_APPDATA);
    auth.getFreshAccessToken.mockResolvedValue("token");

    const store = createStore();
    const storage = await store.get(settingsStorageAtom);
    expect(auth.getFreshAccessToken).toHaveBeenCalled();
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
    memory.seedSync(SETTINGS_STORAGE_KEYS.goals, { notGoals: true });

    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.goals,
      schema: goalsStoredSchema,
      defaultData: createDefaultGoalsData,
    });

    const store = createStore();
    const value = await store.get(goalsAtom);
    expect(value).toEqual({ goals: [] });
  });

  it("rejects invalid payloads on write", async () => {
    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.goals,
      schema: goalsStoredSchema,
      defaultData: createDefaultGoalsData,
    });

    const store = createStore();
    await expect(
      store.set(goalsAtom, { goals: [{ metric: "steps" }] } as never),
    ).rejects.toThrow();
  });

  it("persists valid writes to Memory storage", async () => {
    const goalsAtom = createSettingsBlobAtom({
      key: SETTINGS_STORAGE_KEYS.goals,
      schema: goalsStoredSchema,
      defaultData: createDefaultGoalsData,
    });

    const store = createStore();
    await store.set(goalsAtom, {
      goals: [{ metric: "steps", period: "daily", value: 8000, unit: "" }],
    });

    const stored = await getMemorySettingsStorage().get(
      SETTINGS_STORAGE_KEYS.goals,
    );
    expect(stored?.data).toEqual({
      goals: [{ metric: "steps", period: "daily", value: 8000, unit: "" }],
    });
  });
});
