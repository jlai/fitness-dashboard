import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
const mockStorageSet = jest.fn();

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

jest.mock("@/storage/settings-storage", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    SETTINGS_STORAGE_KEYS: {
      dashboards: "dashboards",
      clientOnlyGoals: "client-only-goals",
      meals: "meals",
      clientOnlyFoods: "client-only-foods",
      clientOnlyFavoriteFoods: "client-only-favorite-foods",
      settings: "settings",
    },
    settingsStorageAtom: atom({
      get: async (key: string) =>
        key === "settings"
          ? {
              data: { theme: "dark" },
              version: 1,
              updateTime: "2026-01-01T00:00:00.000Z",
            }
          : key === "client-only-foods"
            ? {
                data: { clientOnlyFoods: [] },
                version: 1,
                updateTime: "2026-01-01T00:00:00.000Z",
              }
            : null,
      set: (...args: Array<unknown>) => mockStorageSet(...args),
    }),
    settingsStorageEpochAtom: atom(0),
  };
});

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

async function renderPageAndLoadStorage() {
  await act(async () => {
    renderPage();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("DeveloperSettingsPage", () => {
  beforeEach(() => {
    resetGoogleIdentityState();
    createSession.mockReset().mockResolvedValue(undefined);
    saveEncryptedAuthTokens.mockReset();
    restoreAccessToken.mockReset().mockResolvedValue(undefined);
    restoreDriveAccessToken.mockReset().mockResolvedValue(undefined);
    forceTokenRefresh.mockReset().mockResolvedValue("token");
    mockStorageSet
      .mockReset()
      .mockImplementation(
        async (_key: string, data: unknown, version: number) => ({
          data,
          version,
          updateTime: "2026-01-02T00:00:00.000Z",
        }),
      );
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

  it("shows stored settings blobs in tabs for each settings key", async () => {
    await act(async () => {
      renderPage();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(await screen.findByRole("tab", { name: "dashboards" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "client-only-goals" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "meals" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "client-only-foods" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "client-only-favorite-foods" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "settings" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "settings" }));
    expect(await screen.findByText(/"theme": "dark"/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "meals" }));
    expect(
      await screen.findByText("No stored data for this key."),
    ).toBeTruthy();
  });

  it("validates and saves an edited stored settings blob", async () => {
    await renderPageAndLoadStorage();
    fireEvent.click(await screen.findByRole("tab", { name: "settings" }));

    const editor = await screen.findByRole("textbox", {
      name: "Stored settings settings",
    });
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({
          data: { settings: { theme: "light" } },
          version: 1,
          updateTime: "2026-01-01T00:00:00.000Z",
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mockStorageSet).toHaveBeenCalledWith(
        "settings",
        { settings: { theme: "light" } },
        1,
      );
    });
    expect((editor as HTMLTextAreaElement).value).toBe(
      JSON.stringify(
        {
          data: { settings: { theme: "light" } },
          version: 1,
          updateTime: "2026-01-02T00:00:00.000Z",
        },
        null,
        2,
      ),
    );
  });

  it("does not save a blob that fails schema validation", async () => {
    await renderPageAndLoadStorage();
    fireEvent.click(await screen.findByRole("tab", { name: "settings" }));

    fireEvent.change(
      await screen.findByRole("textbox", {
        name: "Stored settings settings",
      }),
      {
        target: {
          value: JSON.stringify({
            data: { settings: { foodLogTotalsPosition: "sideways" } },
            version: 1,
            updateTime: "2026-01-01T00:00:00.000Z",
          }),
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it("migrates an old blob before validating and saving it", async () => {
    await renderPageAndLoadStorage();
    fireEvent.click(
      await screen.findByRole("tab", { name: "client-only-foods" }),
    );

    fireEvent.change(
      await screen.findByRole("textbox", {
        name: "Stored settings client-only-foods",
      }),
      {
        target: {
          value: JSON.stringify({
            data: {
              clientOnlyFoods: [
                {
                  name: "users/me/dataTypes/food/dataPoints/sample-food",
                  food: { displayName: "Sample Food" },
                },
              ],
            },
            version: 1,
            updateTime: "2026-01-01T00:00:00.000Z",
          }),
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mockStorageSet).toHaveBeenCalledWith(
        "client-only-foods",
        {
          clientOnlyFoods: [
            expect.objectContaining({
              customFood: "users/me/dataTypes/food/dataPoints/sample-food",
              food: { displayName: "Sample Food" },
              id: expect.any(String),
            }),
          ],
        },
        3,
      );
    });
  });

  it("saves an old blob without migrating or validating it against the latest schema", async () => {
    await renderPageAndLoadStorage();
    fireEvent.click(
      await screen.findByRole("tab", { name: "client-only-foods" }),
    );

    fireEvent.change(
      await screen.findByRole("textbox", {
        name: "Stored settings client-only-foods",
      }),
      {
        target: {
          value: JSON.stringify({
            data: { clientOnlyFoods: [{ name: "Sample Food" }] },
            version: 1,
            updateTime: "2026-01-01T00:00:00.000Z",
          }),
        },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Update without migration" }),
    );

    await waitFor(() => {
      expect(mockStorageSet).toHaveBeenCalledWith(
        "client-only-foods",
        { clientOnlyFoods: [{ name: "Sample Food" }] },
        1,
      );
    });
  });

  it("replaces edits made while an update is in progress with the saved blob", async () => {
    let finishSave:
      | ((value: {
          data: { settings: { theme: string } };
          version: number;
          updateTime: string;
        }) => void)
      | undefined;
    mockStorageSet.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );

    await renderPageAndLoadStorage();
    fireEvent.click(await screen.findByRole("tab", { name: "settings" }));
    const editor = await screen.findByRole("textbox", {
      name: "Stored settings settings",
    });
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({
          data: { settings: { theme: "light" } },
          version: 1,
          updateTime: "2026-01-01T00:00:00.000Z",
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.change(editor, { target: { value: "user's later edit" } });

    await act(async () => {
      finishSave?.({
        data: { settings: { theme: "light" } },
        version: 1,
        updateTime: "2026-01-02T00:00:00.000Z",
      });
    });

    expect((editor as HTMLTextAreaElement).value).toBe(
      JSON.stringify(
        {
          data: { settings: { theme: "light" } },
          version: 1,
          updateTime: "2026-01-02T00:00:00.000Z",
        },
        null,
        2,
      ),
    );
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
