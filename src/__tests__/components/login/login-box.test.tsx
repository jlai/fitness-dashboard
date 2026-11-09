import { fireEvent, render, screen } from "@testing-library/react";

import { LoginStepper } from "@/components/login/login-box";

jest.mock("@/components/login/google-sign-in-button", () => ({
  GoogleSignInButton: () => <div>Google sign-in button</div>,
}));

const DRIVE_EXPLANATION =
  "Allow access to load and store settings (dashboard layouts, meals, etc.) in Google Drive. The site will not be able to access any files in your Google Drive account, but will take up a small amount of your storage space.";

function renderStepper(activeStep: number, onFinish = jest.fn()) {
  return render(
    <LoginStepper
      activeStep={activeStep}
      onGrantHealthAccess={() => {}}
      grantAccessReady
      onAuthorizeDrive={() => {}}
      driveAuthReady
      onFinish={onFinish}
    />,
  );
}

describe("LoginStepper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows all step titles and the first step content before sign-in", () => {
    renderStepper(0);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(screen.getByText("Sync settings with Google Drive")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Remember me duration" }),
    ).toBeNull();
    expect(
      screen.getByText("Ready to get started? Sign in with Google below."),
    ).toBeTruthy();
    expect(screen.queryByText("Grant access to Google Health")).toBeNull();
    expect(screen.queryByText(DRIVE_EXPLANATION)).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Remember me duration" }),
    ).toBeNull();
  });

  it("keeps completed step titles and hides their content after sign-in", () => {
    renderStepper(1);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(screen.getByText("Sync settings with Google Drive")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.queryByText("Ready to get started? Sign in with Google below."),
    ).toBeNull();
    expect(screen.getByText("Grant access to Google Health")).toBeTruthy();
    expect(screen.queryByText(DRIVE_EXPLANATION)).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Remember me duration" }),
    ).toBeNull();
  });

  it("shows the Google Drive explanation after Google Health access is granted", () => {
    renderStepper(2);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sync settings with Google Drive" }),
    ).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.queryByText("Ready to get started? Sign in with Google below."),
    ).toBeNull();
    expect(screen.queryByText("Grant access to Google Health")).toBeNull();
    expect(screen.getByText(DRIVE_EXPLANATION)).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Remember me duration" }),
    ).toBeNull();
  });

  it("keeps completed step titles and hides their content after Google Drive access is granted", () => {
    renderStepper(3);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(screen.getByText("Sync settings with Google Drive")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.queryByText("Ready to get started? Sign in with Google below."),
    ).toBeNull();
    expect(screen.queryByText("Grant access to Google Health")).toBeNull();
    expect(screen.queryByText(DRIVE_EXPLANATION)).toBeNull();
    expect(screen.getByText("Don't stay signed in")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer")).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Remember me duration" }),
    ).toBeNull();
  });

  it("defaults to not remembering the user", () => {
    const onFinish = jest.fn();
    renderStepper(3, onFinish);

    expect(
      (
        screen.getByRole("radio", {
          name: /Don't stay signed in/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledWith(null);
  });

  it("shows the duration when remembering and submits the selected value", () => {
    const onFinish = jest.fn();
    renderStepper(3, onFinish);

    fireEvent.click(
      screen.getByRole("radio", { name: /Remember me on this computer/ }),
    );
    expect(
      screen.getByRole("combobox", { name: "Remember me duration" })
        .textContent,
    ).toBe("3 days");
    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Remember me duration" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "1 day" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledWith(1440);
  });

  it("discards the remember choice if the user switches back", () => {
    const onFinish = jest.fn();
    renderStepper(3, onFinish);
    fireEvent.click(
      screen.getByRole("radio", { name: /Remember me on this computer/ }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: /Don't stay signed in/ }),
    );

    expect(
      screen.queryByRole("combobox", { name: "Remember me duration" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledWith(null);
  });

  it("hides previous step content when advancing from sign-in to authorization", () => {
    const { rerender } = renderStepper(0);

    expect(
      screen.getByText("Ready to get started? Sign in with Google below."),
    ).toBeTruthy();

    rerender(
      <LoginStepper
        activeStep={1}
        onGrantHealthAccess={() => {}}
        grantAccessReady
        onAuthorizeDrive={() => {}}
        driveAuthReady
        onFinish={() => {}}
      />,
    );

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(
      screen.queryByText("Ready to get started? Sign in with Google below."),
    ).toBeNull();
    expect(screen.getByText("Grant access to Google Health")).toBeTruthy();
  });
});
