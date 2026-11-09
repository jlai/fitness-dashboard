import { act, render } from "@testing-library/react";

import { GoogleOpenIdAutomaticSignIn } from "@/api/google-openid-automatic-sign-in";
import {
  getGoogleIdTokenCallback,
  resetGoogleIdentityState,
} from "@/api/google-identity";
import { createSession } from "@/api/auth";

jest.mock("@/api/auth", () => ({
  createSession: jest.fn().mockResolvedValue(undefined),
  getStayLoggedInMinutes: jest.fn(() => 1440),
  hasPersistedEncryptedHealthToken: () =>
    Boolean(localStorage.getItem("auth:encrypted-health-token")),
  useOpenIdSignedIn: () => false,
}));

jest.mock("@/components/login/google-identity", () => ({
  GoogleOneTap: () => null,
}));

describe("GoogleOpenIdAutomaticSignIn", () => {
  beforeEach(() => {
    localStorage.clear();
    resetGoogleIdentityState();
    jest.clearAllMocks();
  });

  it("starts a session-bound login without a saved health token", async () => {
    render(<GoogleOpenIdAutomaticSignIn />);

    await act(async () => {
      getGoogleIdTokenCallback()?.({
        credential: "id-token",
        select_by: "user",
      });
    });

    expect(createSession).toHaveBeenCalledWith("id-token", undefined);
  });

  it("uses the saved duration for a returning user", async () => {
    localStorage.setItem("auth:encrypted-health-token", "encrypted-token");
    render(<GoogleOpenIdAutomaticSignIn />);

    await act(async () => {
      getGoogleIdTokenCallback()?.({
        credential: "id-token",
        select_by: "user",
      });
    });

    expect(createSession).toHaveBeenCalledWith("id-token", 1440);
  });
});
