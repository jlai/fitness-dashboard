import { render, screen } from "@testing-library/react";

import { LoginStepper } from "@/components/login/login-box";

jest.mock("@/components/login/google-sign-in-button", () => ({
  GoogleSignInButton: () => <div>Google sign-in button</div>,
}));

function renderStepper(activeStep: number) {
  return render(
    <LoginStepper
      activeStep={activeStep}
      onGrantHealthAccess={() => {}}
      grantAccessReady
      onFinish={() => {}}
    />,
  );
}

describe("LoginStepper", () => {
  it("shows all step titles and the first step content before sign-in", () => {
    renderStepper(0);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.getByText("Ready to get started? Sign in with Google below."),
    ).toBeTruthy();
    expect(screen.queryByText("Grant access to Google Health")).toBeNull();
    expect(screen.queryByText("Don't stay signed in")).toBeNull();
  });

  it("keeps completed step titles and hides their content after sign-in", () => {
    renderStepper(1);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.queryByText("Ready to get started? Sign in with Google below."),
    ).toBeNull();
    expect(screen.getByText("Grant access to Google Health")).toBeTruthy();
    expect(screen.queryByText("Don't stay signed in")).toBeNull();
  });

  it("keeps completed step titles and hides their content after Google Health access is granted", () => {
    renderStepper(2);

    expect(screen.getByText("Sign into Google")).toBeTruthy();
    expect(screen.getByText("Authorize access to Google Health")).toBeTruthy();
    expect(screen.getByText("Remember me on this computer?")).toBeTruthy();
    expect(
      screen.queryByText("Ready to get started? Sign in with Google below."),
    ).toBeNull();
    expect(screen.queryByText("Grant access to Google Health")).toBeNull();
    expect(screen.getByText("Don't stay signed in")).toBeTruthy();
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
