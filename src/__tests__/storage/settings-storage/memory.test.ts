import {
  assertValidSettingsKey,
  isStoredDataEnvelope,
  MemorySettingsStorage,
  parseStoredData,
  settingsKeyToFileName,
  wrapStoredData,
} from "@/storage/settings-storage";

describe("settings-storage helpers", () => {
  it("accepts valid keys and maps them to filenames", () => {
    expect(() => assertValidSettingsKey("meals")).not.toThrow();
    expect(settingsKeyToFileName("client-only-foods")).toBe(
      "client-only-foods.json",
    );
  });

  it("rejects invalid keys", () => {
    expect(() => assertValidSettingsKey("Meals")).toThrow(
      /invalid settings key/,
    );
    expect(() => assertValidSettingsKey("foods.json")).toThrow();
    expect(() => assertValidSettingsKey("../x")).toThrow();
    expect(() => assertValidSettingsKey("")).toThrow();
  });

  it("wraps and validates StoredData envelopes", () => {
    const wrapped = wrapStoredData({ a: 1 }, 2, "2026-01-01T00:00:00.000Z");
    expect(wrapped).toEqual({
      data: { a: 1 },
      version: 2,
      updateTime: "2026-01-01T00:00:00.000Z",
    });
    expect(isStoredDataEnvelope(wrapped)).toBe(true);
    expect(
      isStoredDataEnvelope({ data: 1, version: "1", updateTime: "x" }),
    ).toBe(false);
    expect(parseStoredData(wrapped)).toEqual(wrapped);
  });
});

describe("MemorySettingsStorage", () => {
  it("reads and writes wrapped data", async () => {
    const storage = new MemorySettingsStorage();

    expect(await storage.get("meals")).toBeNull();

    const written = await storage.set("meals", [{ id: "1" }]);
    expect(written.data).toEqual([{ id: "1" }]);
    expect(written.version).toBe(1);
    expect(typeof written.updateTime).toBe("string");

    const read = await storage.get<{ id: string }[]>("meals");
    expect(read).toEqual(written);
  });

  it("preserves version when omitted on update and bumps when provided", async () => {
    const storage = new MemorySettingsStorage();
    await storage.set("goals", { steps: 10000 }, 3);

    const preserved = await storage.set("goals", { steps: 12000 });
    expect(preserved.version).toBe(3);

    const bumped = await storage.set("goals", { steps: 15000 }, 4);
    expect(bumped.version).toBe(4);
  });

  it("rejects invalid keys on get and set", async () => {
    const storage = new MemorySettingsStorage();
    await expect(storage.get("Bad Key")).rejects.toThrow(
      /invalid settings key/,
    );
    await expect(storage.set("Bad Key", {})).rejects.toThrow(
      /invalid settings key/,
    );
  });

  it("tracks stored data presence and notifies subscribers", async () => {
    const storage = new MemorySettingsStorage();
    const listener = jest.fn();
    const unsubscribe = storage.subscribe(listener);

    expect(storage.hasStoredData()).toBe(false);

    await storage.set("meals", []);
    expect(storage.hasStoredData()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    storage.seedSync("settings", { units: {} });
    expect(listener).toHaveBeenCalledTimes(2);

    await storage.delete("meals");
    expect(listener).toHaveBeenCalledTimes(3);
    expect(storage.hasStoredData()).toBe(true);

    await storage.delete("settings");
    expect(listener).toHaveBeenCalledTimes(4);
    expect(storage.hasStoredData()).toBe(false);

    await storage.delete("settings");
    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    await storage.set("meals", []);
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
