import {
  ensureGsiScript,
  initializeGoogleId,
  loadGoogleAccountsId,
  loadGoogleOAuth2,
  resetGoogleIdentityState,
  setGoogleIdTokenCallback,
} from "@/api/google-identity";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function stubGoogleApis() {
  const id = {
    initialize: jest.fn(),
    prompt: jest.fn(),
    cancel: jest.fn(),
    renderButton: jest.fn(),
    disableAutoSelect: jest.fn(),
    storeCredential: jest.fn(),
    revoke: jest.fn(),
  };
  const oauth2 = {
    initCodeClient: jest.fn(),
    initTokenClient: jest.fn(),
    hasGrantedAllScopes: jest.fn(),
    hasGrantedAnyScope: jest.fn(),
    revoke: jest.fn(),
  };

  Object.defineProperty(globalThis, "google", {
    configurable: true,
    writable: true,
    value: { accounts: { id, oauth2 } },
  });

  return { id, oauth2 };
}

function removeGsiScripts() {
  document
    .querySelectorAll(`script[src^="${GSI_SCRIPT_URL}"]`)
    .forEach((script) => script.remove());
}

describe("google identity API", () => {
  beforeEach(() => {
    resetGoogleIdentityState();
    removeGsiScripts();
    delete (globalThis as { google?: typeof google }).google;
  });

  afterEach(() => {
    resetGoogleIdentityState();
    removeGsiScripts();
    delete (globalThis as { google?: typeof google }).google;
  });

  it("injects the GSI script once with a nonce", () => {
    const first = ensureGsiScript("nonce-1");
    const second = ensureGsiScript("nonce-2");

    expect(first).toBe(second);
    expect(
      document.querySelectorAll(`script[src^="${GSI_SCRIPT_URL}"]`),
    ).toHaveLength(1);
    expect(first?.nonce).toBe("nonce-1");
    expect(first?.src).toBe(GSI_SCRIPT_URL);
  });

  it("resolves oauth2 and id APIs from the loaded script", async () => {
    const { id, oauth2 } = stubGoogleApis();

    await expect(loadGoogleOAuth2()).resolves.toBe(oauth2);
    await expect(loadGoogleAccountsId()).resolves.toBe(id);
  });

  it("initializes google.accounts.id only once", async () => {
    const { id } = stubGoogleApis();

    await initializeGoogleId({
      client_id: "client-1",
      auto_select: true,
      use_fedcm_for_prompt: true,
    });
    await initializeGoogleId({
      client_id: "client-1",
      auto_select: true,
      use_fedcm_for_prompt: true,
    });

    expect(id.initialize).toHaveBeenCalledTimes(1);
    expect(id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        auto_select: true,
        use_fedcm_for_prompt: true,
      }),
    );
  });

  it("routes credentials through the latest callback without re-initializing", async () => {
    const { id } = stubGoogleApis();
    const first = jest.fn();
    const second = jest.fn();
    const credential = {
      credential: "id-token",
      select_by: "user",
    };

    setGoogleIdTokenCallback(first);
    await initializeGoogleId({ client_id: "client-1" });
    setGoogleIdTokenCallback(second);

    const config = id.initialize.mock
      .calls[0][0] as google.accounts.id.IdConfiguration;
    config.callback?.(credential);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(credential);
    expect(id.initialize).toHaveBeenCalledTimes(1);
  });
});
