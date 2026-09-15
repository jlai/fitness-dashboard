import {
  parseAcceptedKeys,
  parseOctJwkValue,
  resolveKeyById,
  secretBindingName,
  type OctJwk,
  type SecretPurposeOptions,
  type SecretStore,
  type SymmetricTokenKey,
} from "./secret-store";

function requireEnv(name: string) {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export class EnvSecretStore implements SecretStore {
  private readonly activeName: string;
  private readonly acceptedName: string;

  constructor(private readonly options: SecretPurposeOptions) {
    this.activeName = secretBindingName(options.purpose, "ACTIVE_KEY");
    this.acceptedName = secretBindingName(options.purpose, "ACCEPTED_KEYS");
  }

  async getActiveKey(): Promise<SymmetricTokenKey> {
    return parseOctJwkValue(
      requireEnv(this.activeName),
      this.activeName,
      this.options,
    );
  }

  async getKeyById(kid: string | undefined): Promise<SymmetricTokenKey> {
    const accepted = await this.loadAcceptedKeys();
    return resolveKeyById(
      accepted.keys,
      kid,
      `${this.options.purpose} token`,
    );
  }

  async rotateKeys(): Promise<SymmetricTokenKey> {
    throw new Error(
      `EnvSecretStore.rotateKeys is not implemented; update ${this.activeName} and ${this.acceptedName} manually`,
    );
  }

  private async loadAcceptedKeys() {
    const acceptedRaw = process.env[this.acceptedName];

    if (acceptedRaw !== undefined && acceptedRaw.trim() !== "") {
      return parseAcceptedKeys(acceptedRaw, this.acceptedName, this.options);
    }

    const activeRaw = requireEnv(this.activeName);
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
}
