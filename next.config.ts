import type { NextConfig } from "next";

import {
  CONTENT_SECURITY_POLICY_HEADER,
  buildContentSecurityPolicy,
} from "./src/config/content-security-policy";

function normalizeBasePath(value: string | undefined) {
  if (!value || value === "/") {
    return "";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

/** Compile `/settings/developer` (`page.dev.tsx`) only when debug mode is on. */
const pageExtensions = ["tsx", "ts", "jsx", "js"];
if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
  pageExtensions.push("dev.tsx");
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  pageExtensions,
  ...(basePath ? { basePath } : {}),
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: CONTENT_SECURITY_POLICY_HEADER,
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
