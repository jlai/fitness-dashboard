// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const config = defineCloudflareConfig({
  // For best results consider enabling R2 caching
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache
});

// OpenNext copies next.config and proxy headers with case-sensitive keys, then
// Cloudflare joins same-name Fetch headers with commas. Keep CSP lowercase and
// let the nonce policy replace the static fallback.
config.dangerous = {
  ...config.dangerous,
  middlewareHeadersOverrideNextConfigHeaders: true,
};

export default config;
