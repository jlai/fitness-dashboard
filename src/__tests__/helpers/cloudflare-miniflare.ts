import {
  convertV4MiniflareOptions,
  Miniflare,
  type SecretsStoreSecretAdmin,
} from "miniflare";

import type {
  CloudflareSecretsApiClient,
  SecretsStoreSecretBinding,
} from "@/server/auth/cloudflare-secret-store";
import type { RevocationKvNamespace } from "@/server/auth/revocation-database";

export const TEST_SECRETS_STORE_ID = "test-secrets-store";
export const TEST_ACCOUNT_ID = "test-account";
export const SESSION_REVOCATION_BINDING = "SESSION_REVOCATION";

export const SECRET_BINDING_NAMES = [
  "SESSION_ACTIVE_KEY",
  "SESSION_ACCEPTED_KEYS",
  "HEALTH_ACTIVE_KEY",
  "HEALTH_ACCEPTED_KEYS",
  "DRIVE_ACTIVE_KEY",
  "DRIVE_ACCEPTED_KEYS",
] as const;

export type SecretBindingName = (typeof SECRET_BINDING_NAMES)[number];

export type AuthMiniflareEnv = {
  SESSION_REVOCATION: RevocationKvNamespace;
} & Record<SecretBindingName, SecretsStoreSecretBinding>;

export interface AuthMiniflare {
  mf: Miniflare;
  getEnv(): Promise<AuthMiniflareEnv>;
  getKv(): Promise<RevocationKvNamespace>;
  seedSecret(name: SecretBindingName, value: string): Promise<string>;
  createSecretsApiClient(): CloudflareSecretsApiClient;
  dispose(): Promise<void>;
}

export async function createAuthMiniflare(): Promise<AuthMiniflare> {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: `export default { async fetch() { return new Response("ok"); } }`,
      kvNamespaces: [SESSION_REVOCATION_BINDING],
      secretsStoreSecrets: Object.fromEntries(
        SECRET_BINDING_NAMES.map((name) => [
          name,
          { store_id: TEST_SECRETS_STORE_ID, secret_name: name },
        ]),
      ),
    }),
  );

  async function getAdmin(name: SecretBindingName): Promise<SecretsStoreSecretAdmin> {
    return (await mf.getSecretsStoreSecretAPI(name))();
  }

  return {
    mf,
    async getEnv() {
      return (await mf.getBindings()) as AuthMiniflareEnv;
    },
    async getKv() {
      return (await mf.getKVNamespace(
        SESSION_REVOCATION_BINDING,
      )) as unknown as RevocationKvNamespace;
    },
    async seedSecret(name, value) {
      const admin = await getAdmin(name);
      return admin.create(value);
    },
    createSecretsApiClient() {
      return {
        async *listSecrets() {
          const admin = await getAdmin("SESSION_ACTIVE_KEY");
          for (const key of await admin.list()) {
            const id = key.metadata?.uuid;
            if (!id) {
              continue;
            }
            yield { id, name: key.name };
          }
        },
        async getSecret(secretId) {
          const admin = await getAdmin("SESSION_ACTIVE_KEY");
          const name = await admin.get(secretId);
          return { id: secretId, name, status: "active" as const };
        },
        async editSecret(secretId, { name, value }) {
          if (!isSecretBindingName(name)) {
            throw new Error(`Unknown secret binding ${name}`);
          }
          const admin = await getAdmin(name);
          await admin.update(value, secretId);
          return { id: secretId, name, status: "active" as const };
        },
      };
    },
    async dispose() {
      await mf.dispose();
    },
  };
}

function isSecretBindingName(name: string): name is SecretBindingName {
  return (SECRET_BINDING_NAMES as readonly string[]).includes(name);
}
