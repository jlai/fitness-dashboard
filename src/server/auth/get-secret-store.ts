import { CloudflareSecretStore } from "./cloudflare-secret-store";
import { EnvSecretStore } from "./env-secret-store";
import {
  getTokenSecretStoreConfig,
  purposeOptions,
  type SecretStore,
  type SecretStoreConfig,
  type SecretStorePurpose,
} from "./secret-store";

function createSecretStore(purpose: SecretStorePurpose): SecretStore {
  const config = getTokenSecretStoreConfig();
  const options = purposeOptions(purpose);

  if (config.backend === "cloudflare-secrets") {
    return new CloudflareSecretStore({
      ...options,
      storeId: config.storeId,
      accountId: config.accountId,
    });
  }

  return new EnvSecretStore(options);
}

let sessionStore: SecretStore | undefined;
let healthStore: SecretStore | undefined;
let driveStore: SecretStore | undefined;
let cachedConfigKey: string | undefined;

function secretStoreCacheKey(config: SecretStoreConfig) {
  return config.backend === "cloudflare-secrets"
    ? `cloudflare-secrets:${config.accountId}:${config.storeId}`
    : "env";
}

function ensureStoreCache() {
  const key = secretStoreCacheKey(getTokenSecretStoreConfig());

  if (cachedConfigKey !== key) {
    sessionStore = undefined;
    healthStore = undefined;
    driveStore = undefined;
    cachedConfigKey = key;
  }
}

export function getSessionSecretStore(): SecretStore {
  ensureStoreCache();
  return (sessionStore ??= createSecretStore("session"));
}

export function getHealthSecretStore(): SecretStore {
  ensureStoreCache();
  return (healthStore ??= createSecretStore("health"));
}

export function getDriveSecretStore(): SecretStore {
  ensureStoreCache();
  return (driveStore ??= createSecretStore("drive"));
}

export function resetSecretStores() {
  sessionStore = undefined;
  healthStore = undefined;
  driveStore = undefined;
  cachedConfigKey = undefined;
}
