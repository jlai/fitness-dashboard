import { act, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";

import RequireLogin from "@/components/require-login";
import { authTokenRestorationPendingAtom } from "@/api/auth";

const mockUseLoggedIn = jest.fn(() => true);

jest.mock("@/api/auth", () => {
  const { atom } = jest.requireActual("jotai");

  return {
    authTokenRestorationPendingAtom: atom(true),
    pendingRememberMeChoiceAtom: atom(false),
    useLoggedIn: () => mockUseLoggedIn(),
  };
});

describe("RequireLogin", () => {
  it("does not render the login screen while restoring an access token", () => {
    const store = createStore();

    render(
      <Provider store={store}>
        <RequireLogin>
          <div>Protected content</div>
        </RequireLogin>
      </Provider>,
    );

    expect(screen.queryByText("Protected content")).toBeNull();

    act(() => {
      store.set(authTokenRestorationPendingAtom, false);
    });

    expect(screen.getByText("Protected content")).toBeTruthy();
  });
});
