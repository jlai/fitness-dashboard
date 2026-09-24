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
  deleteAppDataFile: jest.fn(async () => undefined),
  downloadAppDataFile: jest.fn(),
  listAppDataFiles: jest.fn(),
  updateAppDataFile: jest.fn(async (fileId: string) => ({
    id: fileId,
    name: "updated.json",
  })),
}));

const {
  createAppDataFile,
  downloadAppDataFile,
  listAppDataFiles,
  updateAppDataFile,
} = jest.requireMock("@/api/google-drive") as {
  createAppDataFile: jest.Mock;
  downloadAppDataFile: jest.Mock;
  listAppDataFiles: jest.Mock;
  updateAppDataFile: jest.Mock;
};

describe("reconcileMemoryAndDriveOnEnable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSettingsStorageSingletonsForTests();
    listAppDataFiles.mockResolvedValue([]);
  });

  it("copies memory-only keys to Drive and drive-only keys to Memory", async () => {
    const memory = getMemorySettingsStorage();
    await memory.set(SETTINGS_STORAGE_KEYS.clientOnlyGoals, {
      clientOnlyGoals: [
        { metric: "steps", period: "daily", value: 1, unit: "" },
      ],
    });

    listAppDataFiles.mockResolvedValue([
      { id: "meals-id", name: "meals.json" },
    ]);
    downloadAppDataFile.mockResolvedValue(
      JSON.stringify({
        data: { meals: [{ id: "m1", name: "Lunch", description: "", foods: [] }] },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }),
    );

    const resolveConflicts = jest.fn();
    const result = await reconcileMemoryAndDriveOnEnable({ resolveConflicts });

    expect(result.memoryOnly).toEqual([SETTINGS_STORAGE_KEYS.clientOnlyGoals]);
    expect(result.driveOnly).toEqual([SETTINGS_STORAGE_KEYS.meals]);
    expect(result.conflicts).toEqual([]);
    expect(resolveConflicts).not.toHaveBeenCalled();
    expect(createAppDataFile).toHaveBeenCalledWith(
      "client-only-goals.json",
      expect.stringContaining('"metric":"steps"'),
    );
    expect(listAppDataFiles).toHaveBeenCalledTimes(1);

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
    await memory.set(SETTINGS_STORAGE_KEYS.clientOnlyGoals, {
      clientOnlyGoals: [
        { metric: "steps", period: "daily", value: 100, unit: "" },
      ],
    });

    listAppDataFiles.mockResolvedValue([
      { id: "id-settings.json", name: "settings.json" },
      { id: "id-client-only-goals.json", name: "client-only-goals.json" },
    ]);
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
          clientOnlyGoals: [
            { metric: "steps", period: "daily", value: 999, unit: "" },
          ],
        },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      });
    });

    const resolveConflicts = jest.fn().mockResolvedValue("memory");
    const result = await reconcileMemoryAndDriveOnEnable({ resolveConflicts });

    expect(result.conflicts).toEqual([
      SETTINGS_STORAGE_KEYS.clientOnlyGoals,
      SETTINGS_STORAGE_KEYS.settings,
    ]);
    expect(resolveConflicts).toHaveBeenCalledTimes(1);
    expect(resolveConflicts).toHaveBeenCalledWith([
      SETTINGS_STORAGE_KEYS.clientOnlyGoals,
      SETTINGS_STORAGE_KEYS.settings,
    ]);
    expect(updateAppDataFile).toHaveBeenCalledTimes(2);
    expect(updateAppDataFile).toHaveBeenCalledWith(
      "id-settings.json",
      expect.stringContaining("memory-style"),
    );
    expect(updateAppDataFile).toHaveBeenCalledWith(
      "id-client-only-goals.json",
      expect.stringContaining('"value":100'),
    );
    expect(listAppDataFiles).toHaveBeenCalledTimes(1);
  });

  it("keeps Drive versions for all conflicts when chosen", async () => {
    const memory = getMemorySettingsStorage();
    await memory.set(SETTINGS_STORAGE_KEYS.settings, {
      settings: { mapStyle: "memory-style" },
    });

    listAppDataFiles.mockResolvedValue([
      { id: "id-settings.json", name: "settings.json" },
    ]);
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
    expect(listAppDataFiles).toHaveBeenCalledTimes(1);

    const settingsInMemory = await memory.get(SETTINGS_STORAGE_KEYS.settings);
    expect(settingsInMemory?.data).toEqual({
      settings: { mapStyle: "drive-style" },
    });
  });
});
