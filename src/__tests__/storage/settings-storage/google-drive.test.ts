import {
  createAppDataFile,
  downloadAppDataFile,
  getAppDataFileByName,
  updateAppDataFile,
} from "@/api/google-drive";
import { GoogleDriveSettingsStorage } from "@/storage/settings-storage";

jest.mock("@/api/google-drive", () => ({
  createAppDataFile: jest.fn(),
  downloadAppDataFile: jest.fn(),
  getAppDataFileByName: jest.fn(),
  updateAppDataFile: jest.fn(),
}));

const mockedGetByName = jest.mocked(getAppDataFileByName);
const mockedDownload = jest.mocked(downloadAppDataFile);
const mockedCreate = jest.mocked(createAppDataFile);
const mockedUpdate = jest.mocked(updateAppDataFile);

describe("GoogleDriveSettingsStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("creates a new appdata file on first write", async () => {
    mockedGetByName.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: "file-new", name: "meals.json" });

    const storage = new GoogleDriveSettingsStorage();
    const written = await storage.set("meals", [{ name: "lunch" }]);

    expect(written.data).toEqual([{ name: "lunch" }]);
    expect(written.version).toBe(1);
    expect(mockedCreate).toHaveBeenCalledWith(
      "meals.json",
      expect.stringContaining('"name":"lunch"'),
    );
    expect(mockedUpdate).not.toHaveBeenCalled();

    await expect(storage.get("meals")).resolves.toEqual(written);
    expect(mockedGetByName).toHaveBeenCalledTimes(1);
  });

  it("updates an existing appdata file on write", async () => {
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
    expect(mockedUpdate).toHaveBeenCalledWith(
      "file-2",
      expect.stringContaining('"steps":8000'),
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid keys", async () => {
    const storage = new GoogleDriveSettingsStorage();
    await expect(storage.get("Bad Key")).rejects.toThrow(/invalid settings key/);
    await expect(storage.set("foo/bar", {})).rejects.toThrow(
      /invalid settings key/,
    );
    expect(mockedGetByName).not.toHaveBeenCalled();
  });
});
