/**
 * @jest-environment node
 */
import { CloudflareSecretStore } from "@/server/auth/cloudflare-secret-store";
import { purposeOptions } from "@/server/auth/secret-store";
import { rotateTokenSecrets } from "@/server/auth/rotate-token-secrets";
import {
  createAuthMiniflare,
  TEST_ACCOUNT_ID,
  TEST_SECRETS_STORE_ID,
  type AuthMiniflare,
  type AuthMiniflareEnv,
} from "@/__tests__/helpers/cloudflare-miniflare";

const SESSION_JWK = {
  kty: "oct" as const,
  kid: "session-1",
  alg: "HS256",
  use: "sig" as const,
  k: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
};

const HEALTH_JWK = {
  kty: "oct" as const,
  kid: "health-1",
  alg: "A256GCM",
  use: "enc" as const,
  k: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
};

const DRIVE_JWK = {
  kty: "oct" as const,
  kid: "drive-1",
  alg: "A256GCM",
  use: "enc" as const,
  k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
};

async function readSecretFromEnv(env: AuthMiniflareEnv, name: string) {
  const binding = env[name as keyof AuthMiniflareEnv];
  if (!binding || typeof (binding as { get?: unknown }).get !== "function") {
    throw new Error("missing");
  }
  return (binding as { get: () => Promise<string> }).get();
}

describe("CloudflareSecretStore (Miniflare)", () => {
  let authMf: AuthMiniflare;

  beforeEach(async () => {
    authMf = await createAuthMiniflare();
  }, 30_000);

  afterEach(async () => {
    await authMf.dispose();
  });

  async function seedSessionSecrets(previous?: typeof SESSION_JWK) {
    const accepted = previous
      ? { keys: [SESSION_JWK, previous] }
      : { keys: [SESSION_JWK] };

    await authMf.seedSecret("SESSION_ACTIVE_KEY", JSON.stringify(SESSION_JWK));
    await authMf.seedSecret(
      "SESSION_ACCEPTED_KEYS",
      JSON.stringify(accepted),
    );
  }

  it("reads ACTIVE_KEY and ACCEPTED_KEYS from Secrets Store bindings", async () => {
    const previous = { ...SESSION_JWK, kid: "session-0" };
    await seedSessionSecrets(previous);

    const env = await authMf.getEnv();
    const store = new CloudflareSecretStore({
      ...purposeOptions("session"),
      storeId: TEST_SECRETS_STORE_ID,
      accountId: TEST_ACCOUNT_ID,
      readSecret: (name) => readSecretFromEnv(env, name),
    });

    await expect(store.getActiveKey()).resolves.toMatchObject({
      kid: "session-1",
    });
    await expect(store.getKeyById("session-0")).resolves.toMatchObject({
      kid: "session-0",
    });
  });

  it("rotates by writing a new ACTIVE_KEY and extended ACCEPTED_KEYS", async () => {
    await seedSessionSecrets();

    const env = await authMf.getEnv();
    const store = new CloudflareSecretStore({
      ...purposeOptions("session"),
      storeId: TEST_SECRETS_STORE_ID,
      accountId: TEST_ACCOUNT_ID,
      readSecret: (name) => readSecretFromEnv(env, name),
      client: authMf.createSecretsApiClient(),
    });

    const before = Math.floor(Date.now() / 1000);
    const rotated = await store.rotateKeys();
    const after = Math.floor(Date.now() / 1000);

    expect(rotated.kid).not.toBe("session-1");
    await expect(store.getActiveKey()).resolves.toMatchObject({
      kid: rotated.kid,
    });
    await expect(store.getKeyById("session-1")).resolves.toMatchObject({
      kid: "session-1",
    });
    await expect(store.getKeyById(rotated.kid)).resolves.toMatchObject({
      kid: rotated.kid,
    });

    const activeRaw = await readSecretFromEnv(env, "SESSION_ACTIVE_KEY");
    const activeJwk = JSON.parse(activeRaw) as { kid: string; iat: number };
    expect(activeJwk.kid).toBe(rotated.kid);
    expect(activeJwk.iat).toBeGreaterThanOrEqual(before);
    expect(activeJwk.iat).toBeLessThanOrEqual(after);
  });

  it("drops accepted keys older than 30 days during rotation", async () => {
    const now = Math.floor(Date.now() / 1000);
    const recent = {
      ...SESSION_JWK,
      kid: "session-recent",
      iat: now - 7 * 24 * 60 * 60,
    };
    const stale = {
      ...SESSION_JWK,
      kid: "session-stale",
      iat: now - 31 * 24 * 60 * 60,
    };

    await authMf.seedSecret("SESSION_ACTIVE_KEY", JSON.stringify(recent));
    await authMf.seedSecret(
      "SESSION_ACCEPTED_KEYS",
      JSON.stringify({ keys: [recent, stale] }),
    );

    const env = await authMf.getEnv();
    const store = new CloudflareSecretStore({
      ...purposeOptions("session"),
      storeId: TEST_SECRETS_STORE_ID,
      accountId: TEST_ACCOUNT_ID,
      readSecret: (name) => readSecretFromEnv(env, name),
      client: authMf.createSecretsApiClient(),
    });

    const rotated = await store.rotateKeys();
    const acceptedRaw = await readSecretFromEnv(env, "SESSION_ACCEPTED_KEYS");
    const accepted = JSON.parse(acceptedRaw) as {
      keys: Array<{ kid: string }>;
    };

    expect(accepted.keys.map((key) => key.kid)).toEqual([
      rotated.kid,
      "session-recent",
    ]);
    await expect(store.getKeyById("session-stale")).rejects.toThrow(
      /unknown session token key id/,
    );
  });

  it("waits for ACCEPTED_KEYS to become active before replacing ACTIVE_KEY", async () => {
    await seedSessionSecrets();

    const env = await authMf.getEnv();
    const writeOrder: string[] = [];
    const statusById = new Map<string, "pending" | "active">();
    const baseClient = authMf.createSecretsApiClient();
    let acceptedPolls = 0;
    let acceptedSecretId: string | undefined;

    for await (const secret of baseClient.listSecrets()) {
      if (secret.name === "SESSION_ACCEPTED_KEYS") {
        acceptedSecretId = secret.id;
      }
    }

    const client = {
      listSecrets: baseClient.listSecrets.bind(baseClient),
      async getSecret(secretId: string) {
        const base = await baseClient.getSecret(secretId);
        if (secretId === acceptedSecretId) {
          acceptedPolls += 1;
          if (acceptedPolls < 3) {
            return { ...base, status: "pending" as const };
          }
          statusById.set(secretId, "active");
        }
        return {
          ...base,
          status: statusById.get(secretId) ?? base.status,
        };
      },
      async editSecret(
        secretId: string,
        params: { value: string },
      ) {
        const existing = await baseClient.getSecret(secretId);
        writeOrder.push(existing.name);
        if (existing.name === "SESSION_ACCEPTED_KEYS") {
          statusById.set(secretId, "pending");
          await baseClient.editSecret(secretId, params);
          return {
            id: secretId,
            name: existing.name,
            status: "pending" as const,
          };
        }

        expect(acceptedSecretId).toBeDefined();
        expect(statusById.get(acceptedSecretId!)).toBe("active");
        await baseClient.editSecret(secretId, params);
        statusById.set(secretId, "active");
        return { id: secretId, name: existing.name, status: "active" as const };
      },
    };

    const store = new CloudflareSecretStore({
      ...purposeOptions("session"),
      storeId: TEST_SECRETS_STORE_ID,
      accountId: TEST_ACCOUNT_ID,
      readSecret: (name) => readSecretFromEnv(env, name),
      client,
      sleep: async () => undefined,
      pollIntervalMs: 1,
      pollTimeoutMs: 1_000,
    });

    const rotated = await store.rotateKeys();

    expect(writeOrder).toEqual([
      "SESSION_ACCEPTED_KEYS",
      "SESSION_ACTIVE_KEY",
    ]);
    expect(acceptedPolls).toBeGreaterThanOrEqual(3);
    await expect(store.getActiveKey()).resolves.toMatchObject({
      kid: rotated.kid,
    });
  });

  it("times out when ACCEPTED_KEYS never becomes active", async () => {
    await seedSessionSecrets();

    const env = await authMf.getEnv();
    const baseClient = authMf.createSecretsApiClient();
    const client = {
      listSecrets: baseClient.listSecrets.bind(baseClient),
      async getSecret(secretId: string) {
        const base = await baseClient.getSecret(secretId);
        return { ...base, status: "pending" as const };
      },
      async editSecret(
        secretId: string,
        params: { value: string },
      ) {
        const existing = await baseClient.getSecret(secretId);
        await baseClient.editSecret(secretId, params);
        return { id: secretId, name: existing.name, status: "pending" as const };
      },
    };

    const store = new CloudflareSecretStore({
      ...purposeOptions("session"),
      storeId: TEST_SECRETS_STORE_ID,
      accountId: TEST_ACCOUNT_ID,
      readSecret: (name) => readSecretFromEnv(env, name),
      client,
      sleep: async () => undefined,
      pollIntervalMs: 1,
      pollTimeoutMs: 5,
    });

    await expect(store.rotateKeys()).rejects.toThrow(
      /Timed out waiting for Cloudflare secret SESSION_ACCEPTED_KEYS to become active/,
    );
  });

  it("rotateTokenSecrets rotates session, health, and drive keys", async () => {
    await authMf.seedSecret("SESSION_ACTIVE_KEY", JSON.stringify(SESSION_JWK));
    await authMf.seedSecret(
      "SESSION_ACCEPTED_KEYS",
      JSON.stringify({ keys: [SESSION_JWK] }),
    );
    await authMf.seedSecret("HEALTH_ACTIVE_KEY", JSON.stringify(HEALTH_JWK));
    await authMf.seedSecret(
      "HEALTH_ACCEPTED_KEYS",
      JSON.stringify({ keys: [HEALTH_JWK] }),
    );
    await authMf.seedSecret("DRIVE_ACTIVE_KEY", JSON.stringify(DRIVE_JWK));
    await authMf.seedSecret(
      "DRIVE_ACCEPTED_KEYS",
      JSON.stringify({ keys: [DRIVE_JWK] }),
    );

    const originalStore = process.env.TOKEN_SECRET_STORE;
    const originalAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
    const originalToken = process.env.CLOUDFLARE_API_TOKEN;

    process.env.TOKEN_SECRET_STORE = `cloudflare-secrets://${TEST_SECRETS_STORE_ID}`;
    process.env.CLOUDFLARE_ACCOUNT_ID = TEST_ACCOUNT_ID;
    process.env.CLOUDFLARE_API_TOKEN = "test-token";

    try {
      const env = await authMf.getEnv();
      const result = await rotateTokenSecrets(
        {
          ...env,
          TOKEN_SECRET_STORE: `cloudflare-secrets://${TEST_SECRETS_STORE_ID}`,
          CLOUDFLARE_ACCOUNT_ID: TEST_ACCOUNT_ID,
          CLOUDFLARE_API_TOKEN: "test-token",
        },
        { client: authMf.createSecretsApiClient() },
      );

      expect(result.session.kid).not.toBe("session-1");
      expect(result.health.kid).not.toBe("health-1");
      expect(result.drive.kid).not.toBe("drive-1");

      const sessionStore = new CloudflareSecretStore({
        ...purposeOptions("session"),
        storeId: TEST_SECRETS_STORE_ID,
        accountId: TEST_ACCOUNT_ID,
        readSecret: (name) => readSecretFromEnv(env, name),
      });
      const healthStore = new CloudflareSecretStore({
        ...purposeOptions("health"),
        storeId: TEST_SECRETS_STORE_ID,
        accountId: TEST_ACCOUNT_ID,
        readSecret: (name) => readSecretFromEnv(env, name),
      });
      const driveStore = new CloudflareSecretStore({
        ...purposeOptions("drive"),
        storeId: TEST_SECRETS_STORE_ID,
        accountId: TEST_ACCOUNT_ID,
        readSecret: (name) => readSecretFromEnv(env, name),
      });

      await expect(sessionStore.getActiveKey()).resolves.toMatchObject({
        kid: result.session.kid,
      });
      await expect(healthStore.getActiveKey()).resolves.toMatchObject({
        kid: result.health.kid,
      });
      await expect(driveStore.getActiveKey()).resolves.toMatchObject({
        kid: result.drive.kid,
      });
      await expect(sessionStore.getKeyById("session-1")).resolves.toMatchObject({
        kid: "session-1",
      });
      await expect(healthStore.getKeyById("health-1")).resolves.toMatchObject({
        kid: "health-1",
      });
      await expect(driveStore.getKeyById("drive-1")).resolves.toMatchObject({
        kid: "drive-1",
      });
    } finally {
      process.env.TOKEN_SECRET_STORE = originalStore;
      process.env.CLOUDFLARE_ACCOUNT_ID = originalAccount;
      process.env.CLOUDFLARE_API_TOKEN = originalToken;
    }
  });
});
