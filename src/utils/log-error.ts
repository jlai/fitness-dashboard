import { DEV_MODE_ENABLED } from "@/config";
import { log } from "@/utils/client-logger";

/**
 * Log an error to the console. When DEV_MODE is disabled, only
 * `error.message` is logged (not the full error object) to avoid leaking
 * stack traces or other sensitive details.
 */
export function logError(message: string, error?: unknown): void {
  if (error === undefined) {
    log(message);
    return;
  }

  if (DEV_MODE_ENABLED) {
    log(message, error);
    return;
  }

  log(message, error instanceof Error ? error.message : error);
}
