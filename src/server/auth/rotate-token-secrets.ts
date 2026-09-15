import {
  CloudflareSecretStore,
  type CloudflareSecretsApiClient,
  type SecretsStoreSecretBinding,
} from "./cloudflare-secret-store";
import {
  getTokenSecretStoreConfig,
  purposeOptions,
  type SecretStorePurpose,
  type SymmetricTokenKey,
} from "./secret-store";

const PURPOSES: readonly SecretStorePurpose[] = ["session", "health"];

export interface RotateTokenSecretsOptions {
  /** Injected for tests (e.g. Miniflare Secrets Store admin API). */
  client?: CloudflareSecretsApiClient;
}

function syncEnvString(
  env: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = env[name];

  if (typeof value === "string" && value.trim() !== "") {
    process.env[name] = value;
    return value;
  }

  const existing = process.env[name];
  return existing === undefined || existing.trim() === ""
    ? undefined
    : existing;
}

function readBindingSecret(
  env: Record<string, unknown>,
  name: string,
): Promise<string> {
  const binding = env[name] as SecretsStoreSecretBinding | undefined;

  if (!binding || typeof binding.get !== "function") {
    throw new Error(`${name} is not configured`);
  }

  return binding.get();
}

/**
 * Rotate session and health token keys in Cloudflare Secrets Store.
 * Intended for the Worker `scheduled` cron handler.
 */
export async function rotateTokenSecrets(
  env: Record<string, unknown>,
  options: RotateTokenSecretsOptions = {},
): Promise<{ session: SymmetricTokenKey; health: SymmetricTokenKey }> {
  syncEnvString(env, "TOKEN_SECRET_STORE");
  syncEnvString(env, "CLOUDFLARE_ACCOUNT_ID");
  syncEnvString(env, "CLOUDFLARE_API_TOKEN");

  const config = getTokenSecretStoreConfig();

  if (config.backend !== "cloudflare-secrets") {
    throw new Error(
      "TOKEN_SECRET_STORE must be cloudflare-secrets://... for scheduled rotation",
    );
  }

  if (!options.client && !syncEnvString(env, "CLOUDFLARE_API_TOKEN")) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not configured for secret rotation",
    );
  }

  const readSecret = (name: string) => readBindingSecret(env, name);
  const rotated: Partial<Record<SecretStorePurpose, SymmetricTokenKey>> = {};

  for (const purpose of PURPOSES) {
    const store = new CloudflareSecretStore({
      ...purposeOptions(purpose),
      storeId: config.storeId,
      accountId: config.accountId,
      readSecret,
      client: options.client,
    });
    rotated[purpose] = await store.rotateKeys();
  }

  return {
    session: rotated.session!,
    health: rotated.health!,
  };
}
