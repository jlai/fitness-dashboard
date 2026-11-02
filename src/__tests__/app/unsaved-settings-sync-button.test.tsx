import { act, render, screen } from "@testing-library/react";
import { ConfirmProvider } from "material-ui-confirm";

import UnsavedSettingsSyncButton from "@/app/unsaved-settings-sync-button";
import {
  getMemorySettingsStorage,
  resetSettingsStorageSingletonsForTests,
} from "@/storage/settings-storage";

const useLoggedIn = jest.fn(() => true);
const useDriveAuthEnabled = jest.fn(() => false);
const enableGoogleDriveSettings = jest.fn(async () => undefined);

jest.mock("@/api/auth", () => ({
  useLoggedIn: () => useLoggedIn(),
  useDriveAuthEnabled: () => useDriveAuthEnabled(),
}));

jest.mock("@/storage/settings-storage", () => {
  const actual = jest.requireActual("@/storage/settings-storage");
  return {
    ...actual,
    useEnableGoogleDriveSettings: () => ({
      enableGoogleDriveSettings,
      ready: true,
    }),
  };
});

function renderButton() {
  return render(
    <ConfirmProvider>
      <UnsavedSettingsSyncButton />
    </ConfirmProvider>,
  );
}

describe("UnsavedSettingsSyncButton", () => {
  beforeEach(() => {
    resetSettingsStorageSingletonsForTests();
    useLoggedIn.mockReturnValue(true);
    useDriveAuthEnabled.mockReturnValue(false);
    enableGoogleDriveSettings.mockClear();
  });

  it("is hidden when the user is not signed in", () => {
    useLoggedIn.mockReturnValue(false);
    getMemorySettingsStorage().seedSync("meals", []);

    renderButton();

    expect(
      screen.queryByRole("button", { name: "Sync settings to Google Drive" }),
    ).toBeNull();
  });

  it("is hidden when Google Drive is already enabled", () => {
    useDriveAuthEnabled.mockReturnValue(true);
    getMemorySettingsStorage().seedSync("meals", []);

    renderButton();

    expect(
      screen.queryByRole("button", { name: "Sync settings to Google Drive" }),
    ).toBeNull();
  });

  it("is hidden when memory storage has no settings", () => {
    renderButton();

    expect(
      screen.queryByRole("button", { name: "Sync settings to Google Drive" }),
    ).toBeNull();
  });

  it("prompts and enables Drive when confirmed", async () => {
    getMemorySettingsStorage().seedSync("meals", []);

    renderButton();

    const button = screen.getByRole("button", {
      name: "Sync settings to Google Drive",
    });

    await act(async () => {
      button.click();
    });

    expect(
      await screen.findByText(
        /You have settings that are not saved to Google Drive/,
      ),
    ).toBeTruthy();

    const syncButton = await screen.findByRole("button", {
      name: "Sync to drive",
    });

    await act(async () => {
      syncButton.click();
    });

    expect(enableGoogleDriveSettings).toHaveBeenCalled();
  });
});
