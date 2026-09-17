import {
  getGoogleDriveSettingsStorage,
  getMemorySettingsStorage,
  reconcileMemoryAndDriveOnEnable,
  resetSettingsStorageSingletonsForTests,
  SETTINGS_STORAGE_KEYS,
} from "@/storage/settings-storage";

jest.mock("@/api/google-drive", () => ({
  createAppDataFile: jest.fn(async (fileName: string) => ({
    id: `id-${fileName}`,
    name: fileName,
  })),
  downloadAppDataFile: jest.fn(),
  getAppDataFileByName: jest.fn(),
  updateAppDataFile: jest.fn(async (fileId: string) => ({
    id: fileId,
    name: "updated.json",
  })),
}));

const {
  createAppDataFile,
  downloadAppDataFile,
  getAppDataFileByName,
  updateAppDataFile,
} = jest.requireMock("@/api/google-drive") as {
  createAppDataFile: jest.Mock;
  downloadAppDataFile: jest.Mock;
  getAppDataFileByName: jest.Mock;
  updateAppDataFile: jest.Mock;
};

describe("reconcileMemoryAndDriveOnEnable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSettingsStorageSingletonsForTests();
    getAppDataFileByName.mockResolvedValue(null);
  });

  it("copies memory-only keys to Drive and drive-only keys to Memory", async () => {
    const memory = getMemorySettingsStorage();
    await memory.set(SETTINGS_STORAGE_KEYS.goals, { goals: [{ metric: "steps", period: "daily", value: 1, unit: "" }] });

    getAppDataFileByName.mockImplementation(async (fileName: string) => {
      if (fileName === "meals.json") {
        return { id: "meals-id", name: fileName };
      }
      return null;
    });
    downloadAppDataFile.mockResolvedValue(
      JSON.stringify({
        data: { meals: [{ id: "m1", name: "Lunch", description: "", foods: [] }] },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }),
    );

    const resolveConflicts = jest.fn();
    const result = await reconcileMemoryAndDriveOnEnable({ resolveConflicts });

    expect(result.memoryOnly).toEqual([SETTINGS_STORAGE_KEYS.goals]);
    expect(result.driveOnly).toEqual([SETTINGS_STORAGE_KEYS.meals]);
    expect(result.conflicts).toEqual([]);
    expect(resolveConflicts).not.toHaveBeenCalled();
    expect(createAppDataFile).toHaveBeenCalledWith(
      "goals.json",
      expect.stringContaining('"metric":"steps"'),
    );

    const mealsInMemory = await memory.get(SETTINGS_STORAGE_KEYS.meals);
    expect(mealsInMemory?.data).toEqual({
      meals: [{ id: "m1", name: "Lunch", description: "", foods: [] }],
    });
  });

  it("asks once for conflicts and copies the chosen side for all keys", async () => {
    const memory = getMemorySettingsStorage();
    await memory.set(SETTINGS_STORAGE_KEYS.settings, {
      settings: { mapStyle: "memory-style" },
    });
    await memory.set(SETTINGS_STORAGE_KEYS.goals, {
      goals: [{ metric: "steps", period: "daily", value: 100, unit: "" }],
    });

    getAppDataFileByName.mockImplementation(async (fileName: string) => {
      if (fileName === "settings.json" || fileName === "goals.json") {
        return { id: `id-${fileName}`, name: fileName };
      }
      return null;
    });
    downloadAppDataFile.mockImplementation(async (fileId: string) => {
      if (fileId === "id-settings.json") {
        return JSON.stringify({
          data: { settings: { mapStyle: "drive-style" } },
          version: 1,
          updateTime: "2026-01-01T00:00:00.000Z",
        });
      }
      return JSON.stringify({
        data: {
          goals: [{ metric: "steps", period: "daily", value: 999, unit: "" }],
        },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      });
    });

    const resolveConflicts = jest.fn().mockResolvedValue("memory");
    const result = await reconcileMemoryAndDriveOnEnable({ resolveConflicts });

    expect(result.conflicts).toEqual([
      SETTINGS_STORAGE_KEYS.goals,
      SETTINGS_STORAGE_KEYS.settings,
    ]);
    expect(resolveConflicts).toHaveBeenCalledTimes(1);
    expect(resolveConflicts).toHaveBeenCalledWith([
      SETTINGS_STORAGE_KEYS.goals,
      SETTINGS_STORAGE_KEYS.settings,
    ]);
    expect(updateAppDataFile).toHaveBeenCalledTimes(2);
    expect(updateAppDataFile).toHaveBeenCalledWith(
      "id-settings.json",
      expect.stringContaining("memory-style"),
    );
    expect(updateAppDataFile).toHaveBeenCalledWith(
      "id-goals.json",
      expect.stringContaining('"value":100'),
    );
  });

  it("keeps Drive versions for all conflicts when chosen", async () => {
    const memory = getMemorySettingsStorage();
    await memory.set(SETTINGS_STORAGE_KEYS.settings, {
      settings: { mapStyle: "memory-style" },
    });

    getAppDataFileByName.mockImplementation(async (fileName: string) => {
      if (fileName === "settings.json") {
        return { id: "id-settings.json", name: fileName };
      }
      return null;
    });
    downloadAppDataFile.mockResolvedValue(
      JSON.stringify({
        data: { settings: { mapStyle: "drive-style" } },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }),
    );

    await reconcileMemoryAndDriveOnEnable({
      resolveConflicts: async () => "drive",
    });

    expect(updateAppDataFile).not.toHaveBeenCalled();
    expect(createAppDataFile).not.toHaveBeenCalled();

    const settingsInMemory = await memory.get(SETTINGS_STORAGE_KEYS.settings);
    expect(settingsInMemory?.data).toEqual({
      settings: { mapStyle: "drive-style" },
    });
  });
});
