import { normalizeBasePath, withBasePath } from "@/config/base-path";

describe("normalizeBasePath", () => {
  it("treats missing, empty, and root values as no prefix", () => {
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
  });

  it("adds a leading slash and strips a trailing slash", () => {
    expect(normalizeBasePath("fitness")).toBe("/fitness");
    expect(normalizeBasePath("/fitness")).toBe("/fitness");
    expect(normalizeBasePath("/fitness/")).toBe("/fitness");
    expect(normalizeBasePath("/apps/fitness/")).toBe("/apps/fitness");
  });
});

describe("withBasePath", () => {
  it("returns a root-relative path when no prefix is configured", () => {
    expect(withBasePath("/auth/exchange", "")).toBe("/auth/exchange");
    expect(withBasePath("auth/exchange", "")).toBe("/auth/exchange");
  });

  it("prefixes paths with the configured base path", () => {
    expect(withBasePath("/auth/exchange", "/fitness")).toBe(
      "/fitness/auth/exchange",
    );
    expect(withBasePath("auth/exchange", "/fitness")).toBe(
      "/fitness/auth/exchange",
    );
  });
});
