import {
  authorizeBodySchema,
  createSessionBodySchema,
  driveAccessBodySchema,
  driveLogoutBodySchema,
  healthAccessBodySchema,
  patchSessionBodySchema,
  sessionLogoutBodySchema,
} from "@/server/auth/request-bodies";

describe("auth request body schemas", () => {
  it("requires a positive finite sessionLifetimeMinutes", () => {
    expect(
      patchSessionBodySchema.safeParse({ sessionLifetimeMinutes: 120 }).success,
    ).toBe(true);
    expect(
      patchSessionBodySchema.safeParse({ sessionLifetimeMinutes: 0.5 }).success,
    ).toBe(true);
    expect(patchSessionBodySchema.safeParse({}).success).toBe(false);
    expect(
      patchSessionBodySchema.safeParse({ sessionLifetimeMinutes: 0 }).success,
    ).toBe(false);
    expect(
      patchSessionBodySchema.safeParse({ sessionLifetimeMinutes: -1 }).success,
    ).toBe(false);
    expect(
      patchSessionBodySchema.safeParse({ sessionLifetimeMinutes: "120" })
        .success,
    ).toBe(false);
    expect(
      patchSessionBodySchema.safeParse({ sessionLifetimeMinutes: Number.NaN })
        .error?.issues[0]?.message,
    ).toBe("invalid sessionLifetimeMinutes");
  });

  it("requires a non-empty idToken", () => {
    expect(createSessionBodySchema.safeParse({ idToken: "tok" }).success).toBe(
      true,
    );
    expect(
      createSessionBodySchema.safeParse({
        idToken: "tok",
        sessionLifetimeMinutes: 4320,
      }).success,
    ).toBe(true);
    expect(
      createSessionBodySchema.safeParse({
        idToken: "tok",
        sessionLifetimeMinutes: "4320",
      }).success,
    ).toBe(false);
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
