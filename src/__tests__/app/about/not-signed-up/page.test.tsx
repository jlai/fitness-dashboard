import { render, screen } from "@testing-library/react";
import { ConfirmProvider } from "material-ui-confirm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";

import AccountNotLinkedPage from "@/app/about/not-signed-up/page";

describe("AccountNotLinkedPage", () => {
  it("explains the account is not linked and offers signing in with a different account", () => {
    const queryClient = new QueryClient();

    render(
      <GoogleOAuthProvider clientId="test-client-id">
        <QueryClientProvider client={queryClient}>
          <ConfirmProvider>
            <AccountNotLinkedPage />
          </ConfirmProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>,
    );

    expect(
      screen.getByText("Account has no Google Health data"),
    ).toBeTruthy();
    expect(
      screen.getByText(/Your Google Account is not linked to Google Health/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sign in with a different account" }),
    ).toBeTruthy();

    const learnMoreLink = screen.getByRole("link", {
      name: "learn more about Google Health",
    });
    expect(learnMoreLink.getAttribute("href")).toBe(
      "https://www.google.com/health",
    );
    expect(learnMoreLink.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
