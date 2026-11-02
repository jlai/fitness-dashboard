import { render } from "@testing-library/react";

import { FitbitMigrationLoginRedirect } from "@/components/login/fitbit-migration-login-redirect";
import {
  FITBIT_AUTH_TOKEN_STORAGE_KEY,
  MIGRATION_BACKUP_STORAGE_KEY,
} from "@/storage/db/fitbitmigrationdb";

const replace = jest.fn();
let loggedIn = false;
let pendingRememberMeChoice = false;
let pathname = "/";

jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

jest.mock("@/api/auth", () => ({
  useLoggedIn: () => loggedIn,
  pendingRememberMeChoiceAtom: Symbol("pendingRememberMeChoice"),
}));

jest.mock("jotai", () => ({
  useAtomValue: () => pendingRememberMeChoice,
}));

describe("FitbitMigrationLoginRedirect", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockReset();
    loggedIn = false;
    pendingRememberMeChoice = false;
    pathname = "/";
  });

  it("redirects to migration after login when a Fitbit token is stored", () => {
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    const view = render(<FitbitMigrationLoginRedirect />);

    expect(replace).not.toHaveBeenCalled();

    loggedIn = true;
    view.rerender(<FitbitMigrationLoginRedirect />);

    expect(replace).toHaveBeenCalledWith("/settings/migration");
  });

  it("redirects to migration after login when a migration backup is stored", () => {
    localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, "{}");
    const view = render(<FitbitMigrationLoginRedirect />);

    expect(replace).not.toHaveBeenCalled();

    loggedIn = true;
    view.rerender(<FitbitMigrationLoginRedirect />);

    expect(replace).toHaveBeenCalledWith("/settings/migration");
  });

  it("waits until the remember-me step is finished", () => {
    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    loggedIn = true;
    pendingRememberMeChoice = true;

    const view = render(<FitbitMigrationLoginRedirect />);

    expect(replace).not.toHaveBeenCalled();

    pendingRememberMeChoice = false;
    view.rerender(<FitbitMigrationLoginRedirect />);

    expect(replace).toHaveBeenCalledWith("/settings/migration");
  });

  it("does not redirect without migration state or when already on the migration page", () => {
    loggedIn = true;
    render(<FitbitMigrationLoginRedirect />);
    expect(replace).not.toHaveBeenCalled();

    localStorage.setItem(FITBIT_AUTH_TOKEN_STORAGE_KEY, "legacy-token");
    pathname = "/settings/migration";
    render(<FitbitMigrationLoginRedirect />);

    expect(replace).not.toHaveBeenCalled();
  });
});
