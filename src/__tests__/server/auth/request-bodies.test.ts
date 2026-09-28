import {
  authorizeBodySchema,
  createSessionBodySchema,
  driveAccessBodySchema,
  driveLogoutBodySchema,
  healthAccessBodySchema,
  sessionLogoutBodySchema,
} from "@/server/auth/request-bodies";

describe("auth request body schemas", () => {
  it("requires a non-empty idToken", () => {
    expect(createSessionBodySchema.safeParse({ idToken: "tok" }).success).toBe(
      true,
    );
    expect(createSessionBodySchema.safeParse({}).success).toBe(false);
    expect(createSessionBodySchema.safeParse({ idToken: "" }).success).toBe(
      false,
    );
    expect(
      createSessionBodySchema.safeParse({}).error?.issues[0]?.message,
    ).toBe("missing idToken");
  });

  it("requires a non-empty authorization code", () => {
    expect(authorizeBodySchema.safeParse({ code: "abc" }).success).toBe(true);
    expect(authorizeBodySchema.safeParse({}).error?.issues[0]?.message).toBe(
      "missing authorization code",
    );
  });

  it("requires a non-empty encrypted health token", () => {
    expect(
      healthAccessBodySchema.safeParse({ encryptedHealthToken: "tok" }).success,
    ).toBe(true);
    expect(healthAccessBodySchema.safeParse({}).error?.issues[0]?.message).toBe(
      "missing encrypted token",
    );
  });

  it("requires a non-empty encrypted drive token", () => {
    expect(
      driveAccessBodySchema.safeParse({ encryptedDriveToken: "tok" }).success,
    ).toBe(true);
    expect(driveLogoutBodySchema.safeParse({}).error?.issues[0]?.message).toBe(
      "missing encrypted token",
    );
  });

  it("accepts an empty logout body and optional tokens", () => {
    expect(sessionLogoutBodySchema.safeParse({}).success).toBe(true);
    expect(
      sessionLogoutBodySchema.safeParse({
        encryptedHealthToken: "health",
        encryptedDriveToken: "drive",
        unlink: true,
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid unlink flag or empty optional tokens", () => {
    expect(
      sessionLogoutBodySchema.safeParse({ unlink: "true" }).error?.issues[0]
        ?.message,
    ).toBe("invalid value for unlink");
    expect(
      sessionLogoutBodySchema.safeParse({ encryptedHealthToken: "" }).error
        ?.issues[0]?.message,
    ).toBe("missing encrypted token");
  });
});
