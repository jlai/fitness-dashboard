import { render, screen } from "@testing-library/react";

import SettingsLayout, { getSettingsNavItems } from "@/app/settings/layout";

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
}));

jest.mock("@/config", () => ({
  ...jest.requireActual("@/config"),
  DEV_MODE_ENABLED: true,
}));

describe("getSettingsNavItems", () => {
  it("includes Developer only when dev mode is enabled", () => {
    expect(
      getSettingsNavItems(false).some(
        (item) => item.href === "/settings/developer",
      ),
    ).toBe(false);
    expect(
      getSettingsNavItems(true).some(
        (item) => item.href === "/settings/developer",
      ),
    ).toBe(true);
  });
});

describe("SettingsLayout", () => {
  it("renders the Developer nav item when NEXT_PUBLIC_DEV_MODE is enabled", () => {
    render(
      <SettingsLayout>
        <div>settings content</div>
      </SettingsLayout>,
    );

    expect(
      screen.getByRole("link", { name: "Developer" }).getAttribute("href"),
    ).toBe("/settings/developer");
  });
});
