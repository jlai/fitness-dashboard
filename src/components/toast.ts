import { toast } from "mui-sonner";

// Wrapper for toast.success
export function showSuccessToast(...args: Parameters<typeof toast.success>) {
  toast.success(...args);
}

/** Run a provided function and show an error toast if the function throws an error. */
export async function runWithErrorToaster(
  func: () => Promise<void>,
  errorText: string
) {
  try {
    return await func();
  } catch (e: any) {
    const errorMessage = e.errorMessage ?? e.message ?? "";
    toast.error(`${errorText}: ${errorMessage}`);
    throw e;
  }
}

/**
 * Create a handler function that shows an error toast if the function throws an error.
 */
export function withErrorToaster<TArgs extends Array<any> = any[]>(
  func: (...args: TArgs) => Promise<void> | void,
  errorText: string
) {
  return (...args: TArgs) => {
    return runWithErrorToaster(async () => {
      await func(...args);
    }, errorText);
  };
}
