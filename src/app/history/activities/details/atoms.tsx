import { atom } from "jotai";
import { atomWithHash } from "jotai-location";

import { isValidDataPointId } from "@/api/datapoints";
import { cleanHashReplaceState } from "@/utils/hash";

export const exerciseIdHashAtom = atomWithHash<string | null>(
  "exerciseId",
  null,
  {
    serialize: (value: string | null) =>
      value && isValidDataPointId(value) ? value : "",
    deserialize: (value: string) =>
      value && isValidDataPointId(value) ? value : null,
    setHash: cleanHashReplaceState,
  }
);

export type XScaleMeasureType = "time" | "distance";

/** Scale to use for charts; note that distance is not always supported */
export const xScaleMeasureAtom = atom<XScaleMeasureType>("time");

export const highlightedXAtom = atom<
  null | { type: "time"; value: Date } | { type: "distance"; value: number }
>(null);
