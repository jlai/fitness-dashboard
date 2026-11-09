import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SettingsMigrationPage from "@/app/settings/migration/page";
import { showSuccessToast } from "@/components/toast";
import {
  FITBIT_AUTH_TOKEN_STORAGE_KEY,
  MIGRATION_BACKUP_STORAGE_KEY,
} from "@/storage/db/fitbitmigrationdb";

const importLegacySettings = jest.fn();
const importFitbitMigrationFile = jest.fn();
const replace = jest.fn();
const confirm = jest.fn();
const reportError = jest.fn();
let driveEnabled = true;

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
  useDriveAuthEnabled: () => driveEnabled,
}));

jest.mock("@/storage/settings-storage", () => ({
  useEnableGoogleDriveSettings: () => ({
    enableGoogleDriveSettings: jest.fn(),
    ready: true,
  }),
}));

jest.mock("@/storage/settings-storage/migrate-from-legacy", () => ({
  importLegacySettings: () => importLegacySettings(),
  importFitbitMigrationFile: (backup: unknown) =>
    importFitbitMigrationFile(backup),
}));

jest.mock("@/components/toast", () => ({
  showSuccessToast: jest.fn(),
  withErrorToaster:
    (fn: (...args: never[]) => Promise<void>, message: string) =>
    async (...args: never[]) => {
      try {
        await fn(...args);
      } catch (error) {
        reportError(message, error);
      }
    },
}));

describe("SettingsMigrationPage", () => {
  beforeEach(() => {
    localStorage.clear();
    importLegacySettings.mockReset().mockResolvedValue(undefined);
    importFitbitMigrationFile.mockReset().mockResolvedValue(undefined);
    driveEnabled = true;
    replace.mockReset();
    reportError.mockReset();
    confirm.mockReset().mockResolvedValue({ confirmed: true });
  });

  it("offers a file import when the Fitbit migration backup is missing", async () => {
    render(<SettingsMigrationPage />);

    expect(
      await screen.findByRole("button", { name: "Skip import" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Import old settings" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Don't import" })).toBeNull();
    expect(screen.getByLabelText("Import from JSON file")).toBeTruthy();
  });

  it("imports a selected JSON backup and clears the Fitbit auth token", async () => {
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    const backup = {
      customFoods: [],
      meals: [],
      goals: [{ metric: "steps", period: "daily", value: 5000 }],
    };
    const file = new File([""], "backup.json", { type: "application/json" });
    file.text = jest.fn().mockResolvedValue(JSON.stringify(backup));

    render(<SettingsMigrationPage />);
    fireEvent.change(screen.getByLabelText("Import from JSON file"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(importFitbitMigrationFile).toHaveBeenCalledWith(backup);
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(showSuccessToast).toHaveBeenCalledWith(
      "Imported Fitbit backup from file",
    );
  });

  it.each([
    "not-json",
    '{"customFoods":[]}',
    '{"customFoods":[],"meals":[],"goals":[{}]}',
  ])("does not import an invalid file", async (contents) => {
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    const file = new File([""], "backup.json");
    file.text = jest.fn().mockResolvedValue(contents);
    render(<SettingsMigrationPage />);
    fireEvent.change(screen.getByLabelText("Import from JSON file"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(reportError).toHaveBeenCalledWith(
        "Failed to import Fitbit backup",
        expect.any(Error),
      ),
    );
    expect(importFitbitMigrationFile).not.toHaveBeenCalled();
    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBe(
      "legacy-token",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not clear the token or redirect if file import fails", async () => {
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    importFitbitMigrationFile.mockRejectedValue(new Error("import failed"));
    const file = new File([""], "backup.json");
    file.text = jest
      .fn()
      .mockResolvedValue(
        JSON.stringify({ customFoods: [], meals: [], goals: [] }),
      );
    render(<SettingsMigrationPage />);
    fireEvent.change(screen.getByLabelText("Import from JSON file"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(importFitbitMigrationFile).toHaveBeenCalled());
    await waitFor(() =>
      expect(reportError).toHaveBeenCalledWith(
        "Failed to import Fitbit backup",
        expect.any(Error),
      ),
    );
    expect(localStorage.getItem(FITBIT_AUTH_TOKEN_STORAGE_KEY)).toBe(
      "legacy-token",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("disables file import without Google Drive access", () => {
    driveEnabled = false;
    render(<SettingsMigrationPage />);
    expect(
      (screen.getByLabelText("Import from JSON file") as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("imports settings and clears the Fitbit backup and auth token", async () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, '{"meals":[]}');
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");

    render(<SettingsMigrationPage />);

    expect(screen.queryByLabelText("Import from JSON file")).toBeNull();
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
