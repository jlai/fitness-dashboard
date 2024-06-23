import { atom, WritableAtom } from "jotai";
import PQueue from "p-queue";

type Read<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>["read"];

type Write<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>["write"];

/**
 * Atom with a queue to avoid race conditions with concurrent read/write operations.
 * NOTE: If the atom has multiple write-only derived atoms, it may make sense to use a
 * reducer pattern.
 */
export function atomWithQueue<Value, Args extends unknown[], Result>(
  read: Read<Value, Args, Result> | null,
  write: Write<Value, Args, Promise<Result>>
) {
  let queue = new PQueue({ concurrency: 1 });

  type ReadParams = Parameters<Read<Value, Args, Result>>;
  type WriteParams = Parameters<Write<Value, Args, Result>>;

  const derivedRead = read
    ? (get: ReadParams[0], options: ReadParams[1]) => {
        return queue.add(() => read(get, options), {
          signal: options.signal,
        });
      }
    : null;

  const derivedWrite = (
    get: WriteParams[0],
    set: WriteParams[1],
    ...args: Args
  ) => {
    let resolver: (value: Result) => void;
    let rejecter: () => void;

    const promise = new Promise<Result>((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    queue.add(() => {
      const writePromise = write(get, set, ...args);
      writePromise.then(resolver, rejecter);
      return writePromise;
    });

    return promise;
  };

  return atom(derivedRead, derivedWrite);
}
