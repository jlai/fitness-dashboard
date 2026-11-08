/**
 * URL path prefix when the app is not served at the domain root, e.g. `/fitness`.
 * Empty string means the app is served at `/`.
 */
export function normalizeBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

/** Prefix a root-relative path so client fetch/navigation hits the mounted app. */
export function withBasePath(path: string, basePath = BASE_PATH): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
