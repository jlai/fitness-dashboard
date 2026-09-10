import { render, screen } from "@testing-library/react";
import { ConfirmProvider } from "material-ui-confirm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AccountNotLinkedPage from "@/app/about/not-signed-up/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

describe("AccountNotLinkedPage", () => {
  it("explains the account is not linked and offers signing in with a different account", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <AccountNotLinkedPage />
        </ConfirmProvider>
      </QueryClientProvider>,
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
