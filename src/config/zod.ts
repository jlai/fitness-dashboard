import { z } from "zod";

/**
 * Disable Zod AOT compilation. Compilation uses `new Function`, which the
 * production Content-Security-Policy does not allow (`unsafe-eval` is only
 * enabled in development). See
 * https://zod.dev/compile#content-security-policy
 */
z.config({ jitless: true });
