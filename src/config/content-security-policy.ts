const DEFAULT_GOOGLE_HEALTH_API_URL = "https://health.googleapis.com";

const CSP_URL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

type CspSource = string | false | null | undefined;
type CspDirectives = Record<string, CspSource[]>;

function extraScriptSrc() {
  return (process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC ?? "")
    .split(/\s+/)
    .filter(isAllowedScriptSrcUrl);
}

function isAllowedScriptSrcUrl(value: string) {
  if (!value || /[;,'"\\]/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function googleHealthApiUrl() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_HEALTH_API_URL ??
    DEFAULT_GOOGLE_HEALTH_API_URL
  );
}

/**
 * Header name must be lowercase. OpenNext copies next.config and proxy headers
 * into a Request using case-sensitive object keys; Fetch then treats
 * `Content-Security-Policy` and `content-security-policy` as one header and
 * joins the values with a comma.
 */
export const CONTENT_SECURITY_POLICY_HEADER = "content-security-policy";

function quoteCspSource(source: string) {
  if (
    (source.startsWith("'") && source.endsWith("'")) ||
    CSP_URL_PATTERN.test(source)
  ) {
    return source;
  }

  return `'${source}'`;
}

function serializeContentSecurityPolicy(directives: CspDirectives) {
  return Object.entries(directives)
    .map(([directive, sources]) => {
      const values = sources
        .filter((source): source is string => Boolean(source))
        .map(quoteCspSource);

      return values.length > 0 ? `${directive} ${values.join(" ")}` : directive;
    })
    .join("; ");
}

/**
 * Build a Content-Security-Policy header value.
 * Pass a per-request nonce to enforce strict script-src and style-src-elem;
 * omit it for the static fallback used by next.config headers.
 *
 * Material UI needs style-src-elem (Emotion `<style>` tags) and
 * style-src-attr (inline style attributes). See
 * https://mui.com/material-ui/guides/content-security-policy/
 */
export function buildContentSecurityPolicy(nonce?: string) {
  const isDev = process.env.NODE_ENV === "development";

  const nonceOrUnsafeInline =
    nonce && !isDev ? `nonce-${nonce}` : "unsafe-inline";
  return serializeContentSecurityPolicy({
    "default-src": ["self"],
    "script-src": [
      "self",
      nonceOrUnsafeInline,
      isDev ? "unsafe-eval" : "",
      ...extraScriptSrc(),
      "https://accounts.google.com/gsi/client",
    ],
    "style-src-elem": [
      "self",
      nonceOrUnsafeInline,
      "https://accounts.google.com/gsi/style",
    ],
    "style-src-attr": ["unsafe-inline"],
    "img-src": [
      "self",
      "data:",
      "https://tile.openstreetmap.org",
      "https://*.tile.opentopomap.org",
    ],
    "frame-src": ["self", "https://accounts.google.com/gsi/"],
    "frame-ancestors": ["none"],
    "connect-src": [
      "self",
      googleHealthApiUrl(),
      "https://www.googleapis.com",
      "https://accounts.google.com/gsi/",
      "https://oauth2.googleapis.com",
      "https://api.protomaps.com",
      "https://protomaps.github.io",
    ],
    "worker-src": ["self"],
    "object-src": ["none"],
    "base-uri": ["self"],
    "form-action": ["self"],
  });
}
