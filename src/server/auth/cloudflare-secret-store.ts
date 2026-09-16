import {
  generateOctJwk,
  octJwkToSymmetricKey,
  parseAcceptedKeys,
  parseOctJwkValue,
  resolveKeyById,
  retainAcceptedJwks,
  secretBindingName,
  type OctJwk,
  type SecretPurposeOptions,
  type SecretStore,
  type SymmetricTokenKey,
} from "./secret-store";

export interface SecretsStoreSecretBinding {
  get(): Promise<string>;
}

declare global {
  interface CloudflareEnv {
    SESSION_ACTIVE_KEY?: SecretsStoreSecretBinding;
    SESSION_ACCEPTED_KEYS?: SecretsStoreSecretBinding;
    HEALTH_ACTIVE_KEY?: SecretsStoreSecretBinding;
    HEALTH_ACCEPTED_KEYS?: SecretsStoreSecretBinding;
  }
}

export type CloudflareSecretStatus = "pending" | "active" | "deleted";

export interface CloudflareSecretInfo {
  id: string;
  name: string;
  status: CloudflareSecretStatus;
}

export interface CloudflareSecretsApiClient {
  listSecrets(): AsyncIterable<{ id: string; name: string }>;
  getSecret(secretId: string): Promise<CloudflareSecretInfo>;
  editSecret(
    secretId: string,
    params: { name: string; value: string },
  ): Promise<CloudflareSecretInfo>;
}

export interface CloudflareSecretStoreOptions extends SecretPurposeOptions {
  storeId: string;
  accountId: string;
  /** Injected for tests; defaults to the Cloudflare Secrets Store HTTP API. */
  client?: CloudflareSecretsApiClient;
  /** Injected for tests; defaults to reading Secrets Store bindings from the Worker env. */
  readSecret?: (name: string) => Promise<string>;
  /** Injected for tests; defaults to `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** How often to poll secret status after an edit. Defaults to 500ms. */
  pollIntervalMs?: number;
  /** Max time to wait for a secret to become active. Defaults to 10s. */
  pollTimeoutMs?: number;
}

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_POLL_TIMEOUT_MS = 10_000;

export class CloudflareSecretStore implements SecretStore {
  private readonly activeName: string;
  private readonly acceptedName: string;
  private readonly storeId: string;
  private readonly accountId: string;
  private readonly client: CloudflareSecretsApiClient | undefined;
  private readonly readSecretFn: ((name: string) => Promise<string>) | undefined;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;
  private readonly options: SecretPurposeOptions;

  constructor(options: CloudflareSecretStoreOptions) {
    this.activeName = secretBindingName(options.purpose, "ACTIVE_KEY");
    this.acceptedName = secretBindingName(options.purpose, "ACCEPTED_KEYS");
    this.storeId = options.storeId;
    this.accountId = options.accountId;
    this.client = options.client;
    this.readSecretFn = options.readSecret;
    this.sleepFn = options.sleep ?? defaultSleep;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.pollTimeoutMs = options.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
    this.options = options;
  }

  async getActiveKey(): Promise<SymmetricTokenKey> {
    const raw = await this.readSecret(this.activeName);
    return parseOctJwkValue(raw, this.activeName, this.options);
  }

  async getKeyById(kid: string | undefined): Promise<SymmetricTokenKey> {
    const accepted = await this.loadAcceptedKeys();
    return resolveKeyById(accepted.keys, kid, `${this.options.purpose} token`);
  }

  async rotateKeys(): Promise<SymmetricTokenKey> {
    const current = await this.loadAcceptedKeys();
    const next = await generateOctJwk(this.options);
    const accepted = {
      keys: [next, ...retainAcceptedJwks(current.jwks.keys as OctJwk[])],
    };

    const keyInfo = accepted.keys.map((key) => ({
      kid: key.kid,
      iat: key.iat,
    }));
    // Structured object so Workers Logs indexes fields for filtering.
    // https://developers.cloudflare.com/workers/observability/logs/workers-logs/#logging-structured-json-objects
    console.log({
      message: `Rotated ${this.options.purpose} token keys`,
      purpose: this.options.purpose,
      keyCount: keyInfo.length,
      keys: keyInfo,
    });

    const client = this.getClient();
    const secretsByName = await this.listSecretsByName(client);

    // Publish the new key in ACCEPTED_KEYS first and wait until Cloudflare
    // reports it active, so verifiers can still use the previous active key
    // while the JWKS update propagates.
    await this.writeSecretAndWaitUntilActive(
      client,
      secretsByName,
      this.acceptedName,
      JSON.stringify(accepted),
    );
    await this.writeSecretAndWaitUntilActive(
      client,
      secretsByName,
      this.activeName,
      JSON.stringify(next),
    );

    return await octJwkToSymmetricKey(next, this.options, this.activeName);
  }

  private async loadAcceptedKeys() {
    const acceptedRaw = await this.tryReadSecret(this.acceptedName);

    if (acceptedRaw !== undefined && acceptedRaw.trim() !== "") {
      return parseAcceptedKeys(acceptedRaw, this.acceptedName, this.options);
    }

    const activeRaw = await this.readSecret(this.activeName);
    const active = await parseOctJwkValue(
      activeRaw,
      this.activeName,
      this.options,
    );
    const jwk = JSON.parse(activeRaw) as OctJwk;

    return {
      keys: [active],
      jwks: { keys: [jwk] },
    };
  }

  private async readSecret(name: string) {
    const value = await this.tryReadSecret(name);

    if (value === undefined || value.trim() === "") {
      throw new Error(`${name} is not configured`);
    }

    return value;
  }

  private async tryReadSecret(name: string) {
    if (this.readSecretFn) {
      try {
        return await this.readSecretFn(name);
      } catch {
        return undefined;
      }
    }

    const binding = await this.getBinding(name);

    if (!binding) {
      return undefined;
    }

    return binding.get();
  }

  private async getBinding(name: string) {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return (env as Record<string, SecretsStoreSecretBinding | undefined>)[name];
  }

  private getClient(): CloudflareSecretsApiClient {
    if (this.client) {
      return this.client;
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (apiToken === undefined || apiToken.trim() === "") {
      throw new Error(
        "CLOUDFLARE_API_TOKEN is not configured for secret rotation",
      );
    }

    return createCloudflareSecretsApiClient({
      accountId: this.accountId,
      storeId: this.storeId,
      apiToken: apiToken.trim(),
    });
  }

  private async listSecretsByName(client: CloudflareSecretsApiClient) {
    const byName = new Map<string, string>();

    for await (const secret of client.listSecrets()) {
      byName.set(secret.name, secret.id);
    }

    return byName;
  }

  private async writeSecretAndWaitUntilActive(
    client: CloudflareSecretsApiClient,
    secretsByName: Map<string, string>,
    name: string,
    value: string,
  ) {
    const secretId = secretsByName.get(name);

    if (!secretId) {
      throw new Error(
        `Cloudflare secret ${name} was not found in store ${this.storeId}`,
      );
    }

    const edited = await client.editSecret(secretId, { name, value });
    await this.waitUntilSecretActive(client, secretId, name, edited.status);
  }

  private async waitUntilSecretActive(
    client: CloudflareSecretsApiClient,
    secretId: string,
    name: string,
    initialStatus: CloudflareSecretStatus,
  ) {
    if (initialStatus === "active") {
      return;
    }

    if (initialStatus === "deleted") {
      throw new Error(`Cloudflare secret ${name} was deleted during rotation`);
    }

    const deadline = Date.now() + this.pollTimeoutMs;
    let status: CloudflareSecretStatus = initialStatus;

    while (Date.now() < deadline) {
      await this.sleepFn(this.pollIntervalMs);
      const secret = await client.getSecret(secretId);
      status = secret.status;

      if (status === "active") {
        return;
      }

      if (status === "deleted") {
        throw new Error(`Cloudflare secret ${name} was deleted during rotation`);
      }
    }

    throw new Error(
      `Timed out waiting for Cloudflare secret ${name} to become active (last status: ${status})`,
    );
  }
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseSecretInfo(
  body: {
    success: boolean;
    errors?: Array<{ message: string }>;
    result?: { id?: string; name?: string; status?: string };
  },
  fallbackMessage: string,
): CloudflareSecretInfo {
  if (!body.success || !body.result?.id || !body.result.name) {
    throw new Error(body.errors?.[0]?.message ?? fallbackMessage);
  }

  const status = body.result.status;
  if (status !== "pending" && status !== "active" && status !== "deleted") {
    throw new Error(
      `Unexpected Cloudflare secret status ${String(status)} for ${body.result.name}`,
    );
  }

  return {
    id: body.result.id,
    name: body.result.name,
    status,
  };
}

export function createCloudflareSecretsApiClient(params: {
  accountId: string;
  storeId: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
}): CloudflareSecretsApiClient {
  const fetchImpl = params.fetchImpl ?? fetch;
  const basePath = `${CLOUDFLARE_API_BASE}/accounts/${params.accountId}/secrets_store/stores/${params.storeId}/secrets`;
  const authHeaders = {
    Authorization: `Bearer ${params.apiToken}`,
  };

  return {
    async *listSecrets() {
      let page = 1;

      for (;;) {
        const response = await fetchImpl(`${basePath}?page=${page}&per_page=100`, {
          headers: authHeaders,
        });
        const body = (await response.json()) as {
          success: boolean;
          errors?: Array<{ message: string }>;
          result?: Array<{ id: string; name: string }>;
          result_info?: { total_pages?: number };
        };

        if (!response.ok || !body.success) {
          throw new Error(
            body.errors?.[0]?.message ??
              `Failed to list Cloudflare secrets (${response.status})`,
          );
        }

        for (const secret of body.result ?? []) {
          yield secret;
        }

        const totalPages = body.result_info?.total_pages ?? page;
        if (page >= totalPages) {
          return;
        }

        page += 1;
      }
    },

    async getSecret(secretId) {
      const response = await fetchImpl(`${basePath}/${secretId}`, {
        headers: authHeaders,
      });
      const body = (await response.json()) as {
        success: boolean;
        errors?: Array<{ message: string }>;
        result?: { id?: string; name?: string; status?: string };
      };

      if (!response.ok) {
        throw new Error(
          body.errors?.[0]?.message ??
            `Failed to get Cloudflare secret (${response.status})`,
        );
      }

      return parseSecretInfo(
        body,
        `Failed to get Cloudflare secret (${response.status})`,
      );
    },

    async editSecret(secretId, { name, value }) {
      const response = await fetchImpl(`${basePath}/${secretId}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          value,
          scopes: ["workers"],
        }),
      });
      const body = (await response.json()) as {
        success: boolean;
        errors?: Array<{ message: string }>;
        result?: { id?: string; name?: string; status?: string };
      };

      if (!response.ok) {
        throw new Error(
          body.errors?.[0]?.message ??
            `Failed to update Cloudflare secret ${name} (${response.status})`,
        );
      }

      return parseSecretInfo(
        body,
        `Failed to update Cloudflare secret ${name} (${response.status})`,
      );
    },
  };
}
