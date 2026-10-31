import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SettingsMigrationPage from "@/app/settings/migration/page";
import {
  FITBIT_AUTH_TOKEN_STORAGE_KEY,
  MIGRATION_BACKUP_STORAGE_KEY,
} from "@/storage/db/fitbitmigrationdb";

const importLegacySettings = jest.fn();

jest.mock("@/components/require-login", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/api/auth", () => ({
  useDriveAuthEnabled: () => true,
}));

jest.mock("@/storage/settings-storage", () => ({
  useEnableGoogleDriveSettings: () => ({
    enableGoogleDriveSettings: jest.fn(),
    ready: true,
  }),
}));

jest.mock("@/storage/settings-storage/migrate-from-legacy", () => ({
  importLegacySettings: () => importLegacySettings(),
}));

jest.mock("@/components/toast", () => ({
  showSuccessToast: jest.fn(),
  withErrorToaster: (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch {
      // The real helper toasts and rethrows; swallow here so the click
      // handler's discarded promise does not fail the test.
    }
  },
}));

describe("SettingsMigrationPage", () => {
  beforeEach(() => {
    localStorage.clear();
    importLegacySettings.mockReset().mockResolvedValue(undefined);
  });

  it("hides import when the Fitbit migration backup is missing", async () => {
    render(<SettingsMigrationPage />);

    expect(
      await screen.findByRole("button", { name: "Skip import" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Import old settings" }),
    ).toBeNull();
  });

  it("imports settings and clears the Fitbit backup and auth token", async () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");

    render(<SettingsMigrationPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Import old settings" }),
    );

    await waitFor(() => {
      expect(importLegacySettings).toHaveBeenCalled();
      expect(localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    });

    expect(
      screen.queryByRole("button", { name: "Import old settings" }),
    ).toBeNull();
  });

  it("leaves stored keys in place when import fails", async () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    importLegacySettings.mockRejectedValue(new Error("import failed"));

    render(<SettingsMigrationPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Import old settings" }),
    );

    await waitFor(() => {
      expect(importLegacySettings).toHaveBeenCalled();
    });

    expect(localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY)).toBe(
      '{"meals":[]}',
    );
    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBe(
      "legacy-token",
    );
    expect(
      screen.getByRole("button", { name: "Import old settings" }),
    ).toBeTruthy();
  });

  it("clears the Fitbit auth token when import is skipped", async () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");

    render(<SettingsMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Skip import" }));

    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY)).toBe(
      '{"meals":[]}',
    );
    expect(importLegacySettings).not.toHaveBeenCalled();
  });
});
