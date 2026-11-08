describe("DEV_MODE_ENABLED", () => {
  const original = process.env.NEXT_PUBLIC_DEV_MODE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_DEV_MODE;
    } else {
      process.env.NEXT_PUBLIC_DEV_MODE = original;
    }
    jest.resetModules();
  });

  it("is true only when NEXT_PUBLIC_DEV_MODE is the string true", async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = "true";
    jest.resetModules();
    expect((await import("@/config")).DEV_MODE_ENABLED).toBe(true);

    process.env.NEXT_PUBLIC_DEV_MODE = "false";
    jest.resetModules();
    expect((await import("@/config")).DEV_MODE_ENABLED).toBe(false);

    delete process.env.NEXT_PUBLIC_DEV_MODE;
    jest.resetModules();
    expect((await import("@/config")).DEV_MODE_ENABLED).toBe(false);
  });
});
