import {
  createAppDataFile,
  deleteAppDataFile,
  downloadAppDataFile,
  getAppDataFileByName,
  updateAppDataFile,
} from "@/api/google-drive";
import {
  DRIVE_SETTINGS_WRITE_DEBOUNCE_MS,
  GoogleDriveSettingsStorage,
} from "@/storage/settings-storage";

jest.mock("@/api/google-drive", () => ({
  createAppDataFile: jest.fn(),
  deleteAppDataFile: jest.fn(),
  downloadAppDataFile: jest.fn(),
  getAppDataFileByName: jest.fn(),
  updateAppDataFile: jest.fn(),
}));

const mockedGetByName = jest.mocked(getAppDataFileByName);
const mockedDownload = jest.mocked(downloadAppDataFile);
const mockedCreate = jest.mocked(createAppDataFile);
const mockedUpdate = jest.mocked(updateAppDataFile);
const mockedDelete = jest.mocked(deleteAppDataFile);

describe("GoogleDriveSettingsStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns null for missing files and caches the miss", async () => {
    mockedGetByName.mockResolvedValue(null);
    const storage = new GoogleDriveSettingsStorage();

    await expect(storage.get("meals")).resolves.toBeNull();
    await expect(storage.get("meals")).resolves.toBeNull();

    expect(mockedGetByName).toHaveBeenCalledTimes(1);
    expect(mockedGetByName).toHaveBeenCalledWith("meals.json");
  });

  it("loads by filename and caches StoredData on first read", async () => {
    const envelope = {
      data: { tiles: [] },
      version: 1,
      updateTime: "2026-01-01T00:00:00.000Z",
    };
    mockedGetByName.mockResolvedValue({
      id: "file-1",
      name: "dashboard-tiles.json",
    });
    mockedDownload.mockResolvedValue(JSON.stringify(envelope));

    const storage = new GoogleDriveSettingsStorage();
    const first = await storage.get("dashboard-tiles");
    const second = await storage.get("dashboard-tiles");

    expect(first).toEqual(envelope);
    expect(second).toEqual(envelope);
    expect(mockedGetByName).toHaveBeenCalledTimes(1);
    expect(mockedGetByName).toHaveBeenCalledWith("dashboard-tiles.json");
    expect(mockedDownload).toHaveBeenCalledTimes(1);
  });

  it("updates the cache immediately but debounces Drive create", async () => {
    mockedGetByName.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: "file-new", name: "meals.json" });

    const storage = new GoogleDriveSettingsStorage();
    const written = await storage.set("meals", [{ name: "lunch" }]);

    expect(written.data).toEqual([{ name: "lunch" }]);
    expect(written.version).toBe(1);
    expect(mockedCreate).not.toHaveBeenCalled();
    await expect(storage.get("meals")).resolves.toEqual(written);

    await jest.advanceTimersByTimeAsync(DRIVE_SETTINGS_WRITE_DEBOUNCE_MS);
    await storage.waitForInflightWrites();

    expect(mockedCreate).toHaveBeenCalledWith(
      "meals.json",
      expect.stringContaining('"name":"lunch"'),
    );
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("coalesces rapid writes into a single Drive update", async () => {
    mockedGetByName.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: "file-new", name: "meals.json" });

    const storage = new GoogleDriveSettingsStorage();
    await storage.set("meals", [{ name: "a" }]);
    await storage.set("meals", [{ name: "b" }]);
    await storage.set("meals", [{ name: "c" }]);

    expect(mockedCreate).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DRIVE_SETTINGS_WRITE_DEBOUNCE_MS);
    await storage.waitForInflightWrites();

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledWith(
      "meals.json",
      expect.stringContaining('"name":"c"'),
    );
  });

  it("updates an existing appdata file after the debounce", async () => {
    const existing = {
      data: { steps: 5000 },
      version: 2,
      updateTime: "2026-01-01T00:00:00.000Z",
    };
    mockedGetByName.mockResolvedValue({ id: "file-2", name: "goals.json" });
    mockedDownload.mockResolvedValue(JSON.stringify(existing));
    mockedUpdate.mockResolvedValue({ id: "file-2", name: "goals.json" });

    const storage = new GoogleDriveSettingsStorage();
    await storage.get("goals");
    const written = await storage.set("goals", { steps: 8000 });

    expect(written.version).toBe(2);
    expect(mockedUpdate).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DRIVE_SETTINGS_WRITE_DEBOUNCE_MS);
    await storage.waitForInflightWrites();

    expect(mockedUpdate).toHaveBeenCalledWith(
      "file-2",
      expect.stringContaining('"steps":8000'),
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("flush persists dirty keys immediately", async () => {
    mockedGetByName.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: "file-new", name: "meals.json" });

    const storage = new GoogleDriveSettingsStorage();
    await storage.set("meals", [{ name: "lunch" }]);
    await storage.flush();

    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending write when deleting a key", async () => {
    mockedGetByName.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: "file-new", name: "meals.json" });

    const storage = new GoogleDriveSettingsStorage();
    await storage.set("meals", [{ name: "lunch" }]);
    await storage.delete("meals");

    await jest.advanceTimersByTimeAsync(DRIVE_SETTINGS_WRITE_DEBOUNCE_MS);
    await storage.waitForInflightWrites();

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
    await expect(storage.get("meals")).resolves.toBeNull();
  });

  it("deletes an existing appdata file and caches the miss", async () => {
    mockedGetByName.mockResolvedValue({ id: "file-3", name: "meals.json" });
    mockedDownload.mockResolvedValue(
      JSON.stringify({
        data: { meals: [] },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }),
    );
    mockedDelete.mockResolvedValue(undefined);

    const storage = new GoogleDriveSettingsStorage();
    await storage.get("meals");
    await storage.delete("meals");

    expect(mockedDelete).toHaveBeenCalledWith("file-3");
    await expect(storage.get("meals")).resolves.toBeNull();
    expect(mockedGetByName).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid keys", async () => {
    const storage = new GoogleDriveSettingsStorage();
    await expect(storage.get("Bad Key")).rejects.toThrow(/invalid settings key/);
    await expect(storage.set("foo/bar", {})).rejects.toThrow(
      /invalid settings key/,
    );
    await expect(storage.delete("Bad Key")).rejects.toThrow(
      /invalid settings key/,
    );
    expect(mockedGetByName).not.toHaveBeenCalled();
  });
});
