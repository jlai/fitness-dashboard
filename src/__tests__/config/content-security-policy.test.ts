import {
  CONTENT_SECURITY_POLICY_HEADER,
  buildContentSecurityPolicy,
} from "@/config/content-security-policy";

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

  it("allows Next.js scripts and MUI Emotion styles via nonce instead of unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("test-nonce");
    const directives = csp.split(";").map((part) => part.trim());
    const scriptSrc = directives.find((part) => part.startsWith("script-src "));
    const styleSrcElem = directives.find((part) =>
      part.startsWith("style-src-elem "),
    );
    const styleSrcAttr = directives.find((part) =>
      part.startsWith("style-src-attr "),
    );

    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(styleSrcElem).toContain("'nonce-test-nonce'");
    expect(styleSrcElem).not.toContain("'unsafe-inline'");
    expect(styleSrcAttr).toBe("style-src-attr 'unsafe-inline'");
    expect(directives.find((part) => part.startsWith("style-src "))).toBe(
      undefined,
    );
  });

  it("keeps Google Identity Services, MapLibre workers, and API connect-src", () => {
    const csp = buildContentSecurityPolicy("test-nonce");

    expect(csp).toContain("https://accounts.google.com/gsi/client");
    expect(csp).toContain("https://accounts.google.com/gsi/style");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("https://health.googleapis.com");
    expect(csp).toContain("https://www.googleapis.com");
    expect(csp).toContain("https://oauth2.googleapis.com");
  });

  it("quotes non-URL sources and leaves URLs unquoted", () => {
    const csp = buildContentSecurityPolicy("test-nonce");

    expect(csp).toContain(
      "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.opentopomap.org",
    );
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("'nonce-test-nonce'");
    expect(csp).not.toContain("'data:'");
    expect(csp).not.toContain("'https://");
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

  it("falls back to unsafe-inline for scripts when no nonce is provided", () => {
    const csp = buildContentSecurityPolicy();
    const scriptSrc = scriptSrcDirective(csp);

    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'nonce-");
    expect(csp).toContain("style-src-elem 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("uses a lowercase header name so OpenNext does not join two CSP values", () => {
    expect(CONTENT_SECURITY_POLICY_HEADER).toBe("content-security-policy");

    const staticCsp = buildContentSecurityPolicy();
    const nonceCsp = buildContentSecurityPolicy("test-nonce");
    const mixedCase = new Request("https://example.com", {
      headers: {
        "Content-Security-Policy": staticCsp,
        "content-security-policy": nonceCsp,
      },
    });
    const matchingCase = new Request("https://example.com", {
      headers: {
        ...{ [CONTENT_SECURITY_POLICY_HEADER]: staticCsp },
        ...{ [CONTENT_SECURITY_POLICY_HEADER]: nonceCsp },
      },
    });

    expect(mixedCase.headers.get(CONTENT_SECURITY_POLICY_HEADER)).toBe(
      `${staticCsp}, ${nonceCsp}`,
    );
    expect(matchingCase.headers.get(CONTENT_SECURITY_POLICY_HEADER)).toBe(
      nonceCsp,
    );
  });
});
