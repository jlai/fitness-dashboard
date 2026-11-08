import { act, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmProvider } from "material-ui-confirm";

import DeveloperSettingsPage from "@/app/settings/developer/developer-page";
import {
  getGoogleIdTokenCallback,
  resetGoogleIdentityState,
  setGoogleIdTokenCallback,
} from "@/api/google-identity";

const createSession = jest.fn();
const saveEncryptedAuthTokens = jest.fn();
const restoreAccessToken = jest.fn();
const restoreDriveAccessToken = jest.fn();
const forceTokenRefresh = jest.fn();
const useLoggedIn = jest.fn(() => false);

jest.mock("@/api/auth", () => ({
  createSession: (...args: Array<unknown>) => createSession(...args),
  saveEncryptedAuthTokens: (...args: Array<unknown>) =>
    saveEncryptedAuthTokens(...args),
  restoreAccessToken: (...args: Array<unknown>) => restoreAccessToken(...args),
  restoreDriveAccessToken: (...args: Array<unknown>) =>
    restoreDriveAccessToken(...args),
  forceTokenRefresh: (...args: Array<unknown>) => forceTokenRefresh(...args),
  useLoggedIn: () => useLoggedIn(),
}));

jest.mock("@/components/login/use-switch-accounts", () => ({
  useSwitchAccounts: () => jest.fn(),
}));

jest.mock("@/components/login/google-sign-in-button", () => ({
  GoogleSignInButton: () => <div>Sign in with Google</div>,
}));

function renderPage() {
  return render(
    <ConfirmProvider>
      <DeveloperSettingsPage />
    </ConfirmProvider>,
  );
}

describe("DeveloperSettingsPage", () => {
  beforeEach(() => {
    resetGoogleIdentityState();
    createSession.mockReset().mockResolvedValue(undefined);
    saveEncryptedAuthTokens.mockReset();
    restoreAccessToken.mockReset().mockResolvedValue(undefined);
    restoreDriveAccessToken.mockReset().mockResolvedValue(undefined);
    forceTokenRefresh.mockReset().mockResolvedValue("token");
    useLoggedIn.mockReturnValue(false);
  });

  afterEach(() => {
    resetGoogleIdentityState();
  });

  it("shows existing developer settings and a debug login form", () => {
    renderPage();

    expect(screen.getByText("Developer settings")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh token" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Switch accounts" }),
    ).toBeTruthy();
    expect(screen.getByText("Sign in with Google")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "OpenID token" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Health token" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Drive token" })).toBeTruthy();
  });

  it("creates a session and saves health/drive tokens on submit", async () => {
    renderPage();

    fireEvent.change(screen.getByRole("textbox", { name: "OpenID token" }), {
      target: { value: " openid-jwt " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Health token" }), {
      target: { value: " encrypted-health " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Drive token" }), {
      target: { value: " encrypted-drive " },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    });

    expect(saveEncryptedAuthTokens).toHaveBeenCalledWith({
      encryptedHealthToken: "encrypted-health",
      encryptedDriveToken: "encrypted-drive",
    });
    expect(createSession).toHaveBeenCalledWith("openid-jwt");
    expect(restoreAccessToken).not.toHaveBeenCalled();
  });

  it("fills the OpenID field from Sign In With Google without creating a session", () => {
    const previousCallback = jest.fn();
    setGoogleIdTokenCallback(previousCallback);

    const { unmount } = renderPage();

    act(() => {
      getGoogleIdTokenCallback()?.({
        credential: "gsi-id-token",
        select_by: "user",
      });
    });

    expect(
      (
        screen.getByRole("textbox", {
          name: "OpenID token",
        }) as HTMLInputElement
      ).value,
    ).toBe("gsi-id-token");
    expect(createSession).not.toHaveBeenCalled();
    expect(previousCallback).not.toHaveBeenCalled();

    unmount();

    getGoogleIdTokenCallback()?.({
      credential: "after-unmount",
      select_by: "user",
    });
    expect(previousCallback).toHaveBeenCalledTimes(1);
  });
});
