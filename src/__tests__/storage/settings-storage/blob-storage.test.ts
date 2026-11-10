import { z } from "zod";

import { loadSettingsBlob } from "@/storage/settings-storage/blob-storage";
import { MemorySettingsStorage } from "@/storage/settings-storage/memory";
import { storedDataSchema } from "@/storage/settings-storage/schemas";
import { wrapStoredData } from "@/storage/settings-storage/types";

jest.mock("@/utils/log-error", () => ({ logError: jest.fn() }));

const options = {
  key: "settings",
  schema: storedDataSchema(z.object({ value: z.string() })),
  defaultData: { value: "default" },
  version: 2,
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it("keeps concurrent readers pending until migration and persistence finish", async () => {
  const storage = new MemorySettingsStorage();
  storage.seedSync(options.key, { legacyValue: "old" });
  const migration = deferred();
  const persistence = deferred();
  const startedPersisting = deferred();
  const migrate = jest.fn(async () => {
    await migration.promise;
    return wrapStoredData({ value: "migrated" }, 2);
  });
  const originalSet = storage.set.bind(storage);
  const write = jest
    .spyOn(storage, "set")
    .mockImplementation(async (...args) => {
      startedPersisting.resolve();
      await persistence.promise;
      return originalSet(...args);
    });
  const opts = { ...options, migrate };
  const first = loadSettingsBlob(storage, opts);
  const second = loadSettingsBlob(storage, opts);
  const consumed = jest.fn();
  void first.then(consumed);

  expect(second).toBe(first);
  await Promise.resolve();
  expect(migrate).toHaveBeenCalledTimes(1);
  expect(consumed).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();

  migration.resolve();
  await startedPersisting.promise;
  expect(consumed).not.toHaveBeenCalled();
  persistence.resolve();

  expect(await first).toEqual({ value: "migrated" });
  expect(await second).toEqual({ value: "migrated" });
  expect(write).toHaveBeenCalledTimes(1);
});

it("does not rerun migrations or write blobs already at the current version", async () => {
  const storage = new MemorySettingsStorage();
  const stored = storage.seedSync(options.key, { value: "current" }, 2);
  const migrate = jest.fn(() => wrapStoredData({ value: "changed" }, 2));
  const write = jest.spyOn(storage, "set");

  expect(await loadSettingsBlob(storage, { ...options, migrate })).toEqual(
    stored.data,
  );
  expect(migrate).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

it("preserves the old blob when migration produces invalid data", async () => {
  const storage = new MemorySettingsStorage();
  const stored = storage.seedSync(options.key, { legacyValue: "old" });
  const migrate = () => wrapStoredData({ value: 123 as unknown as string }, 2);
  const write = jest.spyOn(storage, "set");

  expect(await loadSettingsBlob(storage, { ...options, migrate })).toEqual(
    options.defaultData,
  );
  expect(write).not.toHaveBeenCalled();
  expect(await storage.get(options.key)).toEqual(stored);
});

it("does not downgrade blobs from a newer version", async () => {
  const storage = new MemorySettingsStorage();
  const stored = storage.seedSync(options.key, { value: "future" }, 3);
  const migrate = jest.fn(() => wrapStoredData({ value: "changed" }, 2));
  const write = jest.spyOn(storage, "set");

  expect(await loadSettingsBlob(storage, { ...options, migrate })).toEqual(
    options.defaultData,
  );
  expect(migrate).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(await storage.get(options.key)).toEqual(stored);
});
