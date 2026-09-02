import { buildContentSecurityPolicy } from "@/config/content-security-policy";

function scriptSrcDirective(csp: string) {
  return csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("script-src "));
}

describe("buildContentSecurityPolicy", () => {
  const originalExtraScriptSrc = process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC;

  afterEach(() => {
    if (originalExtraScriptSrc === undefined) {
      delete process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC;
    } else {
      process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC = originalExtraScriptSrc;
    }
  });

  it("allows Next.js scripts via nonce instead of unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("test-nonce");
    const directives = csp.split(";").map((part) => part.trim());
    const scriptSrc = directives.find((part) => part.startsWith("script-src "));
    const styleSrc = directives.find((part) => part.startsWith("style-src "));

    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(styleSrc).toContain("'unsafe-inline'");
  });

  it("keeps Google Identity Services, MapLibre workers, and API connect-src", () => {
    const csp = buildContentSecurityPolicy("test-nonce");

    expect(csp).toContain("https://accounts.google.com/gsi/client");
    expect(csp).toContain("https://accounts.google.com/gsi/style");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("https://health.googleapis.com");
    expect(csp).toContain("https://oauth2.googleapis.com");
  });

  it("includes extra script-src URLs", () => {
    process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC =
      "https://cdn.example.com https://analytics.example.com/script.js";

    const scriptSrc = scriptSrcDirective(
      buildContentSecurityPolicy("test-nonce"),
    );

    expect(scriptSrc).toContain("https://cdn.example.com");
    expect(scriptSrc).toContain("https://analytics.example.com/script.js");
  });

  it("ignores extra script-src values that are not URLs", () => {
    process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC =
      "'unsafe-eval' https://cdn.example.com 'unsafe-inline' blob:";

    const scriptSrc = scriptSrcDirective(
      buildContentSecurityPolicy("test-nonce"),
    );

    expect(scriptSrc).toContain("https://cdn.example.com");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});
