/**
 * Wrap a no-args function so that if it's called multiple times, only one
 * concurrent execution will run and the other calls will share the promise
 * and the return value.
 *
 * A rejection clears the in-flight promise so a later call can try again.
 * Otherwise a failed token refresh would be reused forever.
 */
export function singleAsync<ReturnValue>(func: () => Promise<ReturnValue>) {
  let currentPromise: Promise<ReturnValue> | null = null;

  return async () => {
    if (currentPromise) {
      return currentPromise;
    }

    currentPromise = func();

    return currentPromise.then(
      (value) => {
        currentPromise = null;
        return value;
      },
      (error: unknown) => {
        currentPromise = null;
        throw error;
      },
    );
  };
}
