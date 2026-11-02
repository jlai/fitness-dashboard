import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SettingsMigrationPage from "@/app/settings/migration/page";
import { showSuccessToast } from "@/components/toast";
import {
  FITBIT_AUTH_TOKEN_STORAGE_KEY,
  MIGRATION_BACKUP_STORAGE_KEY,
} from "@/storage/db/fitbitmigrationdb";

const importLegacySettings = jest.fn();
const replace = jest.fn();
const confirm = jest.fn();

jest.mock("@/components/require-login", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

jest.mock("material-ui-confirm", () => ({
  useConfirm: () => confirm,
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
    replace.mockReset();
    confirm.mockReset().mockResolvedValue({ confirmed: true });
  });

  it("hides import when the Fitbit migration backup is missing", async () => {
    render(<SettingsMigrationPage />);

    expect(
      await screen.findByRole("button", { name: "Skip import" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Import old settings" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Don't import" })).toBeNull();
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

    expect(showSuccessToast).toHaveBeenCalledWith(
      "Imported settings from this browser",
    );
    expect(replace).toHaveBeenCalledWith("/");
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

  it("toasts and redirects to the dashboard when import is skipped", async () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");

    render(<SettingsMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Skip import" }));

    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY)).toBe(
      '{"meals":[]}',
    );
    expect(importLegacySettings).not.toHaveBeenCalled();
    expect(showSuccessToast).toHaveBeenCalledWith("Skipping settings import");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("deletes old settings and redirects when Don't import is confirmed", async () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");

    render(<SettingsMigrationPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Don't import" }),
    );

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith({
        description: "This will delete your old settings. Are you sure?",
      });
      expect(localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    });

    expect(showSuccessToast).toHaveBeenCalledWith("Old settings deleted");
    expect(replace).toHaveBeenCalledWith("/");
    expect(importLegacySettings).not.toHaveBeenCalled();
  });

  it("keeps old settings when Don't import is cancelled", async () => {
    confirm.mockResolvedValue({ confirmed: false });
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");

    render(<SettingsMigrationPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Don't import" }),
    );

    await waitFor(() => {
      expect(confirm).toHaveBeenCalled();
    });

    expect(localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY)).toBe(
      '{"meals":[]}',
    );
    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBe(
      "legacy-token",
    );
    expect(replace).not.toHaveBeenCalled();
    expect(showSuccessToast).not.toHaveBeenCalled();
  });
});
