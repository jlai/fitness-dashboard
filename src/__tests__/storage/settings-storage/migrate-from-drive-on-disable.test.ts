import {
  getGoogleDriveSettingsStorage,
  getMemorySettingsStorage,
  migrateFromDriveOnDisable,
  resetSettingsStorageSingletonsForTests,
  SETTINGS_STORAGE_KEYS,
} from "@/storage/settings-storage";

jest.mock("@/api/google-drive", () => ({
  createAppDataFile: jest.fn(),
  deleteAppDataFile: jest.fn(async () => undefined),
  downloadAppDataFile: jest.fn(),
  listAppDataFiles: jest.fn(),
  updateAppDataFile: jest.fn(),
}));

const {
  deleteAppDataFile,
  downloadAppDataFile,
  listAppDataFiles,
} = jest.requireMock("@/api/google-drive") as {
  deleteAppDataFile: jest.Mock;
  downloadAppDataFile: jest.Mock;
  listAppDataFiles: jest.Mock;
};

describe("migrateFromDriveOnDisable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSettingsStorageSingletonsForTests();
    listAppDataFiles.mockResolvedValue([]);
  });

  it("copies Drive keys into Memory then deletes the Drive files", async () => {
    listAppDataFiles.mockResolvedValue([
      { id: "id-meals.json", name: "meals.json" },
      { id: "id-settings.json", name: "settings.json" },
    ]);
    downloadAppDataFile.mockImplementation(async (fileId: string) => {
      if (fileId === "id-meals.json") {
        return JSON.stringify({
          data: {
            meals: [{ id: "m1", name: "Lunch", description: "", foods: [] }],
          },
          version: 1,
          updateTime: "2026-01-01T00:00:00.000Z",
        });
      }
      return JSON.stringify({
        data: { settings: { mapStyle: "drive-style" } },
        version: 2,
        updateTime: "2026-01-01T00:00:00.000Z",
      });
    });

    const result = await migrateFromDriveOnDisable();
    const memory = getMemorySettingsStorage();

    expect(result.movedKeys).toEqual([
      SETTINGS_STORAGE_KEYS.meals,
      SETTINGS_STORAGE_KEYS.settings,
    ]);
    expect(await memory.get(SETTINGS_STORAGE_KEYS.meals)).toMatchObject({
      data: {
        meals: [{ id: "m1", name: "Lunch", description: "", foods: [] }],
      },
      version: 1,
    });
    expect(await memory.get(SETTINGS_STORAGE_KEYS.settings)).toMatchObject({
      data: { settings: { mapStyle: "drive-style" } },
      version: 2,
    });
    expect(deleteAppDataFile).toHaveBeenCalledWith("id-meals.json");
    expect(deleteAppDataFile).toHaveBeenCalledWith("id-settings.json");
    expect(listAppDataFiles).toHaveBeenCalledTimes(1);
  });

  it("overwrites Memory with Drive values for keys present on both sides", async () => {
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
        version: 3,
        updateTime: "2026-01-01T00:00:00.000Z",
      }),
    );

    await migrateFromDriveOnDisable();

    expect(await memory.get(SETTINGS_STORAGE_KEYS.settings)).toMatchObject({
      data: { settings: { mapStyle: "drive-style" } },
      version: 3,
    });
    expect(listAppDataFiles).toHaveBeenCalledTimes(1);
  });

  it("resets the Drive storage singleton after migrate", async () => {
    const before = getGoogleDriveSettingsStorage();
    await migrateFromDriveOnDisable();
    const after = getGoogleDriveSettingsStorage();
    expect(after).not.toBe(before);
  });
});
