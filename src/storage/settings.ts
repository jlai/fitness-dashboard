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

export const weightUnitAtom = atomWithStorage<
  "en_US" | "en_GB" | "METRIC" | undefined
>("unit:weight", undefined, undefined, {
  getOnInit: true,
});

export const waterUnitAtom = atomWithStorage<"en_US" | "METRIC" | undefined>(
  "unit:water",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const distanceUnitAtom = atomWithStorage<"en_US" | "METRIC" | undefined>(
  "unit:distance",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);
