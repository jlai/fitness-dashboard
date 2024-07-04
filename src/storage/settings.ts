import { atomWithStorage } from "jotai/utils";

/** setting whether we should enable polly at startup */
export const pollyEnabledAtom = atomWithStorage(
  "dev:enable-polly",
  false,
  undefined,
  {
    getOnInit: true,
  }
);
