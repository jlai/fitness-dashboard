const DEFAULT_GOOGLE_HEALTH_API_URL = "https://health.googleapis.com";

function extraScriptSrc() {
  return (process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC ?? "")
    .split(/\s+/)
    .filter(isAllowedScriptSrcUrl)
    .join(" ");
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

/** Build a Content-Security-Policy header value for a per-request nonce. */
export function buildContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    } ${extraScriptSrc()} blob: https://accounts.google.com/gsi/client;
    style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style;
    img-src 'self' data: https://tile.openstreetmap.org https://*.tile.opentopomap.org;
    frame-src 'self' https://accounts.google.com/gsi/;
    connect-src 'self' ${googleHealthApiUrl()} https://accounts.google.com/gsi/ https://oauth2.googleapis.com https://api.protomaps.com https://protomaps.github.io;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}
