import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "mui-sonner";

import { TroubleshootingSettings } from "@/app/settings/advanced/troubleshooting-settings";
import { SettingsTable } from "@/app/settings/common";

const mockGet = jest.fn();

const dataByKey: Record<string, unknown> = {
  dashboards: { dashboards: [{ tiles: [{}, {}] }, { tiles: [{}] }] },
  "client-only-goals": { clientOnlyGoals: [{}] },
  meals: { meals: [{}, {}] },
  "client-only-foods": { clientOnlyFoods: [{}] },
  "client-only-favorite-foods": { clientOnlyFavoriteFoods: [{}, {}, {}] },
  settings: { settings: { mapStyle: "white" } },
};

function stored(data: unknown) {
  return { data, version: 3, updateTime: "2026-01-01T00:00:00.000Z" };
}

jest.mock("@/storage/settings-storage", () => {
  const actual = jest.requireActual("@/storage/settings-storage");
  const { atom } = jest.requireActual("jotai");
  return {
    ...actual,
    settingsStorageAtom: atom(() => ({ get: mockGet })),
  };
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("Troubleshooting settings", () => {
  const createObjectURL = jest
    .fn<string, [Blob]>()
    .mockReturnValue("blob:debug-export");
  const revokeObjectURL = jest.fn();
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    "createObjectURL",
  );
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    "revokeObjectURL",
  );
  let click: jest.SpyInstance;

  beforeAll(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
  });

  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockImplementation(async (key: string) => stored(dataByKey[key]));
    click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation();
  });

  afterAll(() => {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(URL, "createObjectURL");
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
    } else {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  });

  afterEach(() => {
    click.mockRestore();
  });

  it("places the export controls below the description in the same cell", async () => {
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    const description = screen.getByText(/Download the selected stored data/);
    const dropdown = screen.getByRole("combobox", { name: "Debug export" });
    const button = screen.getByRole("button", { name: "Download" });
    const cell = description.closest("td");

    expect(cell).not.toBeNull();
    expect(dropdown.closest("td")).toBe(cell);
    expect(button.closest("td")).toBe(cell);
    expect(description.contains(dropdown)).toBe(true);
    expect(description.contains(button)).toBe(true);
    await act(async () => {});
  });

  it.each([
    ["Dashboard tiles", "dashboards"],
    ["Goals (dashboard only)", "client-only-goals"],
    ["Meals", "meals"],
    ["Food templates", "client-only-foods"],
    ["Favorite foods", "client-only-favorite-foods"],
    ["Settings", "settings"],
  ])("downloads %s as the raw %s settings blob", async (label, key) => {
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );

    expect(
      screen.getByText(/might contain sensitive information/),
    ).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Debug export" }));
    const option = within(screen.getByRole("listbox")).getByRole("option", {
      name: new RegExp(label.replace(/[()]/g, "\\$&")),
    });
    await waitFor(() =>
      expect(option.getAttribute("aria-disabled")).not.toBe("true"),
    );
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(mockGet).toHaveBeenCalledWith(key);
    expect(click.mock.instances[0].download).toBe(`${key}.json.txt`);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(await readBlob(blob)).toBe(
      JSON.stringify(stored(dataByKey[key]), null, 2),
    );
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:debug-export"),
    );
  });

  it("shows counts and disables empty and missing data", async () => {
    mockGet.mockImplementation(async (key: string) => {
      if (key === "meals") return stored({ meals: [] });
      if (key === "client-only-foods") return null;
      return stored(dataByKey[key]);
    });
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    const button = screen.getByRole("button", { name: "Download" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Debug export" }));
    const list = screen.getByRole("listbox");
    const option = (label: string) =>
      within(list).getByRole("option", { name: new RegExp(label) });
    await waitFor(() =>
      expect(option("Dashboard tiles").textContent).toContain("3 items"),
    );
    expect(option("Goals").textContent).toContain("1 item");
    expect(option("Favorite foods").textContent).toContain("3 items");
    expect(option("Settings").textContent).toContain("1 item");
    expect(option("Meals").textContent).toContain("No items");
    expect(option("Food templates").textContent).toContain("No items");
    expect(option("Meals").getAttribute("aria-disabled")).toBe("true");
    expect(option("Food templates").getAttribute("aria-disabled")).toBe("true");
    expect(click).not.toHaveBeenCalled();
  });

  it("allows exporting malformed data when its count cannot be determined", async () => {
    mockGet.mockImplementation(async (key: string) =>
      stored(key === "meals" ? { unexpected: "data" } : dataByKey[key]),
    );
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Debug export" }));
    const option = within(screen.getByRole("listbox")).getByRole("option", {
      name: /Meals/,
    });
    await waitFor(() =>
      expect(option.textContent).toContain("Item count unavailable"),
    );
    expect(option.getAttribute("aria-disabled")).not.toBe("true");
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(await readBlob(createObjectURL.mock.calls[0][0])).toBe(
      JSON.stringify(stored({ unexpected: "data" }), null, 2),
    );
  });

  it("refreshes counts when reopening the list and disables an emptied selection", async () => {
    let meals: unknown = { meals: [{}] };
    mockGet.mockImplementation(async (key: string) =>
      stored(key === "meals" ? meals : dataByKey[key]),
    );
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    const dropdown = screen.getByRole("combobox", { name: "Debug export" });
    const button = screen.getByRole("button", { name: "Download" });
    fireEvent.mouseDown(dropdown);
    let option = within(screen.getByRole("listbox")).getByRole("option", {
      name: /Meals/,
    });
    await waitFor(() => expect(option.textContent).toContain("1 item"));
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(button.hasAttribute("disabled")).toBe(false);
    meals = { meals: [] };
    fireEvent.mouseDown(dropdown);
    option = within(screen.getByRole("listbox")).getByRole("option", {
      name: /Meals/,
    });
    await waitFor(() => expect(option.textContent).toContain("No items"));
    expect(option.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("reports download errors without creating a file", async () => {
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Debug export" }));
    const option = within(screen.getByRole("listbox")).getByRole("option", {
      name: /Meals/,
    });
    await waitFor(() => expect(option.textContent).toContain("2 items"));
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    const log = jest.spyOn(console, "error").mockImplementation();
    mockGet.mockRejectedValue(new Error("storage failed"));
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to export troubleshooting data.",
      ),
    );
    expect(click).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("does not export data that became empty after selection", async () => {
    let meals: unknown = { meals: [{}] };
    mockGet.mockImplementation(async (key: string) =>
      stored(key === "meals" ? meals : dataByKey[key]),
    );
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Debug export" }));
    const option = within(screen.getByRole("listbox")).getByRole("option", {
      name: /Meals/,
    });
    await waitFor(() => expect(option.textContent).toContain("1 item"));
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    meals = { meals: [] };
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "There is no stored data to export for this selection.",
      ),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Download" })
          .hasAttribute("disabled"),
      ).toBe(true),
    );
    expect(click).not.toHaveBeenCalled();
  });

  it("reports failed count loads without treating them as empty", async () => {
    mockGet.mockImplementation(async (key: string) => {
      if (key === "meals") throw new Error("storage failed");
      return stored(dataByKey[key]);
    });
    const log = jest.spyOn(console, "error").mockImplementation();
    render(
      <SettingsTable>
        <TroubleshootingSettings />
      </SettingsTable>,
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Debug export" }));
    const option = within(screen.getByRole("listbox")).getByRole("option", {
      name: /Meals/,
    });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load some troubleshooting data. Open the list to retry.",
      ),
    );
    expect(option.textContent).toContain("Unable to load");
    expect(option.getAttribute("aria-disabled")).toBe("true");
    expect(click).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
