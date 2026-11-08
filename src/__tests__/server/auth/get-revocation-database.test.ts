/**
 * @jest-environment node
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  CloudflareKVRevocationDatabase,
  getRevocationDatabase,
  MemoryRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import {
  createAuthMiniflare,
  type AuthMiniflare,
} from "@/__tests__/helpers/cloudflare-miniflare";

jest.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: jest.fn(),
}));

const getCloudflareContextMock = getCloudflareContext as unknown as jest.Mock;

describe("getRevocationDatabase", () => {
  const originalBackend = process.env.SESSION_REVOCATION_DATABASE;
  let authMf: AuthMiniflare | undefined;

  afterEach(async () => {
    process.env.SESSION_REVOCATION_DATABASE = originalBackend;
    resetRevocationDatabase();
    getCloudflareContextMock.mockReset();
    if (authMf) {
      await authMf.dispose();
      authMf = undefined;
    }
  });

  it("uses the memory store by default", async () => {
    delete process.env.SESSION_REVOCATION_DATABASE;

    await expect(getRevocationDatabase()).resolves.toBeInstanceOf(
      MemoryRevocationDatabase,
    );
    expect(getCloudflareContextMock).not.toHaveBeenCalled();
  });

  it("uses Cloudflare KV from Miniflare when configured", async () => {
    authMf = await createAuthMiniflare();
    process.env.SESSION_REVOCATION_DATABASE =
      "cloudflare-kv://SESSION_REVOCATION";
    const env = await authMf.getEnv();
    getCloudflareContextMock.mockResolvedValue({
      env,
      cf: undefined,
      ctx: {} as never,
    });

    const db = await getRevocationDatabase();
    expect(db).toBeInstanceOf(CloudflareKVRevocationDatabase);

    const expiresAt = Math.floor(Date.now() / 1000) + 120;
    await db.add("jti-from-factory", expiresAt);

    await expect(
      db.isRevoked({
        jti: "jti-from-factory",
        sub: "user-1",
        iat: Math.floor(Date.now() / 1000),
      }),
    ).resolves.toBe(true);
    await expect(env.SESSION_REVOCATION.get("jti-from-factory")).resolves.toBe(
      "1",
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
