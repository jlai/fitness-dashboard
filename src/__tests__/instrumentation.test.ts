import { register } from "../instrumentation";

describe("instrumentation register", () => {
  const originalSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const originalRuntime = process.env.NEXT_RUNTIME;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    } else {
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = originalSecret;
    }

    if (originalRuntime === undefined) {
      delete process.env.NEXT_RUNTIME;
    } else {
      process.env.NEXT_RUNTIME = originalRuntime;
    }
  });

  it("validates server env at startup", async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    await expect(register()).rejects.toThrow(
      "Missing required environment variables: GOOGLE_OAUTH_CLIENT_SECRET",
    );
  });

  it("skips validation on the edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    await expect(register()).resolves.toBeUndefined();
  });
});
