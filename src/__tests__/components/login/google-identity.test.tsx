import { render, waitFor } from "@testing-library/react";

import { resetGoogleIdentityState } from "@/api/google-identity";
import {
  GoogleIdentityProvider,
  GoogleLoginButton,
  GoogleOneTap,
} from "@/components/login/google-identity";
import { STAY_SIGNED_IN_STORAGE_KEY } from "@/storage/settings";

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

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function removeGsiScripts() {
  document
    .querySelectorAll(`script[src^="${GSI_SCRIPT_URL}"]`)
    .forEach((script) => script.remove());
}

describe("Google Identity components", () => {
  beforeEach(() => {
    resetGoogleIdentityState();
    removeGsiScripts();
    localStorage.clear();
    delete (globalThis as { google?: typeof google }).google;
  });

  afterEach(() => {
    resetGoogleIdentityState();
    removeGsiScripts();
    delete (globalThis as { google?: typeof google }).google;
  });

  it("initializes GIS once when One Tap and the sign-in button are both mounted", async () => {
    const { id } = stubGoogleApis();

    render(
      <GoogleIdentityProvider clientId="client-1">
        <GoogleOneTap />
        <GoogleLoginButton text="signin_with" />
      </GoogleIdentityProvider>,
    );

    await waitFor(() => {
      expect(id.initialize).toHaveBeenCalledTimes(1);
      expect(id.prompt).toHaveBeenCalledTimes(1);
      expect(id.renderButton).toHaveBeenCalledTimes(1);
    });

    expect(id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        auto_select: false,
        use_fedcm_for_prompt: true,
      }),
    );
  });

  it("cancels One Tap when disabled instead of prompting", async () => {
    const { id } = stubGoogleApis();

    render(
      <GoogleIdentityProvider clientId="client-1">
        <GoogleOneTap disabled />
      </GoogleIdentityProvider>,
    );

    await waitFor(() => {
      expect(id.initialize).toHaveBeenCalledTimes(1);
      expect(id.cancel).toHaveBeenCalled();
    });
    expect(id.prompt).not.toHaveBeenCalled();
  });

  it("enables auto_select when stay signed in is set", async () => {
    localStorage.setItem(STAY_SIGNED_IN_STORAGE_KEY, JSON.stringify(true));
    const { id } = stubGoogleApis();

    render(
      <GoogleIdentityProvider clientId="client-1">
        <GoogleOneTap />
      </GoogleIdentityProvider>,
    );

    await waitFor(() => {
      expect(id.initialize).toHaveBeenCalledTimes(1);
    });

    expect(id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        auto_select: true,
      }),
    );
  });
});
