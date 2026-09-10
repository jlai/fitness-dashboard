import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  CloudflareKVRevocationDatabase,
  getRevocationDatabase,
  MemoryRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";

jest.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: jest.fn(),
}));

const getCloudflareContextMock = getCloudflareContext as unknown as jest.Mock;

describe("getRevocationDatabase", () => {
  const originalBackend = process.env.SESSION_REVOCATION_DATABASE;

  afterEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = originalBackend;
    resetRevocationDatabase();
    getCloudflareContextMock.mockReset();
  });

  it("uses the memory store by default", async () => {
    delete process.env.SESSION_REVOCATION_DATABASE;

    await expect(getRevocationDatabase()).resolves.toBeInstanceOf(
      MemoryRevocationDatabase,
    );
    expect(getCloudflareContextMock).not.toHaveBeenCalled();
  });

  it("uses Cloudflare KV when configured", async () => {
    process.env.SESSION_REVOCATION_DATABASE =
      "cloudflare-kv://SESSION_REVOCATION";
    const kv = {
      get: jest.fn(),
      put: jest.fn(),
    };
    getCloudflareContextMock.mockResolvedValue({
      env: { SESSION_REVOCATION: kv },
      cf: undefined,
      ctx: {} as never,
    });

    await expect(getRevocationDatabase()).resolves.toBeInstanceOf(
      CloudflareKVRevocationDatabase,
    );
    expect(getCloudflareContextMock).toHaveBeenCalledWith({ async: true });
  });

  it("throws when the Cloudflare KV binding is missing", async () => {
    process.env.SESSION_REVOCATION_DATABASE = "cloudflare-kv://MY_KV";
    getCloudflareContextMock.mockResolvedValue({
      env: {},
      cf: undefined,
      ctx: {} as never,
    });

    await expect(getRevocationDatabase()).rejects.toThrow(
      "MY_KV KV binding is not configured",
    );
  });
});
