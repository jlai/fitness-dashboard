/**
 * Wrap a no-args function so that if it's called multiple times, only one
 * concurrent execution will run and the other calls will share the promise
 * and the return value;
 */
export function singleAsync<ReturnValue>(func: () => Promise<ReturnValue>) {
  let currentPromise: Promise<ReturnValue> | null = null;

  return async () => {
    if (currentPromise) {
      return currentPromise;
    }

    currentPromise = func();

    return currentPromise.then((value) => {
      currentPromise = null;
      return value;
    });
  };
}
