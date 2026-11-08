import { DEV_MODE_ENABLED } from "@/config";

/**
 * Log an error to the console. When DEV_MODE is disabled, only
 * `error.message` is logged (not the full error object) to avoid leaking
 * stack traces or other sensitive details.
 */
export function logError(message: string, error?: unknown): void {
  if (error === undefined) {
    console.error(message);
    return;
  }

  if (DEV_MODE_ENABLED) {
    console.error(message, error);
    return;
  }

  console.error(message, error instanceof Error ? error.message : error);
}
